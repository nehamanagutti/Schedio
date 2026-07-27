const nodemailer = require('nodemailer');

class EmailDeliveryError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'EmailDeliveryError';
    this.cause = cause;
  }
}

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromAddress = process.env.SMTP_FROM || smtpUser;

function createTransport(port, secure) {
  return nodemailer.createTransport({
    host: smtpHost,
    port,
    secure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    logger: true,
    debug: true,
  });
}

// Brevo's STARTTLS relay configuration. The fallback below uses implicit TLS
// only if this connection fails.
const transporter = createTransport(smtpPort, false);
let activeTransporter = transporter;
let fallbackTransporter;

function getFallbackTransporter() {
  if (!fallbackTransporter) {
    fallbackTransporter = createTransport(465, true);
  }
  return fallbackTransporter;
}

function emailConfigured() {
  return Boolean(smtpHost && process.env.SMTP_PORT && smtpUser && smtpPass);
}

function logSmtpConfiguration() {
  console.log('[email] SMTP configuration:', {
    SMTP_HOST: smtpHost,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: smtpUser,
    SMTP_FROM: fromAddress,
  });
}

function smtpErrorDetails(error) {
  return {
    name: error?.name,
    message: error?.message,
    code: error?.code,
    command: error?.command,
    errno: error?.errno,
    address: error?.address,
    port: error?.port,
    responseCode: error?.responseCode,
    response: error?.response,
    stack: error?.stack,
  };
}

async function verifyEmailTransport() {
  logSmtpConfiguration();

  if (!emailConfigured()) {
    console.error('[email] Brevo SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.');
    return false;
  }

  try {
    await activeTransporter.verify();
    console.log('Brevo SMTP connected successfully');
    return true;
  } catch (primaryError) {
    console.error('[email] SMTP connection failed:', smtpErrorDetails(primaryError));

    if (smtpPort !== 587) return false;

    console.warn('[email] Retrying Brevo SMTP on port 465 with implicit TLS.');
    try {
      activeTransporter = getFallbackTransporter();
      await activeTransporter.verify();
      console.log('Brevo SMTP connected successfully on port 465');
      return true;
    } catch (fallbackError) {
      console.error('[email] SMTP fallback connection failed:', smtpErrorDetails(fallbackError));
      activeTransporter = transporter;
      return false;
    }
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

async function sendOtpEmail(toEmail, name, code, requestId = 'unknown') {
  console.log(`[email:${requestId}] sendOtpEmail started`, { toEmail, from: fromAddress });
  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[DEV MODE - Brevo SMTP not configured] OTP for ${toEmail}: ${code}`);
      return;
    }
    throw new EmailDeliveryError('Email delivery is not configured. Set the Brevo SMTP credentials and try again.');
  }

  const message = {
    from: `"Schedio" <${fromAddress}>`,
    to: toEmail,
    subject: 'Your Schedio verification code',
    html: emailHtml(name, code)
  };

  try {
    console.log(`[email:${requestId}] sending OTP through SMTP`, { host: smtpHost, port: activeTransporter.options.port });
    await activeTransporter.sendMail(message);
    console.log(`[email:${requestId}] OTP email accepted by SMTP`, { toEmail, port: activeTransporter.options.port });
  } catch (primaryError) {
    if (activeTransporter === transporter && smtpPort === 587) {
      console.warn('[email] SMTP delivery failed on port 587. Retrying on port 465 with implicit TLS.');
      try {
        activeTransporter = getFallbackTransporter();
        await activeTransporter.sendMail(message);
        console.log(`[email:${requestId}] OTP email accepted by SMTP fallback`, { toEmail, port: 465 });
        return;
      } catch (fallbackError) {
        console.error(`[email:${requestId}] Failed to send OTP on both SMTP ports:`, smtpErrorDetails(fallbackError));
        activeTransporter = transporter;
        throw new EmailDeliveryError('We could not send the verification email. Please try again shortly.', fallbackError);
      }
    }

    console.error(`[email:${requestId}] Failed to send OTP:`, smtpErrorDetails(primaryError));
    throw new EmailDeliveryError('We could not send the verification email. Please try again shortly.', primaryError);
  }
}

module.exports = { EmailDeliveryError, emailConfigured, sendOtpEmail, transporter, verifyEmailTransport };
