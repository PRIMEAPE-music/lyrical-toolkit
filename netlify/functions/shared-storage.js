// Persistent authentication for Netlify functions using Blobs storage
const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-change-in-production';

// Initialize Blobs store for user data
const userStore = getStore('user-data');

// Create JWT token
function createJWT(payload, secret, expiresIn = '15m') {
    const header = { typ: 'JWT', alg: 'HS256' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    
    const now = Math.floor(Date.now() / 1000);
    const exp = expiresIn === '15m' ? now + 900 : now + 604800; // 15 min or 7 days
    
    const payloadWithExp = { ...payload, exp, iat: now };
    const encodedPayload = Buffer.from(JSON.stringify(payloadWithExp)).toString('base64url');
    
    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Verify JWT token - COMPLETE IMPLEMENTATION
function verifyJWT(token, secret) {
    try {
        if (!token) {
            throw new Error('Token is required');
        }
        
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid token format');
        }
        
        const [header, payload, signature] = parts;
        
        // Verify signature
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(`${header}.${payload}`)
            .digest('base64url');
            
        if (signature !== expectedSignature) {
            throw new Error('Invalid signature');
        }
        
        // Decode payload
        let decodedPayload;
        try {
            decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
        } catch (error) {
            throw new Error('Invalid token payload');
        }
        
        // Check expiration
        if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
            throw new Error('Token expired');
        }
        
        return decodedPayload;
    } catch (error) {
        throw new Error(`Token verification failed: ${error.message}`);
    }
}

// Hash password
function hashPassword(password) {
    if (!password) {
        throw new Error('Password is required');
    }
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate token pair for user
function generateTokenPair(user) {
    if (!user || !user.id || !user.username || !user.email) {
        throw new Error('Invalid user data for token generation');
    }
    
    const accessToken = createJWT({ 
        userId: user.id, 
        username: user.username,
        email: user.email
    }, JWT_SECRET, '15m');
    
    const refreshToken = createJWT({ 
        userId: user.id, 
        username: user.username,
        type: 'refresh' 
    }, REFRESH_SECRET, '7d');
    
    return { accessToken, refreshToken };
}

// Save user to Blobs storage
async function saveUser(user) {
    try {
        if (!user || !user.username || !user.email) {
            throw new Error('Invalid user data');
        }
        
        console.log('Attempting to save user:', user.username);
        
        const userKey = `user:${user.username.toLowerCase()}`;
        const emailKey = `email:${user.email.toLowerCase()}`;
        
        console.log('Saving with keys:', { userKey, emailKey });
        
        // Save user data with both username and email keys for lookup
        await Promise.all([
            userStore.set(userKey, JSON.stringify(user)),
            userStore.set(emailKey, JSON.stringify(user))
        ]);
        
        console.log('User saved successfully:', user.username);
        return user;
    } catch (error) {
        console.error('Error saving user:', error);
        throw new Error(`Failed to save user: ${error.message}`);
    }
}

// Find user by key in Blobs storage
async function findUserByKey(key) {
    try {
        if (!key) {
            return null;
        }
        
        console.log('Looking for user with key:', key);
        const userData = await userStore.get(key, { type: 'text' });
        
        if (userData) {
            console.log('User found for key:', key);
            return JSON.parse(userData);
        }
        
        console.log('No user found for key:', key);
        return null;
    } catch (error) {
        console.error('Error finding user by key:', key, error);
        return null;
    }
}

// Create new user
async function createUser(userData) {
    try {
        const { username, email, password } = userData;
        
        if (!username || !email || !password) {
            throw new Error('Username, email, and password are required');
        }
        
        console.log('Creating user:', { username, email });
        
        // Check if user already exists
        const existingUserByUsername = await findUserByKey(`user:${username.toLowerCase()}`);
        const existingUserByEmail = await findUserByKey(`email:${email.toLowerCase()}`);
        
        if (existingUserByUsername || existingUserByEmail) {
            throw new Error('User with this username or email already exists');
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
        await saveUser(user);
        console.log('User created successfully:', user.username);
        
        return user;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

// Find user by login (username or email)
async function findUser(login) {
    try {
        if (!login) {
            return null;
        }
        
        const lowerLogin = login.toLowerCase();
        console.log('Finding user with login:', lowerLogin);
        
        // Try to find by username first
        let user = await findUserByKey(`user:${lowerLogin}`);
        if (user) {
            console.log('User found by username:', user.username);
            return user;
        }
        
        // Try to find by email
        user = await findUserByKey(`email:${lowerLogin}`);
        if (user) {
            console.log('User found by email:', user.username);
        } else {
            console.log('No user found for login:', lowerLogin);
        }
        
        return user;
    } catch (error) {
        console.error('Error finding user:', error);
        return null;
    }
}

// Authenticate user with password
async function authenticateUser(login, password) {
    try {
        if (!login || !password) {
            throw new Error('Login and password are required');
        }
        
        console.log('Authenticating user:', login);
        
        const user = await findUser(login);
        
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Check password
        const hashedPassword = hashPassword(password);
        if (user.passwordHash !== hashedPassword) {
            console.log('Password mismatch for user:', user.username);
            throw new Error('Invalid credentials');
        }

        console.log('Authentication successful for user:', user.username);
        return user;
    } catch (error) {
        console.error('Authentication error:', error);
        throw error;
    }
}

// Get user by ID
async function getUserById(id) {
    try {
        if (!id) {
            return null;
        }
        
        console.log('Getting user by ID:', id);
        
        // Search through user keys to find matching ID
        const userList = await userStore.list({ prefix: 'user:' });
        
        for (const { key } of userList.blobs) {
            const user = await findUserByKey(key);
            if (user && user.id === id) {
                console.log('User found by ID:', user.username);
                return user;
            }
        }
        
        console.log('No user found with ID:', id);
        return null;
    } catch (error) {
        console.error('Error finding user by ID:', error);
        return null;
    }
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
    createJWT,
    verifyJWT,
    hashPassword,
    generateTokenPair,
    saveUser,
    findUserByKey,
    createUser,
    findUser,
    authenticateUser,
    getUserById,
    getCorsHeaders,
    JWT_SECRET,
    REFRESH_SECRET
};