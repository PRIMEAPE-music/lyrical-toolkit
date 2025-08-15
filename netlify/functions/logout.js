const { getCorsHeaders } = require('./shared-storage');

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
        // For this demo, we'll just return success
        // In production, you'd revoke refresh tokens from your database
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Logged out successfully' })
        };

    } catch (error) {
        console.error('Logout error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Logout failed' })
        };
    }
};