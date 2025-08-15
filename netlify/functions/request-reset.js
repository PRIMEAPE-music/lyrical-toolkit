const { sendPasswordResetEmail } = require('../../services/emailService');
const db = require('../../database/connection');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { email } = JSON.parse(event.body);
        
        if (!email) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Email is required' })
            };
        }

        // Find user by email
        const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email.toLowerCase());
        
        if (user) {
            // Send password reset email
            await sendPasswordResetEmail(user.email, user.id);
        }

        // Always return success to prevent email enumeration
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'If an account with this email exists, a password reset link has been sent.'
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to process password reset request' })
        };
    }
};