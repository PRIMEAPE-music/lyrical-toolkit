const { verifyJWT, getUserById, getCorsHeaders, JWT_SECRET } = require('./shared-storage');

exports.handler = async (event, context) => {
    const headers = getCorsHeaders();
    
    console.log(`[PROFILE] ${event.httpMethod} request received`);

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        console.warn(`[PROFILE] Invalid method: ${event.httpMethod}`);
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Validate authorization header
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader) {
            console.warn('[PROFILE] No authorization header provided');
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    error: 'Authorization required',
                    details: 'Authorization header is missing'
                })
            };
        }
        
        if (!authHeader.startsWith('Bearer ')) {
            console.warn('[PROFILE] Invalid authorization header format');
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid authorization format',
                    details: 'Authorization header must start with "Bearer "'
                })
            };
        }

        const token = authHeader.substring(7);
        
        // Verify JWT token with error handling
        let payload;
        try {
            payload = verifyJWT(token, JWT_SECRET);
            console.log('[PROFILE] Token verified for user:', payload.userId);
        } catch (tokenError) {
            console.error('[PROFILE] Token verification failed:', tokenError.message);
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    error: 'Token verification failed',
                    details: tokenError.message
                })
            };
        }
        
        // Get user data with error handling
        let user;
        try {
            user = await getUserById(payload.userId);
            if (!user) {
                console.warn('[PROFILE] User not found for ID:', payload.userId);
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
            console.error('[PROFILE] Error retrieving user:', userError);
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

        // Remove sensitive data
        const { passwordHash, ...userResponse } = user;

        console.log('[PROFILE] Profile retrieved successfully for user:', user.username);
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
        console.error('[PROFILE] Unexpected error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: 'An unexpected error occurred while retrieving profile'
            })
        };
    }
};