const { authenticateUser, generateTokenPair, getCorsHeaders } = require('./shared-storage');

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
        const { login, password } = JSON.parse(event.body);
        
        if (!login || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Login and password are required' })
            };
        }

        // Authenticate user
        const user = await authenticateUser(login, password);

        // Generate tokens
        const tokens = generateTokenPair(user);

        // Return user without password hash
        const { passwordHash, ...userResponse } = user;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Login successful',
                user: {
                    ...userResponse,
                    email_verified: userResponse.emailVerified
                },
                tokens
            })
        };

    } catch (error) {
        console.error('Login error:', error);
        return {
            statusCode: error.message === 'Invalid credentials' ? 401 : 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Internal server error' })
        };
    }
};