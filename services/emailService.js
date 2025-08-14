const nodemailer = require('nodemailer');
const { generateSecureToken } = require('../utils/password');
const db = require('../database/connection');

const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendVerificationEmail = async (email, userId) => {
    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    // Store verification token
    const insertToken = db.prepare(`
        INSERT INTO email_verification_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
    `);
    insertToken.run(userId, token, expiresAt.toISOString());

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `Verify your email - ${process.env.APP_NAME}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to ${process.env.APP_NAME}!</h2>
                <p>Thank you for creating an account. Please verify your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" 
                       style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Verify Email Address
                    </a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
                <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
                <p style="color: #666; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
    return token;
};

const sendPasswordResetEmail = async (email, userId) => {
    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

    // Store password reset token
    const insertToken = db.prepare(`
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
    `);
    insertToken.run(userId, token, expiresAt.toISOString());

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `Password Reset - ${process.env.APP_NAME}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>You requested a password reset for your ${process.env.APP_NAME} account.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" 
                       style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${resetUrl}</p>
                <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
    return token;
};

const verifyEmailToken = async (token) => {
    const tokenRecord = db.prepare(`
        SELECT user_id, expires_at 
        FROM email_verification_tokens 
        WHERE token = ?
    `).get(token);

    if (!tokenRecord) {
        return null;
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
        // Token expired, clean it up
        db.prepare('DELETE FROM email_verification_tokens WHERE token = ?').run(token);
        return null;
    }

    // Mark user as verified
    db.prepare('UPDATE users SET email_verified = TRUE WHERE id = ?').run(tokenRecord.user_id);
    
    // Clean up the token
    db.prepare('DELETE FROM email_verification_tokens WHERE token = ?').run(token);

    return tokenRecord.user_id;
};

const verifyPasswordResetToken = async (token) => {
    const tokenRecord = db.prepare(`
        SELECT user_id, expires_at, used 
        FROM password_reset_tokens 
        WHERE token = ?
    `).get(token);

    if (!tokenRecord || tokenRecord.used) {
        return null;
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
        // Token expired, clean it up
        db.prepare('DELETE FROM password_reset_tokens WHERE token = ?').run(token);
        return null;
    }

    return tokenRecord.user_id;
};

const markPasswordResetTokenAsUsed = (token) => {
    db.prepare('UPDATE password_reset_tokens SET used = TRUE WHERE token = ?').run(token);
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    verifyEmailToken,
    verifyPasswordResetToken,
    markPasswordResetTokenAsUsed
};