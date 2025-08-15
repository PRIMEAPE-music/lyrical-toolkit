// Persistent authentication for Netlify functions using Blobs storage
const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

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

// Lazy initialization function for Blobs stores
function getBlobsStore(storeName) {
    try {
        return getStore(storeName);
    } catch (error) {
        console.error('Failed to initialize Blobs store "' + storeName + '":', error);
        return null;
    }
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

// Save user to Blobs storage with robust error handling
function saveUser(user) {
    return new Promise(function(resolve, reject) {
        try {
            if (!user || !user.username || !user.email) {
                reject(new Error('Invalid user data - missing required fields'));
                return;
            }
            
            const userStore = getBlobsStore('user-data');
            if (!userStore) {
                reject(new Error('Blobs storage not available - cannot save user'));
                return;
            }
            
            console.log('Attempting to save user:', user.username);
            
            const userKey = 'user:' + user.username.toLowerCase();
            const emailKey = 'email:' + user.email.toLowerCase();
            
            console.log('Saving with keys:', { userKey: userKey, emailKey: emailKey });
            
            Promise.all([
                userStore.set(userKey, JSON.stringify(user)),
                userStore.set(emailKey, JSON.stringify(user))
            ]).then(function() {
                console.log('User saved successfully to Blobs storage:', user.username);
                resolve(user);
            }).catch(function(blobError) {
                console.error('Blobs storage operation failed:', blobError);
                reject(new Error('Blobs storage operation failed: ' + blobError.message));
            });
        } catch (error) {
            console.error('Error saving user:', error);
            if (error.message.indexOf('Blobs') !== -1) {
                reject(error); // Re-throw Blobs-specific errors
            } else {
                reject(new Error('Failed to save user: ' + error.message));
            }
        }
    });
}

// Find user by key in Blobs storage with enhanced error handling
function findUserByKey(key) {
    return new Promise(function(resolve, reject) {
        try {
            if (!key) {
                console.log('No key provided for user lookup');
                resolve(null);
                return;
            }
            
            const userStore = getBlobsStore('user-data');
            if (!userStore) {
                console.error('Blobs storage not available - cannot find user');
                resolve(null);
                return;
            }
            
            console.log('Looking for user with key:', key);
            
            userStore.get(key, { type: 'text' }).then(function(userData) {
                if (userData) {
                    console.log('User found for key:', key);
                    try {
                        resolve(JSON.parse(userData));
                    } catch (parseError) {
                        console.error('Failed to parse user data for key:', key, parseError);
                        resolve(null);
                    }
                } else {
                    console.log('No user found for key:', key);
                    resolve(null);
                }
            }).catch(function(blobError) {
                console.error('Blobs storage get operation failed for key:', key, blobError);
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
            
            console.log('Creating user:', { username: username, email: email });
            
            // Check if user already exists
            Promise.all([
                findUserByKey('user:' + username.toLowerCase()),
                findUserByKey('email:' + email.toLowerCase())
            ]).then(function(results) {
                const existingUserByUsername = results[0];
                const existingUserByEmail = results[1];
                
                if (existingUserByUsername || existingUserByEmail) {
                    reject(new Error('User with this username or email already exists'));
                    return;
                }

                // Create new user object
                const user = {
                    id: Date.now().toString(),
                    username: username.trim(),
                    email: email.toLowerCase().trim(),
                    passwordHash: hashPassword(password),
                    emailVerified: false,
                    createdAt: new Date().toISOString(),
                    failedLoginAttempts: 0
                };

                console.log('Saving new user to Blobs storage');
                saveUser(user).then(function(savedUser) {
                    console.log('User created successfully:', savedUser.username);
                    resolve(savedUser);
                }).catch(function(saveError) {
                    reject(saveError);
                });
            }).catch(function(error) {
                reject(error);
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
            
            // Try to find by username first
            findUserByKey('user:' + lowerLogin).then(function(user) {
                if (user) {
                    console.log('User found by username:', user.username);
                    resolve(user);
                    return;
                }
                
                // Try to find by email
                findUserByKey('email:' + lowerLogin).then(function(userByEmail) {
                    if (userByEmail) {
                        console.log('User found by email:', userByEmail.username);
                    } else {
                        console.log('No user found for login:', lowerLogin);
                    }
                    resolve(userByEmail);
                }).catch(function(error) {
                    resolve(null);
                });
            }).catch(function(error) {
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

// Get user by ID with enhanced Blobs error handling
function getUserById(id) {
    return new Promise(function(resolve, reject) {
        try {
            if (!id) {
                console.log('No ID provided for user lookup');
                resolve(null);
                return;
            }
            
            const userStore = getBlobsStore('user-data');
            if (!userStore) {
                console.error('Blobs storage not available - cannot get user by ID');
                resolve(null);
                return;
            }
            
            console.log('Getting user by ID:', id);
            
            userStore.list({ prefix: 'user:' }).then(function(userList) {
                if (!userList || !userList.blobs) {
                    console.log('No users found in Blobs storage');
                    resolve(null);
                    return;
                }
                
                const promises = [];
                const keys = [];
                
                for (let i = 0; i < userList.blobs.length; i++) {
                    const key = userList.blobs[i].key;
                    keys.push(key);
                    promises.push(findUserByKey(key));
                }
                
                Promise.all(promises).then(function(users) {
                    for (let i = 0; i < users.length; i++) {
                        const user = users[i];
                        if (user && user.id === id) {
                            console.log('User found by ID:', user.username);
                            resolve(user);
                            return;
                        }
                    }
                    
                    console.log('No user found with ID:', id);
                    resolve(null);
                }).catch(function(error) {
                    console.error('Error processing user list:', error);
                    resolve(null);
                });
            }).catch(function(blobError) {
                console.error('Blobs storage list operation failed:', blobError);
                resolve(null);
            });
        } catch (error) {
            console.error('Error finding user by ID:', error);
            resolve(null);
        }
    });
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
    JWT_SECRET: EFFECTIVE_JWT_SECRET,
    REFRESH_SECRET: EFFECTIVE_REFRESH_SECRET
};