// src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const store = require('../data/store');
const { auth, JWT_SECRET } = require('../middleware/auth');
const { EmailDeliveryError, emailConfigured, sendOtpEmail } = require('../utils/mailer');

const router = express.Router();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

// POST /api/auth/register
// Step 1 of signup: validate + stash the signup as "pending" and email an OTP.
// No account (and no JWT) is created yet; that only happens after /verify-otp.
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, department, title } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Name, email, phone, and password are required' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (store.findUser(u => u.phone === phone)) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }
    if (store.findUser(u => u.email === normalizedEmail)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const code = genOtp();

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

    await sendOtpEmail(normalizedEmail, name, code);
    // Only persist a registration after the code has been accepted for
    // delivery. This avoids leaving an unusable pending account on failures.
    store.addPending(pendingRegistration);
    res.status(200).json({
      pending: true,
      email: normalizedEmail,
      message: 'Verification code sent to your email',
      ...(!emailConfigured() ? { devOtp: code } : {})
    });
  } catch (e) {
    console.error('[auth/register]', e);
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
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const normalizedEmail = email.trim().toLowerCase();
    const pending = store.findPending(p => p.email === normalizedEmail);
    if (!pending) {
      return res.status(400).json({ error: 'No pending registration for this email. Please register again.' });
    }
    pending.otp = genOtp();
    pending.otpExpiresAt = Date.now() + OTP_TTL_MS;
    pending.attempts = 0;
    store.addPending(pending);
    await sendOtpEmail(normalizedEmail, pending.name, pending.otp);
    res.json({
      message: 'A new code has been sent',
      ...(!emailConfigured() ? { devOtp: pending.otp } : {})
    });
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
