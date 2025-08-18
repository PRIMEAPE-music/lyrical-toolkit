// Simple diagnostic function to test upload environment
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('🔍 === UPLOAD DIAGNOSTIC START ===');
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      requestId: context.awsRequestId,
      method: event.httpMethod,
      path: event.path,
      environment: {},
      supabase: {},
      dependencies: {},
      errors: []
    };

    // Test 1: Environment Variables
    console.log('🔍 Testing environment variables...');
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
      
      diagnostics.environment = {
        supabaseUrlSet: !!supabaseUrl,
        supabaseKeySet: !!supabaseServiceKey,
        supabaseUrlValid: supabaseUrl && !supabaseUrl.includes('placeholder') && supabaseUrl.startsWith('https://'),
        supabaseKeyValid: supabaseServiceKey && !supabaseServiceKey.includes('placeholder') && supabaseServiceKey.length > 50
      };
      
      if (!diagnostics.environment.supabaseUrlSet) {
        diagnostics.errors.push('SUPABASE_URL environment variable not set');
      }
      if (!diagnostics.environment.supabaseKeySet) {
        diagnostics.errors.push('SUPABASE_SERVICE_KEY environment variable not set');
      }
      
      console.log('✅ Environment check complete');
    } catch (error) {
      diagnostics.errors.push('Environment check failed: ' + error.message);
      console.error('❌ Environment check failed:', error);
    }

    // Test 2: Dependency Loading
    console.log('🔍 Testing dependencies...');
    try {
      // Test if busboy is available
      const busboy = require('busboy');
      diagnostics.dependencies.busboy = 'available';
      
      // Test if lambda-multipart-parser is still being used
      try {
        require('lambda-multipart-parser');
        diagnostics.dependencies.lambdaMultipartParser = 'available (should not be used)';
      } catch (e) {
        diagnostics.dependencies.lambdaMultipartParser = 'not available (good)';
      }
      
      console.log('✅ Dependencies check complete');
    } catch (error) {
      diagnostics.errors.push('Dependencies check failed: ' + error.message);
      console.error('❌ Dependencies check failed:', error);
    }

    // Test 3: Supabase Connection
    if (diagnostics.environment.supabaseUrlSet && diagnostics.environment.supabaseKeySet) {
      console.log('🔍 Testing Supabase connection...');
      try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        
        // Test connection with a simple bucket list
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
          diagnostics.supabase = {
            clientCreated: true,
            connectionWorking: false,
            error: bucketsError.message,
            code: bucketsError.code
          };
          diagnostics.errors.push('Supabase connection failed: ' + bucketsError.message);
        } else {
          diagnostics.supabase = {
            clientCreated: true,
            connectionWorking: true,
            bucketsFound: buckets ? buckets.length : 0,
            bucketNames: buckets ? buckets.map(b => b.name) : [],
            audioFilesBucketExists: buckets ? buckets.some(b => b.name === 'audio-files') : false
          };
        }
        
        console.log('✅ Supabase check complete');
      } catch (error) {
        diagnostics.supabase = {
          clientCreated: false,
          connectionWorking: false,
          error: error.message
        };
        diagnostics.errors.push('Supabase client creation failed: ' + error.message);
        console.error('❌ Supabase check failed:', error);
      }
    } else {
      diagnostics.supabase = {
        skipped: 'Environment variables not properly set'
      };
    }

    // Test 4: Function Version Check
    console.log('🔍 Checking function version...');
    try {
      // Check if this is the new version with busboy
      const fs = require('fs');
      const functionCode = fs.readFileSync(__filename, 'utf8');
      diagnostics.functionVersion = {
        usesBusboy: functionCode.includes('busboy'),
        usesLambdaMultipart: functionCode.includes('lambda-multipart-parser'),
        lastModified: fs.statSync(__filename).mtime
      };
    } catch (error) {
      diagnostics.functionVersion = {
        error: error.message
      };
    }

    console.log('✅ Diagnostic complete');
    console.log('📊 Results:', JSON.stringify(diagnostics, null, 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(diagnostics, null, 2)
    };

  } catch (error) {
    console.error('💀 Diagnostic function crashed:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Diagnostic function failed',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }, null, 2)
    };
  }
};