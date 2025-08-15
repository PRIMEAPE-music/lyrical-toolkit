const { verifyJWT, getUserById, generateTokenPair, getCorsHeaders, REFRESH_SECRET } = require('./shared-storage');

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
        const { refreshToken } = JSON.parse(event.body);
        
        if (!refreshToken) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Refresh token is required' })
            };
        }

        // Verify refresh token
        const payload = verifyJWT(refreshToken, REFRESH_SECRET);
        
        // Get user data
        const user = await getUserById(payload.userId);
        if (!user) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'User not found' })
            };
        }

        // Generate new token pair
        const tokens = generateTokenPair(user);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Tokens refreshed successfully',
                tokens
            })
        };

    } catch (error) {
        console.error('Token refresh error:', error);
        return {
            statusCode: error.message.includes('token') ? 401 : 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Token refresh failed' })
        };
    }
};