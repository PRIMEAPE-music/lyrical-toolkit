const { authenticateUser } = require('../../services/userService');
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
        const { login, password } = JSON.parse(event.body);
        
        if (!login || !password) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Login and password are required' })
            };
        }

        // Authenticate user
        const user = await authenticateUser(login, password);
        
        // Generate tokens
        const tokens = await generateTokenPair(user);
        
        // Log successful login
        await logAuthAttempt({
            userId: user.id,
            action: 'LOGIN',
            ipAddress: event.headers['x-forwarded-for'] || 'unknown',
            userAgent: event.headers['user-agent'] || 'unknown',
            success: true
        });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Login successful',
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
        // Log failed login attempt
        await logAuthAttempt({
            action: 'LOGIN',
            ipAddress: event.headers['x-forwarded-for'] || 'unknown',
            userAgent: event.headers['user-agent'] || 'unknown',
            success: false,
            details: error.message
        });

        return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message || 'Authentication failed' })
        };
    }
};