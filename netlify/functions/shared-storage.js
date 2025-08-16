// Persistent authentication for Netlify functions using Supabase database
const crypto = require('crypto');
const { UserOperations, testConnection } = require('./supabase-client');

// Environment variable validation with proper fallbacks
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

// Production environment validation
function validateEnvironment() {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.NETLIFY;
    
    if (isProduction) {
        if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
            throw new Error('JWT_SECRET must be properly configured in production environment');
        }
        if (!REFRESH_SECRET || REFRESH_SECRET === 'your-refresh-secret-change-in-production') {
            throw new Error('REFRESH_SECRET must be properly configured in production environment');
        }
    } else {
        if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
            console.warn('JWT_SECRET not properly configured. Using fallback - NOT SECURE FOR PRODUCTION');
        }
        if (!REFRESH_SECRET || REFRESH_SECRET === 'your-refresh-secret-change-in-production') {
            console.warn('REFRESH_SECRET not properly configured. Using fallback - NOT SECURE FOR PRODUCTION');
        }
    }
}

// Validate environment on module load
try {
    validateEnvironment();
} catch (error) {
    console.error('Environment validation failed:', error.message);
    // In production, this will cause module to fail to load
    if (process.env.NODE_ENV === 'production' || process.env.NETLIFY) {
        throw error;
    }
}

const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'fallback-jwt-secret-insecure';
const EFFECTIVE_REFRESH_SECRET = REFRESH_SECRET || 'fallback-refresh-secret-insecure';

// Base64URL encoding helper for Node.js compatibility
function base64UrlEncode(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function base64UrlDecode(str) {
    // Add padding if needed
    str += '='.repeat((4 - str.length % 4) % 4);
    // Replace URL-safe characters
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(str, 'base64').toString();
}

// Create JWT token with Node.js compatibility
function createJWT(payload, secret, expiresIn) {
    expiresIn = expiresIn || '15m';
    
    try {
        if (!payload || typeof payload !== 'object') {
            throw new Error('Invalid payload provided');
        }
        if (!secret) {
            throw new Error('Secret is required for JWT creation');
        }
        
        const header = { typ: 'JWT', alg: 'HS256' };
        const encodedHeader = base64UrlEncode(JSON.stringify(header));
        
        const now = Math.floor(Date.now() / 1000);
        let exp;
        if (expiresIn === '15m') {
            exp = now + 900; // 15 minutes
        } else if (expiresIn === '7d') {
            exp = now + 604800; // 7 days
        } else {
            throw new Error('Invalid expiration time specified');
        }
        
        const payloadWithExp = Object.assign({}, payload, { exp: exp, iat: now });
        const encodedPayload = base64UrlEncode(JSON.stringify(payloadWithExp));
        
        const signature = crypto
            .createHmac('sha256', secret)
            .update(encodedHeader + '.' + encodedPayload)
            .digest('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
        
        return encodedHeader + '.' + encodedPayload + '.' + signature;
    } catch (error) {
        console.error('JWT creation failed:', error);
        throw new Error('Failed to create JWT: ' + error.message);
    }
}

// Verify JWT token with Node.js compatibility
function verifyJWT(token, secret) {
    try {
        if (!token) {
            throw new Error('Token is required');
        }
        
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid token format');
        }
        
        const header = parts[0];
        const payload = parts[1];
        const signature = parts[2];
        
        // Verify signature
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(header + '.' + payload)
            .digest('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
            
        if (signature !== expectedSignature) {
            throw new Error('Invalid signature');
        }
        
        // Decode payload
        let decodedPayload;
        try {
            decodedPayload = JSON.parse(base64UrlDecode(payload));
        } catch (error) {
            throw new Error('Invalid token payload');
        }
        
        // Check expiration
        if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
            throw new Error('Token expired');
        }
        
        return decodedPayload;
    } catch (error) {
        throw new Error('Token verification failed: ' + error.message);
    }
}

// Hash password
function hashPassword(password) {
    if (!password) {
        throw new Error('Password is required');
    }
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate token pair for user with improved validation
function generateTokenPair(user) {
    try {
        if (!user || !user.id || !user.username || !user.email) {
            throw new Error('Invalid user data for token generation - missing required fields');
        }
        
        console.log('Generating token pair for user:', user.username);
        
        const accessToken = createJWT({ 
            userId: user.id, 
            username: user.username,
            email: user.email
        }, EFFECTIVE_JWT_SECRET, '15m');
        
        const refreshToken = createJWT({ 
            userId: user.id, 
            username: user.username,
            type: 'refresh' 
        }, EFFECTIVE_REFRESH_SECRET, '7d');
        
        console.log('Token pair generated successfully for user:', user.username);
        return { accessToken: accessToken, refreshToken: refreshToken };
    } catch (error) {
        console.error('Token generation failed for user:', user ? user.username : 'unknown', error);
        throw new Error('Failed to generate tokens: ' + error.message);
    }
}

// Save user to Supabase database
function saveUser(user) {
    return new Promise(function(resolve, reject) {
        try {
            if (!user || !user.username || !user.email) {
                reject(new Error('Invalid user data - missing required fields'));
                return;
            }
            
            console.log('Attempting to save user to database:', user.username);
            
            UserOperations.create(user).then(function(savedUser) {
                console.log('User saved successfully to database:', savedUser.username);
                resolve(savedUser);
            }).catch(function(dbError) {
                console.error('Database operation failed:', dbError);
                if (dbError.message.indexOf('already exists') !== -1) {
                    reject(new Error('User with this username or email already exists'));
                } else {
                    reject(new Error('Database error: ' + dbError.message));
                }
            });
        } catch (error) {
            console.error('Error saving user:', error);
            reject(new Error('Failed to save user: ' + error.message));
        }
    });
}

// Find user by key (username or email) - maintained for compatibility
function findUserByKey(key) {
    return new Promise(function(resolve, reject) {
        try {
            if (!key) {
                console.log('No key provided for user lookup');
                resolve(null);
                return;
            }
            
            // Extract the actual login from the key format (remove prefix)
            let login = key;
            if (key.startsWith('user:')) {
                login = key.substring(5);
            } else if (key.startsWith('email:')) {
                login = key.substring(6);
            }
            
            console.log('Looking for user with key:', key, 'login:', login);
            
            UserOperations.findByLogin(login).then(function(user) {
                if (user) {
                    console.log('User found for key:', key);
                    // Convert database format to application format
                    const appUser = {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        passwordHash: user.password_hash,
                        emailVerified: user.email_verified,
                        createdAt: user.created_at,
                        failedLoginAttempts: user.failed_login_attempts
                    };
                    resolve(appUser);
                } else {
                    console.log('No user found for key:', key);
                    resolve(null);
                }
            }).catch(function(dbError) {
                console.error('Database error finding user by key:', key, dbError);
                resolve(null);
            });
        } catch (error) {
            console.error('Error finding user by key:', key, error);
            resolve(null);
        }
    });
}

// Create new user
function createUser(userData) {
    return new Promise(function(resolve, reject) {
        try {
            const username = userData.username;
            const email = userData.email;
            const password = userData.password;
            
            if (!username || !email || !password) {
                reject(new Error('Username, email, and password are required'));
                return;
            }
            
            console.log('Creating user in database:', { username: username, email: email });
            
            // Create user object in database format
            const user = {
                username: username.trim(),
                email: email.toLowerCase().trim(),
                passwordHash: hashPassword(password),
                emailVerified: false,
                createdAt: new Date().toISOString(),
                failedLoginAttempts: 0
            };

            console.log('Saving new user to database');
            saveUser(user).then(function(savedUser) {
                console.log('User created successfully:', savedUser.username);
                // Convert database format to application format
                const appUser = {
                    id: savedUser.id,
                    username: savedUser.username,
                    email: savedUser.email,
                    passwordHash: savedUser.password_hash,
                    emailVerified: savedUser.email_verified,
                    createdAt: savedUser.created_at,
                    failedLoginAttempts: savedUser.failed_login_attempts
                };
                resolve(appUser);
            }).catch(function(saveError) {
                reject(saveError);
            });
        } catch (error) {
            console.error('Error creating user:', error);
            reject(error);
        }
    });
}

// Find user by login (username or email)
function findUser(login) {
    return new Promise(function(resolve, reject) {
        try {
            if (!login) {
                resolve(null);
                return;
            }
            
            const lowerLogin = login.toLowerCase();
            console.log('Finding user with login:', lowerLogin);
            
            UserOperations.findByLogin(lowerLogin).then(function(user) {
                if (user) {
                    console.log('User found by login:', user.username);
                    // Convert database format to application format
                    const appUser = {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        passwordHash: user.password_hash,
                        emailVerified: user.email_verified,
                        createdAt: user.created_at,
                        failedLoginAttempts: user.failed_login_attempts
                    };
                    resolve(appUser);
                } else {
                    console.log('No user found for login:', lowerLogin);
                    resolve(null);
                }
            }).catch(function(dbError) {
                console.error('Database error finding user:', dbError);
                resolve(null);
            });
        } catch (error) {
            console.error('Error finding user:', error);
            resolve(null);
        }
    });
}

// Authenticate user with password
function authenticateUser(login, password) {
    return new Promise(function(resolve, reject) {
        try {
            if (!login || !password) {
                reject(new Error('Login and password are required'));
                return;
            }
            
            console.log('Authenticating user:', login);
            
            findUser(login).then(function(user) {
                if (!user) {
                    reject(new Error('Invalid credentials'));
                    return;
                }

                // Check password
                const hashedPassword = hashPassword(password);
                if (user.passwordHash !== hashedPassword) {
                    console.log('Password mismatch for user:', user.username);
                    reject(new Error('Invalid credentials'));
                    return;
                }

                console.log('Authentication successful for user:', user.username);
                resolve(user);
            }).catch(function(error) {
                reject(error);
            });
        } catch (error) {
            console.error('Authentication error:', error);
            reject(error);
        }
    });
}

// Get user by ID
function getUserById(id) {
    return new Promise(function(resolve, reject) {
        try {
            if (!id) {
                console.log('No ID provided for user lookup');
                resolve(null);
                return;
            }
            
            console.log('Getting user by ID:', id);
            
            UserOperations.findById(id).then(function(user) {
                if (user) {
                    console.log('User found by ID:', user.username);
                    // Convert database format to application format
                    const appUser = {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        passwordHash: user.password_hash,
                        emailVerified: user.email_verified,
                        createdAt: user.created_at,
                        failedLoginAttempts: user.failed_login_attempts
                    };
                    resolve(appUser);
                } else {
                    console.log('No user found with ID:', id);
                    resolve(null);
                }
            }).catch(function(dbError) {
                console.error('Database error finding user by ID:', dbError);
                resolve(null);
            });
        } catch (error) {
            console.error('Error finding user by ID:', error);
            resolve(null);
        }
    });
}

// Test database connectivity
function testDatabaseConnection() {
    return testConnection();
}

// Get CORS headers
function getCorsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };
}

// Export all functions
module.exports = {
    createJWT: createJWT,
    verifyJWT: verifyJWT,
    hashPassword: hashPassword,
    generateTokenPair: generateTokenPair,
    saveUser: saveUser,
    findUserByKey: findUserByKey,
    createUser: createUser,
    findUser: findUser,
    authenticateUser: authenticateUser,
    getUserById: getUserById,
    getCorsHeaders: getCorsHeaders,
    testDatabaseConnection: testDatabaseConnection,
    JWT_SECRET: EFFECTIVE_JWT_SECRET,
    REFRESH_SECRET: EFFECTIVE_REFRESH_SECRET
};