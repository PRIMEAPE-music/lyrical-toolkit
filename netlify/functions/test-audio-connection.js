// Simple test function to verify Supabase connection
exports.handler = async (event, context) => {
  console.log('🧪 === AUDIO CONNECTION TEST START ===');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ Handling OPTIONS request');
    return { statusCode: 200, headers, body: '' };
  }
  
  try {
    // Test 1: Basic function works
    console.log('✅ Function is running');
    
    // Test 2: Environment Variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    console.log('SUPABASE_URL present:', !!supabaseUrl);
    console.log('SUPABASE_SERVICE_KEY present:', !!supabaseServiceKey);
    
    const envTest = {
      supabaseUrlPresent: !!supabaseUrl,
      supabaseServiceKeyPresent: !!supabaseServiceKey,
      supabaseUrlValid: supabaseUrl && supabaseUrl.startsWith('https://') && !supabaseUrl.includes('your-supabase-url-here'),
      supabaseServiceKeyValid: supabaseServiceKey && supabaseServiceKey.startsWith('ey') && !supabaseServiceKey.includes('your-service-key-here')
    };
    
    if (!envTest.supabaseUrlValid || !envTest.supabaseServiceKeyValid) {
      console.log('❌ Environment variables not properly configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Environment variables not properly configured',
          envTest,
          message: 'Check your .env file and ensure Supabase credentials are set correctly'
        })
      };
    }
    
    // Test 3: Try to load Supabase client
    let supabase;
    try {
      const { createClient } = require('@supabase/supabase-js');
      supabase = createClient(supabaseUrl, supabaseServiceKey);
      console.log('✅ Supabase client created');
    } catch (error) {
      console.error('❌ Failed to create Supabase client:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to create Supabase client',
          details: error.message,
          envTest
        })
      };
    }
    
    // Test 4: Test Supabase connection
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('❌ Supabase connection failed:', bucketsError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Supabase connection failed',
            details: bucketsError.message,
            code: bucketsError.code,
            envTest
          })
        };
      }
      
      console.log('✅ Supabase connection successful');
      const audioFilesBucket = buckets?.find(b => b.name === 'audio-files');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'All tests passed!',
          envTest,
          supabaseTest: {
            connectionSuccessful: true,
            bucketsFound: buckets?.length || 0,
            bucketNames: buckets?.map(b => b.name) || [],
            audioFilesBucketExists: !!audioFilesBucket
          },
          timestamp: new Date().toISOString()
        })
      };
      
    } catch (error) {
      console.error('❌ Supabase test failed:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Supabase test failed',
          details: error.message,
          envTest
        })
      };
    }
    
  } catch (error) {
    console.error('❌ Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Function error',
        details: error.message,
        stack: error.stack
      })
    };
  }
};