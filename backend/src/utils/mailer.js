const nodemailer = require('nodemailer');

class EmailDeliveryError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'EmailDeliveryError';
    this.cause = cause;
  }
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function verifyEmailTransport() {
  if (!emailConfigured()) {
    console.error('[email] Brevo SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.');
    return false;
  }

  try {
    await transporter.verify();
    console.log('Brevo SMTP connected successfully');
    return true;
  } catch (error) {
    console.error(error);
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

async function sendOtpEmail(toEmail, name, code) {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[DEV MODE - Brevo SMTP not configured] OTP for ${toEmail}: ${code}`);
      return;
    }
    throw new EmailDeliveryError('Email delivery is not configured. Set the Brevo SMTP credentials and try again.');
  }

  try {
    await transporter.sendMail({
      from: `"Schedio" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: 'Your Schedio verification code',
      html: emailHtml(name, code)
    });
  } catch (error) {
    console.error(`[email] Failed to send OTP to ${toEmail}: ${error.message}`);
    throw new EmailDeliveryError('We could not send the verification email. Please try again shortly.', error);
  }
}

module.exports = { EmailDeliveryError, emailConfigured, sendOtpEmail, transporter, verifyEmailTransport };
