const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET_NAME = 'audio-files';

exports.handler = async (event, context) => {
  console.log('🔗 === GET AUDIO URL FUNCTION START ===');
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    const { filePath } = JSON.parse(event.body);
    
    if (!filePath) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'filePath is required' })
      };
    }
    
    console.log('🔍 Getting signed URL for:', filePath);
    
    // Get signed URL from Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    if (error) {
      console.error('❌ Failed to get signed URL:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to get download URL',
          details: error.message 
        })
      };
    }
    
    console.log('✅ Signed URL generated successfully');
    console.log('🔗 === GET AUDIO URL FUNCTION END ===');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        signedUrl: data.signedUrl,
        expiresIn: 3600 
      })
    };
    
  } catch (error) {
    console.error('❌ Get audio URL function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};