const { getCorsHeaders, testDatabaseConnection } = require('./shared-storage');

exports.handler = async (event, context) => {
    const headers = getCorsHeaders();
    
    console.log(`[HEALTH] ${event.httpMethod} request received`);

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        console.warn(`[HEALTH] Invalid method: ${event.httpMethod}`);
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    const healthStatus = {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        checks: {},
        environment: {
            hasJwtSecret: !!process.env.JWT_SECRET,
            hasRefreshSecret: !!process.env.REFRESH_SECRET,
            nodeVersion: process.version,
            platform: process.platform
        }
    };

    // Check environment variables
    console.log('[HEALTH] Checking environment variables');
    const isProduction = process.env.NODE_ENV === 'production' || process.env.NETLIFY;
    const jwtSecretConfigured = !!process.env.JWT_SECRET && process.env.JWT_SECRET !== 'your-secret-key-change-in-production';
    const refreshSecretConfigured = !!process.env.REFRESH_SECRET && process.env.REFRESH_SECRET !== 'your-refresh-secret-change-in-production';
    
    healthStatus.checks.environment = {
        status: 'pass',
        isProduction,
        jwtSecretConfigured,
        refreshSecretConfigured,
        nodeVersion: process.version,
        platform: process.platform
    };

    if (isProduction && (!jwtSecretConfigured || !refreshSecretConfigured)) {
        healthStatus.checks.environment.status = 'fail';
        healthStatus.checks.environment.message = 'Production environment detected but secrets are not properly configured';
        healthStatus.status = 'unhealthy';
    } else if (!jwtSecretConfigured || !refreshSecretConfigured) {
        healthStatus.checks.environment.status = 'warn';
        healthStatus.checks.environment.message = 'Environment variables are using default values - not secure for production';
    }

    // Check Supabase database connectivity
    console.log('[HEALTH] Checking Supabase database connectivity');
    try {
        await testDatabaseConnection();
        
        console.log('[HEALTH] Database connection test successful');
        healthStatus.checks.database = {
            status: 'pass',
            message: 'Supabase database connection successful',
            provider: 'Supabase'
        };
        
    } catch (dbError) {
        console.error('[HEALTH] Database connectivity check failed:', dbError);
        healthStatus.checks.database = {
            status: 'fail',
            error: dbError.message,
            message: 'Supabase database service is not accessible',
            provider: 'Supabase'
        };
        healthStatus.status = 'degraded';
    }

    // Check Supabase environment variables
    console.log('[HEALTH] Checking Supabase environment variables');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    healthStatus.checks.supabaseConfig = {
        status: 'pass',
        supabaseUrlConfigured: !!supabaseUrl,
        supabaseKeyConfigured: !!supabaseKey,
        supabaseUrlValid: false
    };
    
    if (!supabaseUrl || !supabaseKey) {
        healthStatus.checks.supabaseConfig.status = 'fail';
        healthStatus.checks.supabaseConfig.message = 'Supabase environment variables not configured';
        healthStatus.status = 'unhealthy';
    } else {
        try {
            new URL(supabaseUrl);
            healthStatus.checks.supabaseConfig.supabaseUrlValid = true;
        } catch (urlError) {
            healthStatus.checks.supabaseConfig.status = 'fail';
            healthStatus.checks.supabaseConfig.message = 'Invalid SUPABASE_URL format';
            healthStatus.status = 'unhealthy';
        }
    }

    // Overall health status
    const failedChecks = Object.values(healthStatus.checks).filter(check => check.status === 'fail');
    const warnChecks = Object.values(healthStatus.checks).filter(check => check.status === 'warn');
    
    if (failedChecks.length > 0) {
        healthStatus.status = 'unhealthy';
    } else if (warnChecks.length > 0) {
        healthStatus.status = 'degraded';
    }

    // Determine HTTP status code
    let httpStatusCode;
    switch (healthStatus.status) {
        case 'healthy':
            httpStatusCode = 200;
            break;
        case 'degraded':
            httpStatusCode = 200; // Still operational
            break;
        case 'unhealthy':
            httpStatusCode = 503;
            break;
        default:
            httpStatusCode = 500;
    }

    // Add setup instructions for failed checks
    if (healthStatus.status === 'unhealthy' || healthStatus.status === 'degraded') {
        healthStatus.setupInstructions = {
            supabaseSetup: 'Create a Supabase project and configure SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables',
            databaseSchema: 'Ensure the users table exists with columns: id (UUID), username, email, password_hash, email_verified, failed_login_attempts, created_at, updated_at',
            environmentVariables: 'Set JWT_SECRET, REFRESH_SECRET, SUPABASE_URL, and SUPABASE_SERVICE_KEY in your Netlify site environment variables',
            troubleshooting: 'Check the Netlify function logs for detailed error messages'
        };
    }
    
    console.log('[HEALTH] Health check completed:', {
        status: healthStatus.status,
        httpStatusCode,
        checksCount: Object.keys(healthStatus.checks).length
    });

    return {
        statusCode: httpStatusCode,
        headers,
        body: JSON.stringify(healthStatus)
    };
};