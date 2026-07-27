// src/utils/mailer.js
const nodemailer = require('nodemailer');

// Uses a free Gmail account with an "App Password" (NOT your normal Gmail password).
// Setup:
//   1. Enable 2-Step Verification on the Gmail account: myaccount.google.com/security
//   2. Create an App Password: myaccount.google.com/apppasswords
//   3. Set env vars on your backend host (Render, etc.):
//        GMAIL_USER = youraddress@gmail.com
//        GMAIL_APP_PASSWORD = the 16-character app password (no spaces)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

async function sendOtpEmail(toEmail, name, code) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    // Fail loudly in dev so it's obvious the .env isn't set up, instead of
    // silently pretending the email was sent.
    console.warn(`\n[DEV MODE - no email configured] OTP for ${toEmail}: ${code}\n`);
    return;
  }

  await transporter.sendMail({
    from: `"Schedio" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Schedio verification code',
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:0 auto">
        <h2 style="color:#0A0F1E">Verify your Schedio account</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Your verification code is:</p>
        <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#F5F5F5;padding:16px;text-align:center;border-radius:8px">${code}</div>
        <p style="color:#666;font-size:13px">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `
  });
}

module.exports = { sendOtpEmail };
