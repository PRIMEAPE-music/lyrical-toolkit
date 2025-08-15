const { authenticateUser, generateTokenPair, getCorsHeaders } = require('./shared-storage');

// Input sanitization helper
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>"'&]/g, '');
}

exports.handler = function(event, context) {
    const headers = getCorsHeaders();
    
    console.log('[LOGIN] ' + event.httpMethod + ' request received from ' + ((event.headers && event.headers.origin) || 'unknown'));

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

    return new Promise(function(resolve) {
        try {
            // Parse and validate request body
            let requestBody;
            try {
                requestBody = JSON.parse(event.body || '{}');
            } catch (parseError) {
                console.error('[LOGIN] Invalid JSON in request body:', parseError);
                resolve({
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({ error: 'Invalid JSON in request body' })
                });
                return;
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
            
            authenticateUser(sanitizedLogin, password).then(function(user) {
                console.log('[LOGIN] Generating tokens for user:', user.username);
                
                try {
                    const tokens = generateTokenPair(user);
                    
                    // Return user without sensitive data
                    const userResponse = Object.assign({}, user);
                    delete userResponse.passwordHash;

                    console.log('[LOGIN] Login successful for user:', user.username);
                    resolve({
                        statusCode: 200,
                        headers: headers,
                        body: JSON.stringify({
                            message: 'Login successful',
                            user: Object.assign({}, userResponse, {
                                email_verified: userResponse.emailVerified
                            }),
                            tokens: tokens
                        })
                    });
                } catch (tokenError) {
                    console.error('[LOGIN] Token generation failed:', tokenError);
                    resolve({
                        statusCode: 500,
                        headers: headers,
                        body: JSON.stringify({ 
                            error: 'Token generation failed',
                            details: 'Authentication successful but login tokens could not be generated'
                        })
                    });
                }
            }).catch(function(authError) {
                console.error('[LOGIN] Authentication failed:', {
                    message: authError.message,
                    login: sanitizedLogin ? (sanitizedLogin.substring(0, 3) + '***') : 'missing'
                });
                
                // Handle specific authentication errors
                if (authError.message.indexOf('Invalid credentials') !== -1) {
                    resolve({
                        statusCode: 401,
                        headers: headers,
                        body: JSON.stringify({ 
                            error: 'Invalid credentials',
                            details: 'Username/email or password is incorrect'
                        })
                    });
                    return;
                }
                
                if (authError.message.indexOf('Blobs storage') !== -1) {
                    resolve({
                        statusCode: 503,
                        headers: headers,
                        body: JSON.stringify({ 
                            error: 'Service temporarily unavailable',
                            details: 'Authentication service is currently unavailable. Please try again later.'
                        })
                    });
                    return;
                }
                
                resolve({
                    statusCode: 500,
                    headers: headers,
                    body: JSON.stringify({ 
                        error: 'Internal server error',
                        details: 'An unexpected error occurred during login'
                    })
                });
            });

        } catch (error) {
            console.error('[LOGIN] Unexpected error:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            resolve({
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ 
                    error: 'Internal server error',
                    details: 'An unexpected error occurred during login'
                })
            });
        }
    });
};