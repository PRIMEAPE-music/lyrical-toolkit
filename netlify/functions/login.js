const { authenticateUser, generateTokenPair, getCorsHeaders } = require('./shared-storage');

// Input sanitization helper
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>"'&]/g, '');
}

exports.handler = async (event, context) => {
    const headers = getCorsHeaders();
    
    console.log(`[LOGIN] ${event.httpMethod} request received from ${event.headers?.origin || 'unknown'}`);

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        console.warn(`[LOGIN] Invalid method: ${event.httpMethod}`);
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse and validate request body
        let requestBody;
        try {
            requestBody = JSON.parse(event.body || '{}');
        } catch (parseError) {
            console.error('[LOGIN] Invalid JSON in request body:', parseError);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid JSON in request body' })
            };
        }
        
        const { login, password } = requestBody;
        
        console.log('[LOGIN] Processing login request:', { 
            login: login ? `${login.substring(0, 3)}***` : 'missing',
            passwordLength: password?.length || 0,
            hasLogin: !!login,
            hasPassword: !!password
        });
        
        // Enhanced input validation
        const validationErrors = [];
        
        if (!login) {
            validationErrors.push('Username or email is required');
        } else if (typeof login !== 'string' || login.trim().length === 0) {
            validationErrors.push('Valid username or email is required');
        } else if (login.trim().length > 100) {
            validationErrors.push('Login must be less than 100 characters');
        }
        
        if (!password) {
            validationErrors.push('Password is required');
        } else if (typeof password !== 'string' || password.length === 0) {
            validationErrors.push('Valid password is required');
        } else if (password.length > 128) {
            validationErrors.push('Password must be less than 128 characters');
        }
        
        if (validationErrors.length > 0) {
            console.warn('[LOGIN] Validation errors:', validationErrors);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Validation failed', 
                    details: validationErrors 
                })
            };
        }

        // Sanitize login input
        const sanitizedLogin = sanitizeInput(login.trim());
        
        // Authenticate user with error boundary
        console.log('[LOGIN] Attempting to authenticate user');
        let user;
        try {
            user = await authenticateUser(sanitizedLogin, password);
        } catch (authError) {
            console.error('[LOGIN] Authentication failed:', {
                message: authError.message,
                login: sanitizedLogin ? `${sanitizedLogin.substring(0, 3)}***` : 'missing'
            });
            
            // Handle specific authentication errors
            if (authError.message.includes('Invalid credentials')) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Invalid credentials',
                        details: 'Username/email or password is incorrect'
                    })
                };
            }
            
            if (authError.message.includes('Blobs storage')) {
                return {
                    statusCode: 503,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Service temporarily unavailable',
                        details: 'Authentication service is currently unavailable. Please try again later.'
                    })
                };
            }
            
            throw authError; // Re-throw unexpected errors
        }

        // Generate tokens with error boundary
        console.log('[LOGIN] Generating tokens for user:', user.username);
        let tokens;
        try {
            tokens = generateTokenPair(user);
        } catch (tokenError) {
            console.error('[LOGIN] Token generation failed:', tokenError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Token generation failed',
                    details: 'Authentication successful but login tokens could not be generated'
                })
            };
        }

        // Return user without sensitive data
        const { passwordHash, ...userResponse } = user;

        console.log('[LOGIN] Login successful for user:', user.username);
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
        console.error('[LOGIN] Unexpected error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: 'An unexpected error occurred during login'
            })
        };
    }
};