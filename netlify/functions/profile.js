const { verifyJWT, getUserById, getCorsHeaders, JWT_SECRET } = require('./shared-storage');

exports.handler = async (event, context) => {
    const headers = getCorsHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const authHeader = event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Authorization token required' })
            };
        }

        const token = authHeader.substring(7);
        const payload = verifyJWT(token, JWT_SECRET);
        
        const user = getUserById(payload.userId);
        if (!user) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'User not found' })
            };
        }

        const { passwordHash, ...userResponse } = user;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                user: {
                    ...userResponse,
                    email_verified: userResponse.emailVerified
                }
            })
        };

    } catch (error) {
        console.error('Profile error:', error);
        return {
            statusCode: error.message.includes('token') ? 401 : 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Failed to get user profile' })
        };
    }
};