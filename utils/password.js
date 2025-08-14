const bcrypt = require('bcrypt');
const crypto = require('crypto');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

const hashPassword = async (password) => {
    try {
        return await bcrypt.hash(password, SALT_ROUNDS);
    } catch (error) {
        throw new Error('Failed to hash password');
    }
};

const verifyPassword = async (password, hash) => {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        return false;
    }
};

const generateSecureToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

module.exports = {
    hashPassword,
    verifyPassword,
    generateSecureToken
};