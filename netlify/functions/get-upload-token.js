// Function to generate signed upload URL for large files
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: `Method ${event.httpMethod} not allowed` })
    };
  }

  try {
    console.log('🔐 === UPLOAD TOKEN REQUEST ===');
    
    // Parse request
    const body = JSON.parse(event.body);
    const { filename, contentType, userId } = body;
    
    if (!filename) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Filename is required' })
      };
    }
    
    // Environment check
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }
    
    // Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Generate file path
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId || 'anonymous'}/${timestamp}_${sanitizedFilename}`;
    
    console.log('📁 Generated file path:', filePath);
    
    // Create signed URL for upload (24 hour expiry)
    const { data, error } = await supabase.storage
      .from('audio-files')
      .createSignedUploadUrl(filePath, {
        upsert: false
      });
    
    if (error) {
      console.error('❌ Failed to create signed URL:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to create upload token',
          details: error.message 
        })
      };
    }
    
    // Get public URL for later
    const { data: { publicUrl } } = supabase.storage
      .from('audio-files')
      .getPublicUrl(filePath);
    
    console.log('✅ Upload token created successfully');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        uploadUrl: data.signedUrl,
        token: data.token,
        path: data.path,
        publicUrl: publicUrl,
        filePath: filePath,
        expiresIn: '24 hours'
      })
    };
    
  } catch (error) {
    console.error('💀 Token generation failed:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Token generation failed',
        message: error.message
      })
    };
  }
};