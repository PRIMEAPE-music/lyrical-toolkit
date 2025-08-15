const { verifyJWT, getUserById, generateTokenPair, getCorsHeaders, REFRESH_SECRET } = require('./shared-storage');

exports.handler = async (event, context) => {
    const headers = getCorsHeaders();
    
    console.log(`[REFRESH] ${event.httpMethod} request received`);

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        console.warn(`[REFRESH] Invalid method: ${event.httpMethod}`);
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse request body
        let requestBody;
        try {
            requestBody = JSON.parse(event.body || '{}');
        } catch (parseError) {
            console.error('[REFRESH] Invalid JSON in request body:', parseError);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid JSON in request body' })
            };
        }
        
        const { refreshToken } = requestBody;
        
        console.log('[REFRESH] Processing token refresh request');
        
        if (!refreshToken) {
            console.warn('[REFRESH] No refresh token provided');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Refresh token required',
                    details: 'Refresh token is missing from request body'
                })
            };
        }
        
        if (typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
            console.warn('[REFRESH] Invalid refresh token format');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid refresh token',
                    details: 'Refresh token must be a non-empty string'
                })
            };
        }

        // Verify refresh token with error handling
        let payload;
        try {
            payload = verifyJWT(refreshToken, REFRESH_SECRET);
            console.log('[REFRESH] Refresh token verified for user:', payload.userId);
            
            if (!payload.type || payload.type !== 'refresh') {
                console.warn('[REFRESH] Invalid token type:', payload.type);
                throw new Error('Invalid token type - not a refresh token');
            }
        } catch (tokenError) {
            console.error('[REFRESH] Refresh token verification failed:', tokenError.message);
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid refresh token',
                    details: tokenError.message
                })
            };
        }
        
        // Get user data with error handling
        let user;
        try {
            user = await getUserById(payload.userId);
            if (!user) {
                console.warn('[REFRESH] User not found for ID:', payload.userId);
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ 
                        error: 'User not found',
                        details: 'User account may have been deleted or does not exist'
                    })
                };
            }
        } catch (userError) {
            console.error('[REFRESH] Error retrieving user:', userError);
            if (userError.message.includes('Blobs storage')) {
                return {
                    statusCode: 503,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Service temporarily unavailable',
                        details: 'User data service is currently unavailable'
                    })
                };
            }
            throw userError;
        }

        // Generate new token pair with error handling
        let tokens;
        try {
            tokens = generateTokenPair(user);
            console.log('[REFRESH] New tokens generated for user:', user.username);
        } catch (tokenGenError) {
            console.error('[REFRESH] Token generation failed:', tokenGenError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Token generation failed',
                    details: 'Unable to generate new authentication tokens'
                })
            };
        }

        console.log('[REFRESH] Tokens refreshed successfully for user:', user.username);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Tokens refreshed successfully',
                tokens
            })
        };

    } catch (error) {
        console.error('[REFRESH] Unexpected error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: 'An unexpected error occurred during token refresh'
            })
        };
    }
};