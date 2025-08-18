// Minimal test function to debug audio upload issues step by step
exports.handler = async (event, context) => {
  console.log('🟡 === MINIMAL AUDIO TEST FUNCTION START ===');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('🌐 Method:', event.httpMethod);
  console.log('📍 Path:', event.path);
  console.log('🔍 Headers:', JSON.stringify(event.headers, null, 2));
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ Handling OPTIONS preflight request');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'OPTIONS handled' })
    };
  }

  try {
    console.log('🔍 === STEP 1: BASIC FUNCTION CHECK ===');
    console.log('✅ Function is running');
    
    console.log('🔍 === STEP 2: ENVIRONMENT VARIABLES ===');
    const allEnvVars = Object.keys(process.env).filter(key => 
      key.startsWith('SUPABASE') || key.startsWith('REACT_APP')
    );
    console.log('📝 Available env vars:', allEnvVars);
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    console.log('📝 SUPABASE_URL available:', !!supabaseUrl);
    console.log('📝 SUPABASE_SERVICE_KEY available:', !!supabaseServiceKey);
    
    if (supabaseUrl) {
      console.log('📝 SUPABASE_URL preview:', supabaseUrl.substring(0, 30) + '...');
      console.log('📝 SUPABASE_URL is valid URL:', supabaseUrl.startsWith('https://'));
    }
    
    if (supabaseServiceKey) {
      console.log('📝 SUPABASE_SERVICE_KEY preview:', supabaseServiceKey.substring(0, 20) + '...');
      console.log('📝 SUPABASE_SERVICE_KEY starts with ey:', supabaseServiceKey.startsWith('ey'));
    }
    
    console.log('🔍 === STEP 3: REQUEST BODY CHECK ===');
    console.log('📝 Body exists:', !!event.body);
    console.log('📝 Body length:', event.body ? event.body.length : 0);
    console.log('📝 Is base64 encoded:', event.isBase64Encoded);
    console.log('📝 Content-Type:', event.headers['content-type'] || event.headers['Content-Type'] || 'NOT_SET');
    
    if (event.httpMethod === 'GET') {
      console.log('✅ GET request - returning environment info');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Minimal test function working',
          envCheck: {
            supabaseUrlAvailable: !!supabaseUrl,
            supabaseServiceKeyAvailable: !!supabaseServiceKey,
            allEnvVars: allEnvVars
          },
          timestamp: new Date().toISOString()
        })
      };
    }
    
    if (event.httpMethod === 'POST') {
      console.log('🔍 === STEP 4: POST REQUEST PROCESSING ===');
      
      // Try to parse multipart data
      try {
        console.log('📝 Attempting to load lambda-multipart-parser...');
        const multipart = require('lambda-multipart-parser');
        console.log('✅ lambda-multipart-parser loaded successfully');
        
        console.log('📝 Attempting to parse multipart data...');
        const result = await multipart.parse(event);
        console.log('✅ Multipart parsing successful');
        console.log('📝 Parsed fields:', Object.keys(result));
        
        const responseData = {
          success: true,
          message: 'POST request processed successfully',
          parsedFields: Object.keys(result),
          hasFile: !!result.file,
          timestamp: new Date().toISOString()
        };
        
        if (result.file) {
          console.log('📝 File found in request');
          console.log('📝 File name:', result.file.filename || 'NO_FILENAME');
          console.log('📝 File type:', result.file.contentType || 'NO_CONTENT_TYPE');
          console.log('📝 File size:', result.file.content ? result.file.content.length : 'NO_CONTENT');
          
          responseData.fileInfo = {
            filename: result.file.filename,
            contentType: result.file.contentType,
            size: result.file.content ? result.file.content.length : 0
          };
        } else {
          console.log('❌ No file found in request');
        }
        
        console.log('✅ Returning successful response');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(responseData)
        };
        
      } catch (parseError) {
        console.error('❌ Multipart parsing failed:', parseError);
        console.error('❌ Parse error stack:', parseError.stack);
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Failed to parse multipart data',
            details: parseError.message,
            step: 'multipart_parsing',
            contentType: event.headers['content-type'] || 'NOT_SET'
          })
        };
      }
    }
    
    console.log('❌ Unsupported method:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed',
        method: event.httpMethod
      })
    };
    
  } catch (error) {
    console.error('🔴 === FUNCTION ERROR ===');
    console.error('🔴 Error name:', error.name);
    console.error('🔴 Error message:', error.message);
    console.error('🔴 Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    };
  }
};