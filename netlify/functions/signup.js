const { createUser, generateTokenPair, getCorsHeaders } = require('./shared-storage');

exports.handler = async (event, context) => {
    const headers = getCorsHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { username, email, password } = JSON.parse(event.body);
        
        if (!username || !email || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Username, email, and password are required' })
            };
        }

        // Create user
        const user = createUser({ username, email, password });

        // Generate tokens
        const tokens = generateTokenPair(user);

        // Return user without password hash
        const { passwordHash, ...userResponse } = user;

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: 'Account created successfully',
                user: {
                    ...userResponse,
                    email_verified: userResponse.emailVerified
                },
                tokens
            })
        };

    } catch (error) {
        console.error('Signup error:', error);
        return {
            statusCode: error.message.includes('already exists') ? 400 : 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Internal server error' })
        };
    }
};