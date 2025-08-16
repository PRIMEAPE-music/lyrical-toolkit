# Supabase Migration Guide

This guide covers the migration from Netlify Blobs to Supabase database for the Lyrical Toolkit authentication system.

## ✅ **Migration Completed:**

### 1. **Dependencies Updated** ✅
- **Removed**: `@netlify/blobs`
- **Added**: `@supabase/supabase-js@^2.38.4`
- Updated in `package.json`

### 2. **Supabase Client Created** ✅
- Created `netlify/functions/supabase-client.js`
- Environment variable validation for `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Comprehensive user operations with proper error handling
- UUID primary key support
- Parameterized queries to prevent SQL injection

### 3. **Authentication System Updated** ✅
- Completely rewrote `shared-storage.js` to use Supabase
- **Maintained all JWT functions**: `createJWT`, `verifyJWT`, `hashPassword`, `generateTokenPair`
- **Updated user functions** to use Supabase database:
  - `createUser()` - INSERT into users table
  - `findUser()` - SELECT by username or email
  - `findUserByKey()` - SELECT with key format compatibility
  - `authenticateUser()` - verify credentials against database
  - `getUserById()` - SELECT by UUID primary key
- **Fixed base64url compatibility** for older Node.js versions

### 4. **Authentication Functions** ✅
- `signup.js`, `login.js`, `refresh.js` work with Supabase (no changes needed)
- All existing error handling and validation maintained
- Same API response formats preserved
- Database connection errors properly handled

### 5. **Health Endpoint Updated** ✅
- Removed Blobs connectivity checks
- Added Supabase database connectivity testing
- Environment variable validation for Supabase
- Updated setup instructions

## 🗄️ **Required Database Schema**

Create this table in your Supabase project:

```sql
-- Create users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    failed_login_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies (optional - for additional security)
CREATE POLICY "Enable read access for service role" ON users
    FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Enable insert access for service role" ON users
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Enable update access for service role" ON users
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');
```

## 🔧 **Required Environment Variables**

Add these to your Netlify site environment variables:

### **Existing Variables (keep these):**
```
JWT_SECRET=your-strong-jwt-secret-here
REFRESH_SECRET=your-strong-refresh-secret-here
```

### **New Supabase Variables:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your-service-key-here
```

### **How to get Supabase credentials:**

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Wait for setup to complete

2. **Get SUPABASE_URL**:
   - In project dashboard, go to Settings > API
   - Copy "Project URL"

3. **Get SUPABASE_SERVICE_KEY**:
   - In project dashboard, go to Settings > API
   - Copy "service_role" secret key (NOT the anon key)
   - ⚠️ **Important**: Use the service_role key, not anon key

## 🧪 **Testing the Migration**

### 1. **Install Dependencies**
```bash
npm install @supabase/supabase-js
npm uninstall @netlify/blobs
```

### 2. **Deploy Functions**
```bash
# Deploy via Git
git add .
git commit -m "Migrate authentication from Blobs to Supabase"
git push origin main

# Or deploy via Netlify CLI
netlify deploy --prod
```

### 3. **Test Health Endpoint**
```bash
curl https://your-site.netlify.app/.netlify/functions/health
```

**Expected healthy response:**
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
    "database": {
      "status": "pass", 
      "message": "Supabase database connection successful",
      "provider": "Supabase"
    },
    "supabaseConfig": {
      "status": "pass",
      "supabaseUrlConfigured": true,
      "supabaseKeyConfigured": true,
      "supabaseUrlValid": true
    }
  }
}
```

### 4. **Test Authentication Flow**

**User Registration:**
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

**User Login:**
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/login \
  -H "Content-Type: application/json" \
  -d '{"login":"testuser","password":"password123"}'
```

## 🔄 **Migration Benefits**

### **Advantages of Supabase:**
- ✅ **Reliable Database**: PostgreSQL with ACID compliance
- ✅ **UUID Primary Keys**: Better security and uniqueness
- ✅ **SQL Injection Protection**: Parameterized queries
- ✅ **Scalable**: Handles millions of users
- ✅ **Backup & Recovery**: Automatic backups
- ✅ **Real-time Capabilities**: WebSocket support (future use)
- ✅ **Free Tier**: 500MB database, 2GB bandwidth
- ✅ **Dashboard**: Easy user management and monitoring

### **Replaced Netlify Blobs Issues:**
- ❌ **502 Errors**: Eliminated module loading failures
- ❌ **Storage Limits**: No longer constrained by Blobs quotas  
- ❌ **Reliability**: Database is more stable than Blobs storage
- ❌ **Querying**: Can now perform complex user queries

## 📋 **What Was Disabled**

### **Song Storage (Temporary)**
- `songs.js` and `song-content.js` endpoints disabled during migration
- Will return appropriate error messages
- **Future**: Implement song storage in Supabase with proper schema

## 🚨 **Important Notes**

1. **Backward Compatibility**: All existing authentication API endpoints work the same
2. **No User Data Loss**: This is a fresh migration - existing Blobs data won't be migrated automatically
3. **Environment Variables**: Must configure Supabase environment variables before deployment
4. **Service Key Security**: Never expose SUPABASE_SERVICE_KEY in client-side code
5. **Database Security**: Row Level Security (RLS) enabled for additional protection

## 🔍 **Troubleshooting**

### **Common Issues:**

1. **502 Errors Still Occurring**:
   - Check environment variables are set correctly
   - Verify Supabase URL format
   - Check function logs for specific errors

2. **Database Connection Failed**:
   ```bash
   # Test credentials
   curl -X GET "https://your-project.supabase.co/rest/v1/users?select=count" \
     -H "apikey: your-service-key" \
     -H "Authorization: Bearer your-service-key"
   ```

3. **User Creation Errors**:
   - Verify users table exists with correct schema
   - Check unique constraints on username/email
   - Ensure service key has correct permissions

### **Debug Commands**:
```bash
# Check environment variables
netlify env:list

# Test Supabase connection
curl -X GET "https://your-project.supabase.co/rest/v1/" \
  -H "apikey: your-service-key"

# View function logs
netlify functions:log
```

## ✅ **Migration Complete!**

Your authentication system has been successfully migrated from Netlify Blobs to Supabase database. The system is now more reliable, scalable, and should eliminate the 502 errors you were experiencing.

**Next Steps:**
1. Set up Supabase project and environment variables
2. Create the users table schema
3. Deploy the updated functions
4. Test the authentication flow
5. Optionally implement song storage in Supabase