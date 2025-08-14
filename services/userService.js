const db = require('../database/connection');
const { hashPassword, verifyPassword } = require('../utils/password');
const { validateSignup, sanitizeInput } = require('../utils/validation');
const { sendVerificationEmail } = require('./emailService');

const createUser = async (userData) => {
    const { username, email, password } = userData;
    
    // Sanitize inputs
    const cleanUsername = sanitizeInput(username);
    const cleanEmail = sanitizeInput(email.toLowerCase());
    
    // Validate inputs
    const validation = validateSignup(cleanUsername, cleanEmail, password);
    if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
    }

    // Check if user already exists
    const existingUser = db.prepare(`
        SELECT id FROM users WHERE username = ? OR email = ?
    `).get(cleanUsername, cleanEmail);

    if (existingUser) {
        throw new Error('User with this username or email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const insertUser = db.prepare(`
        INSERT INTO users (username, email, password_hash)
        VALUES (?, ?, ?)
    `);
    
    const result = insertUser.run(cleanUsername, cleanEmail, passwordHash);
    const userId = result.lastInsertRowid;

    // Send verification email
    try {
        await sendVerificationEmail(cleanEmail, userId);
    } catch (error) {
        console.error('Failed to send verification email:', error);
        // Don't fail user creation if email fails
    }

    // Return user without password
    const user = db.prepare(`
        SELECT id, username, email, email_verified, created_at, failed_login_attempts
        FROM users WHERE id = ?
    `).get(userId);

    return user;
};

const authenticateUser = async (login, password) => {
    const cleanLogin = sanitizeInput(login.toLowerCase());
    
    // Find user by username or email
    const user = db.prepare(`
        SELECT * FROM users 
        WHERE (username = ? OR email = ?) AND locked_until < datetime('now', 'localtime')
    `).get(cleanLogin, cleanLogin);

    if (!user) {
        throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const lockTimeRemaining = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / (1000 * 60));
        throw new Error(`Account is locked. Try again in ${lockTimeRemaining} minutes.`);
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    
    if (!isPasswordValid) {
        // Increment failed attempts
        const newFailedAttempts = user.failed_login_attempts + 1;
        let lockUntil = null;
        
        if (newFailedAttempts >= 5) {
            // Lock account for 15 minutes
            lockUntil = new Date();
            lockUntil.setMinutes(lockUntil.getMinutes() + 15);
        }

        db.prepare(`
            UPDATE users 
            SET failed_login_attempts = ?, locked_until = ?
            WHERE id = ?
        `).run(newFailedAttempts, lockUntil?.toISOString(), user.id);

        if (lockUntil) {
            throw new Error('Too many failed attempts. Account locked for 15 minutes.');
        }
        
        throw new Error('Invalid credentials');
    }

    // Reset failed attempts and update last login
    db.prepare(`
        UPDATE users 
        SET failed_login_attempts = 0, locked_until = NULL, last_login = datetime('now', 'localtime')
        WHERE id = ?
    `).run(user.id);

    // Return user without password
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

const getUserById = (id) => {
    const user = db.prepare(`
        SELECT id, username, email, email_verified, created_at, last_login, failed_login_attempts
        FROM users WHERE id = ?
    `).get(id);
    
    return user || null;
};

const updateUserPassword = async (userId, newPassword) => {
    const passwordHash = await hashPassword(newPassword);
    
    db.prepare(`
        UPDATE users 
        SET password_hash = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
    `).run(passwordHash, userId);
    
    // Revoke all existing refresh tokens
    db.prepare('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?').run(userId);
};

module.exports = {
    createUser,
    authenticateUser,
    getUserById,
    updateUserPassword
};