/**
 * AFTER: services/emailService.js
 * 
 * Email sending abstracted - easy to mock in tests
 */

const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Get or create email transporter (singleton)
 */
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Send an email
 * @param {object} options - Email options
 * @param {string} options.to - Recipient
 * @param {string} options.subject - Subject line
 * @param {string} options.html - HTML body
 */
async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();
  
  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}

/**
 * Send verification email to new user
 * @param {string} email - User's email
 * @param {string} name - User's name
 * @param {string} token - Verification token
 */
async function sendVerificationEmail(email, name, token) {
  const verificationUrl = `${process.env.APP_URL}/verify?token=${token}`;
  
  await sendEmail({
    to: email,
    subject: 'Verify your email',
    html: `
      <h1>Welcome, ${name}!</h1>
      <p>Thanks for signing up. Please verify your email by clicking the link below:</p>
      <p><a href="${verificationUrl}">Verify Email</a></p>
      <p>Or copy this URL: ${verificationUrl}</p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

/**
 * Send password reset email
 * @param {string} email - User's email
 * @param {string} name - User's name
 * @param {string} token - Reset token
 */
async function sendPasswordResetEmail(email, name, token) {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
  
  await sendEmail({
    to: email,
    subject: 'Reset your password',
    html: `
      <h1>Password Reset</h1>
      <p>Hi ${name},</p>
      <p>You requested a password reset. Click the link below:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>If you didn't request this, ignore this email.</p>
      <p>This link expires in 1 hour.</p>
    `,
  });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
