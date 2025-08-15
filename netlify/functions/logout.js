const { getCorsHeaders } = require('./shared-storage');

exports.handler = async (event, context) => {
    const headers = getCorsHeaders();
    
    console.log(`[LOGOUT] ${event.httpMethod} request received`);

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        console.warn(`[LOGOUT] Invalid method: ${event.httpMethod}`);
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse request body (optional - may contain refresh token for future revocation)
        let requestBody = {};
        try {
            if (event.body) {
                requestBody = JSON.parse(event.body);
            }
        } catch (parseError) {
            console.warn('[LOGOUT] Invalid JSON in request body, proceeding with logout:', parseError);
        }
        
        console.log('[LOGOUT] Processing logout request');
        
        // TODO: In production, implement refresh token revocation
        // if (requestBody.refreshToken) {
        //     await revokeRefreshToken(requestBody.refreshToken);
        // }
        
        console.log('[LOGOUT] Logout completed successfully');
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: 'Logged out successfully',
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('[LOGOUT] Unexpected error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Logout failed',
                details: 'An unexpected error occurred during logout'
            })
        };
    }
};