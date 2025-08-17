// Test function to verify Supabase connection and environment variables
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  console.log('🧪 === AUDIO CONNECTION TEST START ===');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  const testResults = {
    timestamp: new Date().toISOString(),
    environment: {},
    supabase: {},
    storage: {}
  };
  
  try {
    // Test 1: Environment Variables
    console.log('🔍 Testing environment variables...');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    testResults.environment = {
      SUPABASE_URL: {
        present: !!supabaseUrl,
        isPlaceholder: supabaseUrl ? supabaseUrl.includes('your-supabase-url-here') : true,
        startsWithHTTPS: supabaseUrl ? supabaseUrl.startsWith('https://') : false,
        preview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING'
      },
      SUPABASE_SERVICE_KEY: {
        present: !!supabaseServiceKey,
        isPlaceholder: supabaseServiceKey ? supabaseServiceKey.includes('your-service-key-here') : true,
        startsWithEy: supabaseServiceKey ? supabaseServiceKey.startsWith('ey') : false,
        preview: supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'MISSING'
      }
    };
    
    if (!supabaseUrl || testResults.environment.SUPABASE_URL.isPlaceholder) {
      testResults.environment.error = 'SUPABASE_URL is missing or contains placeholder';
      console.error('❌', testResults.environment.error);
    }
    
    if (!supabaseServiceKey || testResults.environment.SUPABASE_SERVICE_KEY.isPlaceholder) {
      testResults.environment.error = 'SUPABASE_SERVICE_KEY is missing or contains placeholder';
      console.error('❌', testResults.environment.error);
    }
    
    if (testResults.environment.error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Environment configuration error',
          testResults,
          fix: 'Update your .env file with real Supabase credentials'
        })
      };
    }
    
    console.log('✅ Environment variables validated');
    
    // Test 2: Supabase Client Creation
    console.log('🔍 Testing Supabase client creation...');
    let supabase;
    try {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
      testResults.supabase.clientCreated = true;
      console.log('✅ Supabase client created');
    } catch (error) {
      testResults.supabase.clientCreated = false;
      testResults.supabase.error = error.message;
      console.error('❌ Supabase client creation failed:', error);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to create Supabase client',
          testResults
        })
      };
    }
    
    // Test 3: Storage Connection
    console.log('🔍 Testing storage connection...');
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        testResults.storage.connectionFailed = true;
        testResults.storage.error = bucketsError.message;
        testResults.storage.errorCode = bucketsError.code;
        console.error('❌ Storage connection failed:', bucketsError);
        
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Storage connection failed',
            testResults,
            supabaseError: bucketsError
          })
        };
      }
      
      testResults.storage.connectionSuccessful = true;
      testResults.storage.bucketsFound = buckets ? buckets.length : 0;
      testResults.storage.bucketNames = buckets ? buckets.map(b => b.name) : [];
      
      console.log('✅ Storage connection successful');
      console.log('📂 Found buckets:', testResults.storage.bucketNames);
      
      // Test 4: Audio Files Bucket
      const audioFilesBucket = buckets?.find(b => b.name === 'audio-files');
      testResults.storage.audioFilesBucketExists = !!audioFilesBucket;
      
      if (!audioFilesBucket) {
        console.log('⚠️ audio-files bucket does not exist (will be created on first upload)');
        testResults.storage.note = 'audio-files bucket will be created automatically on first upload';
      } else {
        console.log('✅ audio-files bucket exists');
      }
      
    } catch (error) {
      testResults.storage.connectionFailed = true;
      testResults.storage.error = error.message;
      console.error('❌ Storage test failed:', error);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Storage test failed',
          testResults
        })
      };
    }
    
    console.log('🎉 All tests passed!');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'All audio upload prerequisites verified',
        testResults,
        nextSteps: [
          'Environment variables are properly configured',
          'Supabase client can be created',
          'Storage connection is working',
          'Ready for audio file uploads'
        ]
      })
    };
    
  } catch (error) {
    console.error('❌ Test function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test function failed',
        details: error.message,
        testResults
      })
    };
  }
};