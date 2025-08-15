# Netlify Authentication System Setup Guide

This guide covers the setup and troubleshooting of the Netlify authentication system for the Lyrical Toolkit application.

## ✅ Fixed Issues

The following 502 errors have been resolved:

1. **Environment Variables**: Proper validation and fallback handling
2. **Netlify Blobs Error Handling**: Comprehensive error handling for all Blobs operations
3. **Authentication Function Robustness**: Enhanced error handling in all auth functions
4. **JWT Token Implementation**: Fixed base64url compatibility for older Node.js versions
5. **CORS Headers**: Consistent headers across all functions
6. **Import/Export Consistency**: Fixed all module import/export issues
7. **Module-Level getStore() Calls**: Moved to lazy initialization within functions

## 🚀 Required Setup Steps

### 1. Enable Netlify Blobs

1. Go to your Netlify site dashboard
2. Navigate to **Site configuration** > **Functions**
3. Under **Blobs**, click **Enable Blobs**
4. This creates the storage backend needed for user authentication

### 2. Configure Environment Variables

In your Netlify site settings, add these environment variables:

```
JWT_SECRET=your-strong-jwt-secret-here-change-this
REFRESH_SECRET=your-strong-refresh-secret-here-change-this
```

**Important**: 
- Use strong, random secrets (32+ characters)
- Never use the default values in production
- These secrets should be different from each other

### 3. Deploy the Functions

Ensure all functions are properly deployed:

```bash
# Deploy via Git
git add netlify/functions/
git commit -m "Fix authentication system 502 errors"
git push origin main

# Or deploy via Netlify CLI
netlify deploy --prod
```

## 🩺 Health Check

Use the health endpoint to verify your setup:

```bash
curl https://your-site.netlify.app/.netlify/functions/health
```

Expected healthy response:
```json
{
  "timestamp": "2025-01-15T...",
  "status": "healthy",
  "checks": {
    "environment": {
      "status": "pass",
      "jwtSecretConfigured": true,
      "refreshSecretConfigured": true
    },
    "blobsStorage": {
      "status": "pass",
      "message": "Netlify Blobs read/write operations successful"
    },
    "userStore": {
      "status": "pass",
      "message": "User data store is accessible"
    }
  }
}
```

## 🔧 Authentication Endpoints

### Available Endpoints

- `POST /.netlify/functions/signup` - User registration
- `POST /.netlify/functions/login` - User authentication  
- `POST /.netlify/functions/refresh` - Token refresh
- `GET /.netlify/functions/profile` - Get user profile
- `POST /.netlify/functions/logout` - User logout
- `GET /.netlify/functions/health` - System health check

### Error Handling

All endpoints now return proper HTTP status codes:

- **200**: Success
- **201**: Resource created
- **400**: Bad request/validation errors
- **401**: Authentication failed
- **404**: Resource not found
- **405**: Method not allowed
- **409**: Conflict (user exists)
- **500**: Internal server error
- **503**: Service unavailable

## 🐛 Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check environment variables are set
   - Verify Netlify Blobs is enabled
   - Check function logs for specific errors

2. **Environment Variable Errors**
   ```bash
   # Check if variables are set
   netlify env:list
   
   # Set missing variables
   netlify env:set JWT_SECRET "your-secret-here"
   netlify env:set REFRESH_SECRET "your-refresh-secret-here"
   ```

3. **Blobs Storage Issues**
   - Ensure Blobs is enabled in site settings
   - Check function execution time limits
   - Verify your site plan includes Blobs storage

4. **Import/Export Errors**
   - All functions now use consistent imports
   - Lazy initialization prevents module-level failures

### Debug Logging

All functions include comprehensive logging:

```bash
# View function logs
netlify functions:log

# Or check in Netlify dashboard
# Site > Functions > [function-name] > Logs
```

### Health Check Details

The health endpoint provides detailed status:

- **Environment**: Checks JWT/refresh secret configuration
- **Blobs Storage**: Tests read/write/list operations
- **User Store**: Verifies user data access

## 🔐 Security Considerations

1. **Strong Secrets**: Use cryptographically strong secrets
2. **Token Expiration**: Access tokens expire in 15 minutes, refresh tokens in 7 days
3. **Input Validation**: All inputs are validated and sanitized
4. **Error Messages**: No sensitive information leaked in error responses
5. **Production Checks**: Environment validation prevents insecure configurations

## 📝 Testing

Test the authentication flow:

1. **Health Check**:
   ```bash
   curl https://your-site.netlify.app/.netlify/functions/health
   ```

2. **User Registration**:
   ```bash
   curl -X POST https://your-site.netlify.app/.netlify/functions/signup \
     -H "Content-Type: application/json" \
     -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
   ```

3. **User Login**:
   ```bash
   curl -X POST https://your-site.netlify.app/.netlify/functions/login \
     -H "Content-Type: application/json" \
     -d '{"login":"testuser","password":"password123"}'
   ```

## 📞 Support

If you encounter issues:

1. Check the health endpoint first
2. Review function logs in Netlify dashboard
3. Verify environment variable configuration
4. Ensure Netlify Blobs is enabled

The authentication system is now robust and should handle all edge cases without 502 errors.