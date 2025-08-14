const { revokeRefreshToken } = require('../../services/tokenService');

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
        
        if (refreshToken) {
            // Revoke specific refresh token
            revokeRefreshToken(refreshToken);
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Logged out successfully' })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Logout failed' })
        };
    }
};