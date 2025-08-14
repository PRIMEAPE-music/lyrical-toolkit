const validateEmail = (email) => {
    const errors = [];
    
    if (!email) {
        errors.push('Email is required');
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errors.push('Please enter a valid email address');
        }
        if (email.length > 255) {
            errors.push('Email must be less than 255 characters');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

const validateUsername = (username) => {
    const errors = [];
    
    if (!username) {
        errors.push('Username is required');
    } else {
        if (username.length < 3) {
            errors.push('Username must be at least 3 characters long');
        }
        if (username.length > 50) {
            errors.push('Username must be less than 50 characters');
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            errors.push('Username can only contain letters, numbers, underscores, and hyphens');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

const validatePassword = (password) => {
    const errors = [];
    
    if (!password) {
        errors.push('Password is required');
    } else {
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        if (password.length > 128) {
            errors.push('Password must be less than 128 characters');
        }
        if (!/(?=.*[a-z])/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!/(?=.*[A-Z])/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!/(?=.*\d)/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

const sanitizeInput = (input) => {
    return input.trim().replace(/[<>]/g, '');
};

const validateSignup = (username, email, password) => {
    const errors = [];
    
    const usernameResult = validateUsername(username);
    const emailResult = validateEmail(email);
    const passwordResult = validatePassword(password);
    
    errors.push(...usernameResult.errors);
    errors.push(...emailResult.errors);
    errors.push(...passwordResult.errors);
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = {
    validateEmail,
    validateUsername,
    validatePassword,
    sanitizeInput,
    validateSignup
};