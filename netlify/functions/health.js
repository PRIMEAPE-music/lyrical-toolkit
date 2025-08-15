const { getCorsHeaders } = require('./shared-storage');
const { getStore } = require('@netlify/blobs');

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

    // Check Netlify Blobs connectivity
    console.log('[HEALTH] Checking Netlify Blobs connectivity');
    try {
        const testStore = getStore('health-check');
        
        // Test write operation
        const testKey = `health-test-${Date.now()}`;
        const testData = JSON.stringify({ 
            test: true, 
            timestamp: new Date().toISOString() 
        });
        
        await testStore.set(testKey, testData);
        console.log('[HEALTH] Blobs write test successful');
        
        // Test read operation
        const retrievedData = await testStore.get(testKey, { type: 'text' });
        if (retrievedData && JSON.parse(retrievedData).test === true) {
            console.log('[HEALTH] Blobs read test successful');
            healthStatus.checks.blobsStorage = {
                status: 'pass',
                message: 'Netlify Blobs read/write operations successful'
            };
        } else {
            throw new Error('Data integrity check failed');
        }
        
        // Test list operation
        const listResult = await testStore.list({ prefix: 'health-test' });
        if (listResult && Array.isArray(listResult.blobs)) {
            console.log('[HEALTH] Blobs list test successful');
            healthStatus.checks.blobsStorage.listOperation = 'pass';
        } else {
            healthStatus.checks.blobsStorage.listOperation = 'fail';
        }
        
        // Clean up test data
        await testStore.delete(testKey);
        console.log('[HEALTH] Test data cleanup successful');
        
    } catch (blobsError) {
        console.error('[HEALTH] Blobs connectivity check failed:', blobsError);
        healthStatus.checks.blobsStorage = {
            status: 'fail',
            error: blobsError.message,
            message: 'Netlify Blobs service is not accessible'
        };
        healthStatus.status = 'degraded';
    }

    // Check user store connectivity (actual production store)
    console.log('[HEALTH] Checking user data store connectivity');
    try {
        const userStore = getStore('user-data');
        
        // Test list operation without creating data
        const userList = await userStore.list({ limit: 1 });
        if (userList && typeof userList.blobs !== 'undefined') {
            console.log('[HEALTH] User store connectivity successful');
            healthStatus.checks.userStore = {
                status: 'pass',
                message: 'User data store is accessible',
                userCount: userList.blobs ? userList.blobs.length : 0
            };
        } else {
            throw new Error('User store list operation returned unexpected format');
        }
        
    } catch (userStoreError) {
        console.error('[HEALTH] User store connectivity check failed:', userStoreError);
        healthStatus.checks.userStore = {
            status: 'fail',
            error: userStoreError.message,
            message: 'User data store is not accessible'
        };
        healthStatus.status = 'degraded';
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
            blobsSetup: 'Ensure Netlify Blobs is enabled in your site settings under Functions > Blobs',
            environmentVariables: 'Set JWT_SECRET and REFRESH_SECRET in your Netlify site environment variables',
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