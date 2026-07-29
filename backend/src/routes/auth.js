// src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const store = require('../data/store');
const { auth, JWT_SECRET } = require('../middleware/auth');
const { EmailDeliveryError, emailConfigured, sendOtpEmail } = require('../utils/mailer');
const { verifyFirebaseIdToken } = require('../utils/firebaseAdmin');
const { connectMongo } = require('../utils/mongo');
const FirebaseUser = require('../models/FirebaseUser');

const router = express.Router();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Firebase exposes the provider ID as e.g. `google.com`; the application
// stores the stable, UI-friendly provider name required by its user record.
const SOCIAL_PROVIDERS = new Map([
  ['google.com', 'google'],
  ['github.com', 'github']
]);
function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

// POST /api/auth/register
// Step 1 of signup: validate + stash the signup as "pending" and email an OTP.
// No account (and no JWT) is created yet; that only happens after /verify-otp.
router.post('/register', async (req, res) => {
  const requestId = req.requestId || 'unknown';
  try {
    const { name, email, phone, password, department, title } = req.body;
    console.log(`[auth/register:${requestId}] validating incoming registration`, { email, phone });
    if (!name || !email || !phone || !password) {
      console.warn(`[auth/register:${requestId}] validation failed: missing required fields`);
      return res.status(400).json({ error: 'Name, email, phone, and password are required' });
    }
    if (!EMAIL_RE.test(email)) {
      console.warn(`[auth/register:${requestId}] validation failed: invalid email`, { email });
      return res.status(400).json({ error: 'Enter a valid email address' });
    }
    if (password.length < 6) {
      console.warn(`[auth/register:${requestId}] validation failed: password too short`, { email });
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (store.findUser(u => u.phone === phone)) {
      console.warn(`[auth/register:${requestId}] validation failed: phone already registered`, { phone });
      return res.status(409).json({ error: 'Phone number already registered' });
    }
    if (store.findUser(u => u.email === normalizedEmail)) {
      console.warn(`[auth/register:${requestId}] validation failed: email already registered`, { email: normalizedEmail });
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.log(`[auth/register:${requestId}] validation passed`, { email: normalizedEmail });

    const hashedPassword = await bcrypt.hash(password, 10);
    const code = genOtp();
    console.log(`[auth/register:${requestId}] OTP generated`, { email: normalizedEmail, expiresInMinutes: 10 });

    const pendingRegistration = {
      email: normalizedEmail,
      name,
      phone,
      password: hashedPassword,
      department: department || '',
      title: title || '',
      otp: code,
      otpExpiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
      createdAt: Date.now()
    };

    console.log(`[auth/register:${requestId}] requesting SMTP email delivery`, { email: normalizedEmail });
    await sendOtpEmail(normalizedEmail, name, code, requestId);
    console.log(`[auth/register:${requestId}] SMTP email delivery completed`, { email: normalizedEmail });
    // Only persist a registration after the code has been accepted for
    // delivery. This avoids leaving an unusable pending account on failures.
    store.addPending(pendingRegistration);
    console.log(`[auth/register:${requestId}] pending registration saved`, { email: normalizedEmail });
    console.log(`[auth/register:${requestId}] sending success response`, { email: normalizedEmail });
    res.status(200).json({
      pending: true,
      email: normalizedEmail,
      message: 'Verification code sent to your email',
      ...(!emailConfigured() ? { devOtp: code } : {})
    });
  } catch (e) {
    console.error(`[auth/register:${requestId}] failed`, e);
    if (e instanceof EmailDeliveryError) {
      return res.status(503).json({
        error: e.message,
        code: 'EMAIL_DELIVERY_UNAVAILABLE'
      });
    }
    res.status(500).json({ error: 'Unable to start registration. Please try again.' });
  }
});

// POST /api/auth/verify-otp
// Step 2 of signup: confirm the code, then actually create the account.
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const pending = store.findPending(p => p.email === normalizedEmail);
    if (!pending) {
      return res.status(400).json({ error: 'No pending registration for this email. Please register again.' });
    }
    if (Date.now() > pending.otpExpiresAt) {
      store.removePending(normalizedEmail);
      return res.status(400).json({ error: 'Code expired. Please register again to get a new code.' });
    }
    if (pending.attempts >= MAX_OTP_ATTEMPTS) {
      store.removePending(normalizedEmail);
      return res.status(429).json({ error: 'Too many incorrect attempts. Please register again.' });
    }
    if (pending.otp !== String(code).trim()) {
      pending.attempts += 1;
      store.addPending(pending); // persist incremented attempt count
      return res.status(401).json({ error: 'Incorrect code' });
    }

    // Success: create the real, verified account.
    const user = store.addUser({
      id: uuidv4(),
      name: pending.name,
      email: pending.email,
      phone: pending.phone,
      password: pending.password,
      department: pending.department,
      title: pending.title,
      verified: true,
      avatarColor: '#F59E0B',
      createdAt: Date.now(),
      lastActive: Date.now()
    });
    store.removePending(normalizedEmail);

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser });
  } catch (e) {
    console.error('[auth/resend-otp]', e);
    if (e instanceof EmailDeliveryError) {
      return res.status(503).json({
        error: e.message,
        code: 'EMAIL_DELIVERY_UNAVAILABLE'
      });
    }
    res.status(500).json({ error: 'Unable to resend the verification code. Please try again.' });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
  const requestId = req.requestId || 'unknown';
  try {
    const { email } = req.body;
    console.log(`[auth/resend-otp:${requestId}] validating incoming resend request`, { email });
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const normalizedEmail = email.trim().toLowerCase();
    const pending = store.findPending(p => p.email === normalizedEmail);
    if (!pending) {
      return res.status(400).json({ error: 'No pending registration for this email. Please register again.' });
    }
    pending.otp = genOtp();
    console.log(`[auth/resend-otp:${requestId}] OTP generated`, { email: normalizedEmail, expiresInMinutes: 10 });
    pending.otpExpiresAt = Date.now() + OTP_TTL_MS;
    pending.attempts = 0;
    store.addPending(pending);
    console.log(`[auth/resend-otp:${requestId}] pending registration saved`, { email: normalizedEmail });
    console.log(`[auth/resend-otp:${requestId}] requesting SMTP email delivery`, { email: normalizedEmail });
    await sendOtpEmail(normalizedEmail, pending.name, pending.otp, requestId);
    console.log(`[auth/resend-otp:${requestId}] SMTP email delivery completed`, { email: normalizedEmail });
    console.log(`[auth/resend-otp:${requestId}] sending success response`, { email: normalizedEmail });
    res.json({
      message: 'A new code has been sent',
      ...(!emailConfigured() ? { devOtp: pending.otp } : {})
    });
  } catch (e) {
    console.error(`[auth/resend-otp:${requestId}] failed`, e);
    if (e instanceof EmailDeliveryError) {
      return res.status(503).json({
        error: e.message,
        code: 'EMAIL_DELIVERY_UNAVAILABLE'
      });
    }
    res.status(500).json({ error: 'Unable to resend the verification code. Please try again.' });
  }
});

// POST /api/auth/register-password
// Direct email/password registration for installations that do not require
// email OTP verification. The password is still hashed and the normal JWT
// session is issued, so this is not an anonymous sign-in route.
router.post('/register-password', async (req, res) => {
  try {
    const { name, email, phone, password, department, title } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Name, email, phone, and password are required' });
    }
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const normalizedEmail = email.trim().toLowerCase();
    if (store.findUser(u => u.phone === phone)) return res.status(409).json({ error: 'Phone number already registered' });
    if (store.findUser(u => u.email === normalizedEmail)) return res.status(409).json({ error: 'Email already registered' });

    const user = store.addUser({
      id: uuidv4(),
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: await bcrypt.hash(password, 10),
      department: department?.trim() || '',
      title: title?.trim() || '',
      // This route intentionally opts out of OTP verification.
      verified: true,
      avatarColor: '#F59E0B',
      createdAt: Date.now(),
      lastActive: Date.now()
    });
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser });
  } catch (e) {
    console.error('[auth/register-password] failed', e);
    res.status(500).json({ error: 'Unable to create your account. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }
    const user = store.findUser(u => u.phone === phone);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    // Only block accounts explicitly marked unverified. Accounts created before
    // this feature existed have no `verified` field at all; treat those as fine.
    if (user.verified === false) {
      return res.status(403).json({ error: 'Please verify your email before signing in', unverified: true, email: user.email });
    }
    store.updateUser(user.id, { lastActive: Date.now() });
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login-email
// An email/password alternative to mobile-number sign-in. It uses the same
// password checks and session behavior as the existing login endpoint.
router.post('/login-email', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = store.findUser(u => u.email === email.trim().toLowerCase());
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    store.updateUser(user.id, { lastActive: Date.now() });
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/firebase
// Exchange a Firebase-issued ID token for the application's own JWT. The ID
// token is always verified server-side; never trust profile data from the app.
router.post('/firebase', async (req, res) => {
  const requestId = req.requestId || 'unknown';
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      return res.status(401).json({ error: 'A valid Firebase ID token is required.' });
    }

    const decodedToken = await verifyFirebaseIdToken(idToken);
    const provider = SOCIAL_PROVIDERS.get(decodedToken.firebase?.sign_in_provider);
    if (!provider) {
      return res.status(403).json({ error: 'Only Google and GitHub sign-in are supported.' });
    }
    if (!decodedToken.email) {
      return res.status(400).json({ error: 'Your sign-in provider did not share an email address. Please use an account with a verified email.' });
    }

    const email = decodedToken.email.trim().toLowerCase();
    const now = Date.now();
    await connectMongo();

    // Firebase UID is the primary identity. An email match can link an
    // existing MongoDB record only when Firebase has verified that address.
    let mongoUser = await FirebaseUser.findOne({ firebaseUid: decodedToken.uid });
    if (!mongoUser && decodedToken.email_verified) {
      mongoUser = await FirebaseUser.findOne({ email });
    }

    let user = store.findUser(u => u.id === mongoUser?.appUserId)
      || store.findUser(u => u.firebaseUid === decodedToken.uid)
      || store.findUser(u => u.email === email);

    const profileUpdates = {
      firebaseUid: decodedToken.uid,
      authProvider: provider,
      name: decodedToken.name || user?.name || email.split('@')[0],
      email,
      // `avatar` fulfils the public user contract. `avatarUrl` keeps the
      // legacy field in sync for clients that already consume it.
      avatar: decodedToken.picture || user?.avatar || user?.avatarUrl || '',
      avatarUrl: decodedToken.picture || user?.avatarUrl || user?.avatar || '',
      lastLogin: now,
      lastActive: now
    };

    if (!user) {
      user = store.addUser({
        id: uuidv4(),
        ...profileUpdates,
        phone: '',
        department: '',
        title: '',
        verified: true,
        avatarColor: '#F59E0B',
        createdAt: now
      });
    } else {
      user = store.updateUser(user.id, profileUpdates);
    }

    // MongoDB is the source of truth for Firebase identities. The JSON-store
    // update above is a compatibility mirror for the app's existing routes.
    const mongoUpdates = {
      appUserId: user.id,
      firebaseUid: decodedToken.uid,
      name: profileUpdates.name,
      email,
      avatar: profileUpdates.avatar,
      avatarUrl: profileUpdates.avatarUrl,
      authProvider: provider,
      lastLogin: new Date(now),
      lastActive: now
    };
    if (mongoUser) {
      Object.assign(mongoUser, mongoUpdates);
      await mongoUser.save();
    } else {
      await FirebaseUser.create(mongoUpdates);
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    console.log(`[auth/firebase:${requestId}] signed in`, { userId: user.id, provider });
    res.json({ success: true, token, user: safeUser });
  } catch (error) {
    console.error(`[auth/firebase:${requestId}] failed`, error);
    if (error.code === 'FIREBASE_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'Social sign-in is not configured yet. Please contact support.' });
    }
    if (error.code === 'MONGODB_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'User storage is not configured yet. Please contact support.' });
    }
    if (['auth/id-token-expired', 'auth/id-token-revoked', 'auth/argument-error', 'auth/invalid-id-token'].includes(error.code)) {
      return res.status(401).json({ error: 'Your sign-in session expired. Please try again.' });
    }
    res.status(401).json({ error: 'We could not verify your sign-in. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  store.updateUser(req.user.id, { lastActive: Date.now() });
  const { password: _, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

// PATCH /api/auth/profile
router.patch('/profile', auth, (req, res) => {
  const { name, department, title, avatarColor } = req.body;
  const updated = store.updateUser(req.user.id, {
    ...(name && { name }),
    ...(department !== undefined && { department }),
    ...(title !== undefined && { title }),
    ...(avatarColor && { avatarColor })
  });
  if (!updated) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...safeUser } = updated;
  res.json({ user: safeUser });
});

module.exports = router;
