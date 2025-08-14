const jwt = require('jsonwebtoken');
const db = require('../database/connection');
const { generateSecureToken } = require('../utils/password');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const generateTokenPair = async (user) => {
    const payload = {
        userId: user.id,
        username: user.username,
        email: user.email
    };

    // Generate access token
    const accessToken = jwt.sign(payload, JWT_SECRET, { 
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'lyrical-toolkit',
        audience: 'lyrical-toolkit-users'
    });

    // Generate refresh token
    const refreshTokenValue = generateSecureToken();
    const refreshToken = jwt.sign(
        { tokenId: refreshTokenValue, userId: user.id }, 
        JWT_REFRESH_SECRET, 
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const insertRefreshToken = db.prepare(`
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
    `);
    
    insertRefreshToken.run(user.id, refreshTokenValue, expiresAt.toISOString());

    // Clean up expired tokens for this user
    const cleanupTokens = db.prepare(`
        DELETE FROM refresh_tokens 
        WHERE user_id = ? AND (expires_at < datetime('now') OR revoked = TRUE)
    `);
    cleanupTokens.run(user.id);

    return { accessToken, refreshToken };
};

const verifyAccessToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return {
            userId: decoded.userId,
            username: decoded.username,
            email: decoded.email
        };
    } catch (error) {
        return null;
    }
};

const verifyRefreshToken = async (token) => {
    try {
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
        
        // Check if refresh token exists and is valid in database
        const storedToken = db.prepare(`
            SELECT user_id, expires_at, revoked 
            FROM refresh_tokens 
            WHERE token = ?
        `).get(decoded.tokenId);

        if (!storedToken || storedToken.revoked) {
            return null;
        }

        if (new Date(storedToken.expires_at) < new Date()) {
            // Token expired, clean it up
            db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(decoded.tokenId);
            return null;
        }

        return storedToken.user_id;
    } catch (error) {
        return null;
    }
};

const revokeRefreshToken = (tokenId) => {
    db.prepare('UPDATE refresh_tokens SET revoked = TRUE WHERE token = ?').run(tokenId);
};

const revokeAllUserTokens = (userId) => {
    db.prepare('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?').run(userId);
};

module.exports = {
    generateTokenPair,
    verifyAccessToken,
    verifyRefreshToken,
    revokeRefreshToken,
    revokeAllUserTokens
};