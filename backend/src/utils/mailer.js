const nodemailer = require('nodemailer');

class EmailDeliveryError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'EmailDeliveryError';
    this.cause = cause;
  }
}

const provider = () => (process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? 'resend' : 'smtp')).trim().toLowerCase();
const smtpUser = () => process.env.SMTP_USER || process.env.GMAIL_USER;
const smtpPassword = () => process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD;
const smtpHost = () => process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = () => Number(process.env.SMTP_PORT || 587);
const fromAddress = () => process.env.EMAIL_FROM || smtpUser();

// SMTP remains available for local development and non-Render deployments.
// Explicit timeouts prevent a blocked outbound SMTP connection from hanging an
// HTTP request indefinitely.
const transporter = nodemailer.createTransport({
  host: smtpHost(),
  port: smtpPort(),
  secure: process.env.SMTP_SECURE === 'true' || smtpPort() === 465,
  auth: {
    user: smtpUser(),
    pass: smtpPassword()
  },
  tls: { minVersion: 'TLSv1.2', servername: smtpHost() },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000
});

function emailConfigured() {
  if (provider() === 'resend') {
    return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  }
  return Boolean(smtpUser() && smtpPassword() && fromAddress());
}

async function verifyEmailTransport() {
  if (!emailConfigured()) {
    console.error(`[email] ${provider()} is not configured. OTP email delivery is unavailable.`);
    return false;
  }

  try {
    if (provider() === 'resend') {
      const response = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        signal: AbortSignal.timeout(10_000)
      });
      if (!response.ok) throw new Error(`Resend verification returned HTTP ${response.status}`);
    } else if (provider() === 'smtp') {
      await transporter.verify();
    } else {
      throw new Error(`Unsupported EMAIL_PROVIDER: ${provider()}`);
    }
    console.log(`[email] ${provider()} transport verified.`);
    return true;
  } catch (error) {
    console.error(`[email] ${provider()} transport verification failed: ${error.message}`);
    return false;
  }
}

function emailHtml(name, code) {
  const safeName = String(name || 'there').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  return `
    <div style="font-family:sans-serif;max-width:420px;margin:0 auto">
      <h2 style="color:#0A0F1E">Verify your Schedio account</h2>
      <p>Hi ${safeName},</p>
      <p>Your verification code is:</p>
      <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#F5F5F5;padding:16px;text-align:center;border-radius:8px">${code}</div>
      <p style="color:#666;font-size:13px">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  `;
}

async function sendWithResend(toEmail, name, code) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `Schedio <${fromAddress()}>`,
      to: [toEmail],
      subject: 'Your Schedio verification code',
      html: emailHtml(name, code)
    }),
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) {
    throw new Error(`Resend returned HTTP ${response.status}: ${await response.text()}`);
  }
}

async function sendOtpEmail(toEmail, name, code) {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[DEV MODE - no email configured] OTP for ${toEmail}: ${code}`);
      return;
    }
    throw new EmailDeliveryError('Email delivery is not configured.');
  }

  try {
    if (provider() === 'resend') {
      await sendWithResend(toEmail, name, code);
    } else if (provider() === 'smtp') {
      await transporter.sendMail({
        from: `"Schedio" <${fromAddress()}>`,
        to: toEmail,
        subject: 'Your Schedio verification code',
        html: emailHtml(name, code)
      });
    } else {
      throw new Error(`Unsupported EMAIL_PROVIDER: ${provider()}`);
    }
  } catch (error) {
    console.error(`[email] Failed to send OTP to ${toEmail}: ${error.message}`);
    throw new EmailDeliveryError('We could not send the verification email. Please try again shortly.', error);
  }
}

module.exports = { EmailDeliveryError, emailConfigured, sendOtpEmail, transporter, verifyEmailTransport };
