const { createUser } = require('../../services/userService');
const { generateTokenPair } = require('../../services/tokenService');
const { logAuthAttempt } = require('../../services/auditService');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { username, email, password } = JSON.parse(event.body);
        
        if (!username || !email || !password) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Username, email, and password are required' })
            };
        }

        // Create user
        const user = await createUser({ username, email, password });
        
        // Generate tokens
        const tokens = await generateTokenPair(user);
        
        // Log successful signup
        await logAuthAttempt({
            userId: user.id,
            action: 'SIGNUP',
            ipAddress: event.headers['x-forwarded-for'] || 'unknown',
            userAgent: event.headers['user-agent'] || 'unknown',
            success: true
        });

        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Account created successfully. Please check your email to verify your account.',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    emailVerified: user.email_verified
                },
                tokens
            })
        };

    } catch (error) {
        // Log failed signup attempt
        await logAuthAttempt({
            action: 'SIGNUP',
            ipAddress: event.headers['x-forwarded-for'] || 'unknown',
            userAgent: event.headers['user-agent'] || 'unknown',
            success: false,
            details: error.message
        });

        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message || 'Failed to create account' })
        };
    }
};