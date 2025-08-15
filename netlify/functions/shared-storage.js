// Simple shared storage utility for Netlify functions
// Uses file-based storage to persist data between function calls
// For production, replace with a proper database service

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-change-in-production';

// File-based storage paths
const STORAGE_DIR = '/tmp';
const USERS_FILE = path.join(STORAGE_DIR, 'users.json');
const TOKENS_FILE = path.join(STORAGE_DIR, 'refresh_tokens.json');

// Helper functions for file-based storage
function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
    return [];
}

function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error saving users:', error);
    }
}

function loadRefreshTokens() {
    try {
        if (fs.existsSync(TOKENS_FILE)) {
            const data = fs.readFileSync(TOKENS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading refresh tokens:', error);
    }
    return [];
}

function saveRefreshTokens(tokens) {
    try {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
    } catch (error) {
        console.error('Error saving refresh tokens:', error);
    }
}

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
    const accessToken = createJWT({ userId: user.id, username: user.username }, JWT_SECRET, '15m');
    const refreshToken = createJWT({ userId: user.id, type: 'refresh' }, REFRESH_SECRET, '7d');
    
    // Store refresh token
    const refreshTokens = loadRefreshTokens();
    refreshTokens.push({
        token: refreshToken,
        userId: user.id,
        createdAt: new Date(),
        revoked: false
    });
    saveRefreshTokens(refreshTokens);
    
    return { accessToken, refreshToken };
}

function createUser(userData) {
    const { username, email, password } = userData;
    const users = loadUsers();
    
    // Check if user already exists
    const existingUser = users.find(u => 
        u.username.toLowerCase() === username.toLowerCase() || 
        u.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
        throw new Error('User with this username or email already exists');
    }

    // Create new user
    const user = {
        id: users.length + 1,
        username: username.trim(),
        email: email.toLowerCase().trim(),
        passwordHash: hashPassword(password),
        emailVerified: false,
        createdAt: new Date().toISOString(),
        failedLoginAttempts: 0
    };

    users.push(user);
    saveUsers(users);
    return user;
}

function findUser(login) {
    const users = loadUsers();
    return users.find(u => 
        u.username.toLowerCase() === login.toLowerCase() || 
        u.email.toLowerCase() === login.toLowerCase()
    );
}

function authenticateUser(login, password) {
    const user = findUser(login);
    
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

function getUserById(id) {
    const users = loadUsers();
    return users.find(u => u.id === id);
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