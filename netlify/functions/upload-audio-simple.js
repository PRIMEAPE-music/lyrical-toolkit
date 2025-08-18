// Ultra-simple audio upload function that bypasses complex multipart parsing
const { createClient } = require('@supabase/supabase-js');

// Minimal base64 multipart parser for large files
const parseMultipartSimple = (event) => {
  try {
    console.log('🔍 Simple parser - checking content type...');
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      throw new Error('Content-Type must be multipart/form-data');
    }

    // Extract boundary
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) {
      throw new Error('No boundary found in Content-Type');
    }
    
    const boundary = boundaryMatch[1];
    console.log('🔍 Boundary found:', boundary);
    
    // Convert body to buffer
    let bodyBuffer;
    if (event.isBase64Encoded) {
      bodyBuffer = Buffer.from(event.body, 'base64');
    } else {
      bodyBuffer = Buffer.from(event.body);
    }
    
    console.log('🔍 Body buffer size:', bodyBuffer.length, 'bytes');
    
    // Simple boundary splitting
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const parts = [];
    let currentIndex = 0;
    
    while (true) {
      const nextBoundary = bodyBuffer.indexOf(boundaryBuffer, currentIndex);
      if (nextBoundary === -1) break;
      
      if (currentIndex > 0) {
        const part = bodyBuffer.slice(currentIndex, nextBoundary);
        if (part.length > 10) { // Skip empty parts
          parts.push(part);
        }
      }
      currentIndex = nextBoundary + boundaryBuffer.length;
    }
    
    console.log('🔍 Found', parts.length, 'parts');
    
    const result = {};
    
    for (const part of parts) {
      const headerEndIndex = part.indexOf('\r\n\r\n');
      if (headerEndIndex === -1) continue;
      
      const headers = part.slice(0, headerEndIndex).toString();
      const content = part.slice(headerEndIndex + 4);
      
      // Extract field name from Content-Disposition
      const nameMatch = headers.match(/name="([^"]+)"/);
      if (!nameMatch) continue;
      
      const fieldName = nameMatch[1];
      
      if (headers.includes('filename=')) {
        // This is a file
        const filenameMatch = headers.match(/filename="([^"]+)"/);
        const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/);
        
        result[fieldName] = {
          filename: filenameMatch ? filenameMatch[1] : 'unknown.mp3',
          contentType: contentTypeMatch ? contentTypeMatch[1].trim() : 'audio/mpeg',
          content: content.slice(0, -2) // Remove trailing \r\n
        };
        
        console.log('📄 File found:', fieldName, 'size:', result[fieldName].content.length);
      } else {
        // This is a regular field
        result[fieldName] = content.slice(0, -2).toString(); // Remove trailing \r\n
        console.log('📋 Field found:', fieldName, '=', result[fieldName]);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Simple parser failed:', error);
    throw new Error('Failed to parse request: ' + error.message);
  }
};

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
    console.log('🎵 === SIMPLE UPLOAD FUNCTION START ===');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🆔 Request ID:', context.awsRequestId);
    
    // Memory check
    if (process.memoryUsage) {
      const memory = process.memoryUsage();
      console.log('🧠 Initial memory:', {
        rss: Math.round(memory.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB'
      });
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
    
    // Parse request
    console.log('🔍 Parsing request...');
    const result = parseMultipartSimple(event);
    
    // Get file
    const file = result.file;
    if (!file || !file.content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file provided' })
      };
    }
    
    const userId = result.userId || 'anonymous';
    const filename = result.filename || file.filename || 'unknown.mp3';
    
    console.log('📄 File details:', {
      filename: filename,
      contentType: file.contentType,
      size: file.content.length
    });
    
    // Upload to Supabase
    const bucketName = 'audio-files';
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${timestamp}_${sanitizedFilename}`;
    
    console.log('🚀 Uploading to:', filePath);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file.content, {
        contentType: file.contentType || 'audio/mpeg',
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Upload failed',
          details: uploadError.message
        })
      };
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    console.log('✅ Upload successful!');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        publicUrl: publicUrl,
        filePath: filePath,
        filename: filename,
        size: file.content.length,
        contentType: file.contentType
      })
    };
    
  } catch (error) {
    console.error('💀 Function failed:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Upload failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};