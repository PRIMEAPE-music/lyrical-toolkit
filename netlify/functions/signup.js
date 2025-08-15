const { createUser, generateTokenPair, getCorsHeaders } = require('./shared-storage');

// Input sanitization helper
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>"'&]/g, '');
}

exports.handler = function(event, context) {
    const headers = getCorsHeaders();
    
    console.log('[SIGNUP] ' + event.httpMethod + ' request received from ' + ((event.headers && event.headers.origin) || 'unknown'));

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        console.warn(`[SIGNUP] Invalid method: ${event.httpMethod}`);
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
                console.error('[SIGNUP] Invalid JSON in request body:', parseError);
                resolve({
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({ error: 'Invalid JSON in request body' })
                });
                return;
            }
        
        const { username, email, password } = requestBody;
        
        console.log('[SIGNUP] Processing signup request:', { 
            username, 
            email, 
            passwordLength: password?.length,
            hasUsername: !!username,
            hasEmail: !!email,
            hasPassword: !!password
        });
        
        // Enhanced input validation
        const validationErrors = [];
        
        if (!username) {
            validationErrors.push('Username is required');
        } else if (typeof username !== 'string' || username.trim().length < 3) {
            validationErrors.push('Username must be at least 3 characters long');
        } else if (username.trim().length > 50) {
            validationErrors.push('Username must be less than 50 characters');
        } else if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
            validationErrors.push('Username can only contain letters, numbers, underscores, and hyphens');
        }
        
        if (!email) {
            validationErrors.push('Email is required');
        } else if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            validationErrors.push('Valid email address is required');
        }
        
        if (!password) {
            validationErrors.push('Password is required');
        } else if (typeof password !== 'string' || password.length < 6) {
            validationErrors.push('Password must be at least 6 characters long');
        } else if (password.length > 128) {
            validationErrors.push('Password must be less than 128 characters');
        }
        
            if (validationErrors.length > 0) {
                console.warn('[SIGNUP] Validation errors:', validationErrors);
                resolve({
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({ 
                        error: 'Validation failed', 
                        details: validationErrors 
                    })
                });
                return;
            }

            // Create user with error boundary
            console.log('[SIGNUP] Attempting to create user:', username.trim());
            
            createUser({ 
                username: username.trim(), 
                email: email.trim().toLowerCase(), 
                password: password 
            }).then(function(user) {
                console.log('[SIGNUP] Generating tokens for user:', user.username);
                
                try {
                    const tokens = generateTokenPair(user);
                    
                    // Return user without sensitive data
                    const userResponse = Object.assign({}, user);
                    delete userResponse.passwordHash;

                    console.log('[SIGNUP] Signup successful for user:', user.username);
                    resolve({
                        statusCode: 201,
                        headers: headers,
                        body: JSON.stringify({
                            message: 'Account created successfully',
                            user: Object.assign({}, userResponse, {
                                email_verified: userResponse.emailVerified
                            }),
                            tokens: tokens
                        })
                    });
                } catch (tokenError) {
                    console.error('[SIGNUP] Token generation failed:', tokenError);
                    resolve({
                        statusCode: 500,
                        headers: headers,
                        body: JSON.stringify({ 
                            error: 'Token generation failed',
                            details: 'Account created but login tokens could not be generated'
                        })
                    });
                }
            }).catch(function(createError) {
                console.error('[SIGNUP] User creation failed:', createError);
                
                // Handle specific error types
                if (createError.message.indexOf('already exists') !== -1) {
                    resolve({
                        statusCode: 409,
                        headers: headers,
                        body: JSON.stringify({ 
                            error: 'User already exists',
                            details: 'A user with this username or email already exists'
                        })
                    });
                    return;
                }
                
                if (createError.message.indexOf('Blobs storage') !== -1) {
                    resolve({
                        statusCode: 503,
                        headers: headers,
                        body: JSON.stringify({ 
                            error: 'Service temporarily unavailable',
                            details: 'Unable to save user data. Please try again later.'
                        })
                    });
                    return;
                }
                
                resolve({
                    statusCode: 500,
                    headers: headers,
                    body: JSON.stringify({ 
                        error: 'Internal server error',
                        details: 'An unexpected error occurred during signup'
                    })
                });
            });

        } catch (error) {
            console.error('[SIGNUP] Unexpected error:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            resolve({
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ 
                    error: 'Internal server error',
                    details: 'An unexpected error occurred during signup'
                })
            });
        }
    });
};