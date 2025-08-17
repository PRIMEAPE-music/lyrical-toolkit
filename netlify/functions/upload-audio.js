const { createClient } = require('@supabase/supabase-js');
const multipart = require('lambda-multipart-parser');

// Initialize Supabase client with service key (bypasses RLS)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_KEY:', !!supabaseServiceKey);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Audio configuration
const AUDIO_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: [
    'audio/mpeg',
    'audio/mp3', 
    'audio/wav',
    'audio/m4a',
    'audio/mp4',
    'audio/x-m4a'
  ],
  BUCKET_NAME: 'audio-files'
};

// Generate file path for user's audio file
const generateAudioFilePath = (userId, filename) => {
  // Sanitize filename
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = Date.now();
  return `${userId}/${timestamp}_${sanitized}`;
};

// Validate audio file
const validateAudioFile = (file) => {
  const errors = [];
  
  // Check file size
  if (file.content.length > AUDIO_CONFIG.MAX_FILE_SIZE) {
    errors.push(`File size must be less than ${AUDIO_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
  
  // Check MIME type
  if (!AUDIO_CONFIG.ALLOWED_TYPES.includes(file.contentType)) {
    errors.push(`File type must be one of: ${AUDIO_CONFIG.ALLOWED_TYPES.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

exports.handler = async (event, context) => {
  console.log('🎵 === AUDIO UPLOAD NETLIFY FUNCTION START ===');
  console.log('Method:', event.httpMethod);
  console.log('Headers:', JSON.stringify(event.headers, null, 2));
  
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
    console.log('📤 Processing file upload...');
    
    // Parse multipart form data
    const result = await multipart.parse(event);
    console.log('📋 Parsed form fields:', Object.keys(result));
    
    if (!result.file) {
      console.error('❌ No file found in request');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file provided' })
      };
    }
    
    const file = result.file;
    const userId = result.userId || 'anonymous';
    const filename = result.filename || file.filename;
    
    console.log('📄 File details:', {
      filename: filename,
      contentType: file.contentType,
      size: file.content.length,
      userId: userId
    });
    
    // Validate file
    const validation = validateAudioFile(file);
    if (!validation.isValid) {
      console.error('❌ File validation failed:', validation.errors);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'File validation failed',
          details: validation.errors 
        })
      };
    }
    
    console.log('✅ File validation passed');
    
    // Check if bucket exists, create if it doesn't
    console.log('🗂️ Checking bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error('❌ Failed to list buckets:', bucketsError);
      throw bucketsError;
    }
    
    console.log('📂 Available buckets:', buckets.map(b => b.name));
    
    const audioFilesBucket = buckets.find(b => b.name === AUDIO_CONFIG.BUCKET_NAME);
    if (!audioFilesBucket) {
      console.log('🆕 Creating audio-files bucket...');
      const { data: newBucket, error: createError } = await supabase.storage.createBucket(AUDIO_CONFIG.BUCKET_NAME, {
        public: true,
        allowedMimeTypes: AUDIO_CONFIG.ALLOWED_TYPES,
        fileSizeLimit: AUDIO_CONFIG.MAX_FILE_SIZE
      });
      if (createError) {
        console.error('❌ Failed to create bucket:', createError);
        throw createError;
      }
      console.log('✅ Created audio-files bucket');
    } else {
      console.log('✅ Audio-files bucket exists');
    }
    
    // Generate file path
    const filePath = generateAudioFilePath(userId, filename);
    console.log('📁 Generated file path:', filePath);
    
    // Upload file to Supabase Storage
    console.log('📤 Uploading to Supabase Storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(AUDIO_CONFIG.BUCKET_NAME)
      .upload(filePath, file.content, {
        contentType: file.contentType,
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Supabase Storage upload error:', uploadError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Upload failed',
          details: uploadError.message 
        })
      };
    }
    
    console.log('✅ Upload successful!');
    console.log('📄 Upload data:', uploadData);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(AUDIO_CONFIG.BUCKET_NAME)
      .getPublicUrl(filePath);
    
    console.log('🔗 Generated public URL:', publicUrl);
    
    const responseData = {
      success: true,
      publicUrl: publicUrl,
      filePath: filePath,
      filename: filename,
      size: file.content.length,
      contentType: file.contentType,
      uploadData: uploadData
    };
    
    console.log('🎉 Upload completed successfully!');
    console.log('📊 Response data:', responseData);
    console.log('🎵 === AUDIO UPLOAD NETLIFY FUNCTION END ===');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    };
    
  } catch (error) {
    console.error('❌ Upload function error:', error);
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