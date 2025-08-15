const { verifyRefreshToken, generateTokenPair } = require('../../services/tokenService');
const { getUserById } = require('../../services/userService');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { refreshToken } = JSON.parse(event.body);
        
        if (!refreshToken) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Refresh token is required' })
            };
        }

        // Verify refresh token
        const userId = await verifyRefreshToken(refreshToken);
        if (!userId) {
            return {
                statusCode: 401,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Invalid or expired refresh token' })
            };
        }

        // Get user data
        const user = getUserById(userId);
        if (!user) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'User not found' })
            };
        }

        // Generate new token pair
        const tokens = await generateTokenPair(user);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Tokens refreshed successfully',
                tokens
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Token refresh failed' })
        };
    }
};