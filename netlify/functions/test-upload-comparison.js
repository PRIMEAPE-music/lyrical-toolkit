// Test both functions side by side to compare behavior
exports.handler = async (event, context) => {
  console.log('🔄 === UPLOAD COMPARISON TEST ===');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('🌐 Method:', event.httpMethod);
  console.log('📍 Path:', event.path);
  
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
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Upload comparison test function ready',
          availableFunctions: [
            'test-audio-minimal',
            'upload-audio',
            'test-upload-comparison'
          ],
          timestamp: new Date().toISOString()
        })
      };
    }

    if (event.httpMethod === 'POST') {
      console.log('🔍 === ANALYZING POST REQUEST ===');
      
      // Environment check
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
      
      console.log('📝 Environment check:');
      console.log('📝 SUPABASE_URL available:', !!supabaseUrl);
      console.log('📝 SUPABASE_SERVICE_KEY available:', !!supabaseServiceKey);
      
      // Body analysis
      console.log('📝 Request body analysis:');
      console.log('📝 Body exists:', !!event.body);
      console.log('📝 Body length:', event.body ? event.body.length : 0);
      console.log('📝 Is base64 encoded:', event.isBase64Encoded);
      console.log('📝 Content-Type:', event.headers['content-type'] || 'NOT_SET');
      
      // Headers analysis
      console.log('📝 Relevant headers:');
      const relevantHeaders = ['content-type', 'content-length', 'user-agent'];
      relevantHeaders.forEach(header => {
        console.log(`📝 ${header}:`, event.headers[header] || 'NOT_SET');
      });
      
      // Try lambda-multipart-parser
      try {
        console.log('📝 Testing lambda-multipart-parser...');
        const multipart = require('lambda-multipart-parser');
        
        const parseResult = await multipart.parse(event);
        console.log('✅ Multipart parsing successful');
        console.log('📝 Parsed fields:', Object.keys(parseResult));
        
        if (parseResult.file) {
          console.log('📝 File details:');
          console.log('📝 - filename:', parseResult.file.filename);
          console.log('📝 - contentType:', parseResult.file.contentType);
          console.log('📝 - size:', parseResult.file.content ? parseResult.file.content.length : 0);
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'File parsing successful',
            analysis: {
              environmentOk: !!(supabaseUrl && supabaseServiceKey),
              bodyReceived: !!event.body,
              bodyLength: event.body ? event.body.length : 0,
              isBase64: event.isBase64Encoded,
              contentType: event.headers['content-type'],
              parsedFields: Object.keys(parseResult),
              hasFile: !!parseResult.file,
              fileInfo: parseResult.file ? {
                filename: parseResult.file.filename,
                contentType: parseResult.file.contentType,
                size: parseResult.file.content ? parseResult.file.content.length : 0
              } : null
            },
            timestamp: new Date().toISOString()
          })
        };
        
      } catch (parseError) {
        console.error('❌ Multipart parsing failed:', parseError.message);
        console.error('❌ Parse error details:', parseError);
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Multipart parsing failed',
            details: parseError.message,
            analysis: {
              environmentOk: !!(supabaseUrl && supabaseServiceKey),
              bodyReceived: !!event.body,
              bodyLength: event.body ? event.body.length : 0,
              isBase64: event.isBase64Encoded,
              contentType: event.headers['content-type'],
              parseError: parseError.message
            },
            timestamp: new Date().toISOString()
          })
        };
      }
    }

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
    console.error('🔴 Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};