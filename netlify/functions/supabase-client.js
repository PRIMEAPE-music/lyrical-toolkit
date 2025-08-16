// Supabase client configuration for Netlify functions
const { createClient } = require('@supabase/supabase-js');

// Environment variable validation
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Validate required environment variables
function validateEnvironment() {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.NETLIFY;
    
    if (!SUPABASE_URL) {
        throw new Error('SUPABASE_URL environment variable is required');
    }
    
    if (!SUPABASE_SERVICE_KEY) {
        throw new Error('SUPABASE_SERVICE_KEY environment variable is required');
    }
    
    // Validate URL format
    try {
        new URL(SUPABASE_URL);
    } catch (error) {
        throw new Error('SUPABASE_URL must be a valid URL');
    }
    
    // Validate service key format (should start with 'eyJ' for JWT)
    if (!SUPABASE_SERVICE_KEY.startsWith('eyJ')) {
        console.warn('SUPABASE_SERVICE_KEY does not appear to be a valid JWT token');
    }
    
    console.log('Supabase environment variables validated successfully');
}

// Initialize Supabase client with error handling
let supabaseClient = null;

function getSupabaseClient() {
    if (supabaseClient) {
        return supabaseClient;
    }
    
    try {
        validateEnvironment();
        
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            },
            db: {
                schema: 'public'
            }
        });
        
        console.log('Supabase client initialized successfully');
        return supabaseClient;
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        throw error;
    }
}

// Test database connectivity
function testConnection() {
    return new Promise(function(resolve, reject) {
        try {
            const client = getSupabaseClient();
            
            // Test connection with a simple query
            client
                .from('users')
                .select('count')
                .limit(1)
                .then(function(response) {
                    if (response.error) {
                        console.error('Supabase connection test failed:', response.error);
                        reject(new Error('Database connection failed: ' + response.error.message));
                    } else {
                        console.log('Supabase connection test successful');
                        resolve(true);
                    }
                })
                .catch(function(error) {
                    console.error('Supabase connection error:', error);
                    reject(new Error('Database connection error: ' + error.message));
                });
        } catch (error) {
            console.error('Failed to test Supabase connection:', error);
            reject(error);
        }
    });
}

// Users table operations
const UserOperations = {
    // Create a new user
    create: function(userData) {
        return new Promise(function(resolve, reject) {
            try {
                const client = getSupabaseClient();
                
                const userRecord = {
                    username: userData.username,
                    email: userData.email,
                    password_hash: userData.passwordHash,
                    email_verified: userData.emailVerified || false,
                    failed_login_attempts: userData.failedLoginAttempts || 0,
                    created_at: userData.createdAt || new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                client
                    .from('users')
                    .insert([userRecord])
                    .select()
                    .then(function(response) {
                        if (response.error) {
                            console.error('User creation failed:', response.error);
                            
                            // Handle unique constraint violations
                            if (response.error.code === '23505') {
                                reject(new Error('User with this username or email already exists'));
                            } else {
                                reject(new Error('Database error: ' + response.error.message));
                            }
                        } else if (response.data && response.data.length > 0) {
                            console.log('User created successfully:', response.data[0].username);
                            resolve(response.data[0]);
                        } else {
                            reject(new Error('User creation failed: No data returned'));
                        }
                    })
                    .catch(function(error) {
                        console.error('User creation error:', error);
                        reject(new Error('Database operation failed: ' + error.message));
                    });
            } catch (error) {
                console.error('Failed to create user:', error);
                reject(error);
            }
        });
    },
    
    // Find user by username or email
    findByLogin: function(login) {
        return new Promise(function(resolve, reject) {
            try {
                const client = getSupabaseClient();
                
                client
                    .from('users')
                    .select('*')
                    .or('username.eq.' + login + ',email.eq.' + login)
                    .limit(1)
                    .then(function(response) {
                        if (response.error) {
                            console.error('User lookup failed:', response.error);
                            reject(new Error('Database error: ' + response.error.message));
                        } else if (response.data && response.data.length > 0) {
                            console.log('User found by login:', response.data[0].username);
                            resolve(response.data[0]);
                        } else {
                            console.log('No user found for login:', login);
                            resolve(null);
                        }
                    })
                    .catch(function(error) {
                        console.error('User lookup error:', error);
                        reject(new Error('Database operation failed: ' + error.message));
                    });
            } catch (error) {
                console.error('Failed to find user by login:', error);
                reject(error);
            }
        });
    },
    
    // Find user by ID
    findById: function(id) {
        return new Promise(function(resolve, reject) {
            try {
                const client = getSupabaseClient();
                
                client
                    .from('users')
                    .select('*')
                    .eq('id', id)
                    .limit(1)
                    .then(function(response) {
                        if (response.error) {
                            console.error('User lookup by ID failed:', response.error);
                            reject(new Error('Database error: ' + response.error.message));
                        } else if (response.data && response.data.length > 0) {
                            console.log('User found by ID:', response.data[0].username);
                            resolve(response.data[0]);
                        } else {
                            console.log('No user found with ID:', id);
                            resolve(null);
                        }
                    })
                    .catch(function(error) {
                        console.error('User lookup by ID error:', error);
                        reject(new Error('Database operation failed: ' + error.message));
                    });
            } catch (error) {
                console.error('Failed to find user by ID:', error);
                reject(error);
            }
        });
    },
    
    // Update user (for future use)
    update: function(id, updateData) {
        return new Promise(function(resolve, reject) {
            try {
                const client = getSupabaseClient();
                
                const updateRecord = Object.assign({}, updateData, {
                    updated_at: new Date().toISOString()
                });
                
                client
                    .from('users')
                    .update(updateRecord)
                    .eq('id', id)
                    .select()
                    .then(function(response) {
                        if (response.error) {
                            console.error('User update failed:', response.error);
                            reject(new Error('Database error: ' + response.error.message));
                        } else if (response.data && response.data.length > 0) {
                            console.log('User updated successfully:', response.data[0].username);
                            resolve(response.data[0]);
                        } else {
                            reject(new Error('User update failed: No data returned'));
                        }
                    })
                    .catch(function(error) {
                        console.error('User update error:', error);
                        reject(new Error('Database operation failed: ' + error.message));
                    });
            } catch (error) {
                console.error('Failed to update user:', error);
                reject(error);
            }
        });
    }
};

// Export functions and client
module.exports = {
    getSupabaseClient: getSupabaseClient,
    testConnection: testConnection,
    UserOperations: UserOperations,
    validateEnvironment: validateEnvironment
};