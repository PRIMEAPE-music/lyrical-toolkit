// Persistent authentication for Netlify functions using Blobs storage
const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-change-in-production';

// Initialize Blobs store for user data
const isProduction = process.env.NODE_ENV === 'production';
const userStore = getStore({
    name: 'user-data',
    deployId: isProduction ? undefined : process.env.DEPLOY_ID
});

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

function verifyJWT(token, secret) {
    try {
        const [header, payload, signature] = token.split('.');
        
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(`${header}.${payload}`)
            .digest('base64url');
            
        if (signature !== expectedSignature) {
            throw new Error('Invalid signature');
        }
        
        const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
        
        if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
            throw new Error('Token expired');
        }
        
        return decodedPayload;
    } catch (error) {
        throw new Error('Invalid token');
    }
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateTokenPair(user) {
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

// Helper functions for user storage in Blobs
async function saveUser(user) {
    try {
        // Store by username and email for lookup
        const userKey = `user:${user.username.toLowerCase()}`;
        const emailKey = `email:${user.email.toLowerCase()}`;
        
        await Promise.all([
            userStore.set(userKey, JSON.stringify(user)),
            userStore.set(emailKey, JSON.stringify(user))
        ]);
        
        return user;
    } catch (error) {
        console.error('Error saving user:', error);
        throw new Error('Failed to save user');
    }
}

async function findUserByKey(key) {
    try {
        const userData = await userStore.get(key, { type: 'text' });
        if (userData) {
            return JSON.parse(userData);
        }
        return null;
    } catch (error) {
        console.error('Error finding user:', error);
        return null;
    }
}

async function createUser(userData) {
    const { username, email, password } = userData;
    
    // Check if user already exists
    const existingUserByUsername = await findUserByKey(`user:${username.toLowerCase()}`);
    const existingUserByEmail = await findUserByKey(`email:${email.toLowerCase()}`);
    
    if (existingUserByUsername || existingUserByEmail) {
        throw new Error('User with this username or email already exists');
    }

    // Create new user
    const user = {
        id: Date.now().toString(),
        username: username.trim(),
        email: email.toLowerCase().trim(),
        passwordHash: hashPassword(password),
        emailVerified: false,
        createdAt: new Date().toISOString(),
        failedLoginAttempts: 0
    };

    await saveUser(user);
    return user;
}

async function findUser(login) {
    const lowerLogin = login.toLowerCase();
    
    // Try to find by username first
    let user = await findUserByKey(`user:${lowerLogin}`);
    if (user) return user;
    
    // Try to find by email
    user = await findUserByKey(`email:${lowerLogin}`);
    return user;
}

async function authenticateUser(login, password) {
    const user = await findUser(login);
    
    if (!user) {
        throw new Error('Invalid credentials');
    }

    // Check password
    const hashedPassword = hashPassword(password);
    if (user.passwordHash !== hashedPassword) {
        throw new Error('Invalid credentials');
    }

    return user;
}

async function getUserById(id) {
    // For our system, we'll search by ID which could be stored separately
    // For now, let's search through existing user keys
    try {
        const userList = await userStore.list({ prefix: 'user:' });
        for (const { key } of userList.blobs) {
            const user = await findUserByKey(key);
            if (user && user.id === id) {
                return user;
            }
        }
        return null;
    } catch (error) {
        console.error('Error finding user by ID:', error);
        return null;
    }
}

function getCorsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };
}

module.exports = {
    createJWT,
    verifyJWT,
    hashPassword,
    generateTokenPair,
    createUser,
    findUser,
    authenticateUser,
    getUserById,
    getCorsHeaders,
    JWT_SECRET,
    REFRESH_SECRET
};