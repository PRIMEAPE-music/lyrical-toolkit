const { verifyPasswordResetToken, markPasswordResetTokenAsUsed } = require('../../services/emailService');
const { updateUserPassword } = require('../../services/userService');
const { validatePassword } = require('../../utils/validation');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { token, newPassword } = JSON.parse(event.body);
        
        if (!token || !newPassword) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Token and new password are required' })
            };
        }

        // Validate new password
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: passwordValidation.errors.join(', ') })
            };
        }

        // Verify reset token
        const userId = await verifyPasswordResetToken(token);
        if (!userId) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Invalid or expired reset token' })
            };
        }

        // Update password
        await updateUserPassword(userId, newPassword);
        
        // Mark token as used
        markPasswordResetTokenAsUsed(token);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Password reset successfully' })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Password reset failed' })
        };
    }
};