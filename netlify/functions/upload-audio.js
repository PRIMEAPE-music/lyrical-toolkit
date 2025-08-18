// Simplified Audio Upload Function with Enhanced Error Handling
const { createClient } = require('@supabase/supabase-js');

// Simple multipart parser fallback if lambda-multipart-parser fails
const parseMultipart = async (event) => {
  try {
    const multipart = require('lambda-multipart-parser');
    return await multipart.parse(event);
  } catch (error) {
    console.error('❌ Multipart parsing failed:', error);
    throw new Error('Failed to parse multipart data: ' + error.message);
  }
};

exports.handler = async (event, context) => {
  // ========================
  // FATAL ERROR PROTECTION
  // ========================
  try {
    console.log('🎵 === FUNCTION ENTRY ===');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🆔 Request ID:', context.awsRequestId);
    console.log('⚡ Memory limit:', context.memoryLimitInMB, 'MB');
    console.log('⏱️ Remaining time:', context.getRemainingTimeInMillis(), 'ms');
    
    // Log raw request details BEFORE any processing
    console.log('🔍 === RAW REQUEST ANALYSIS ===');
    console.log('🌐 Method:', event.httpMethod);
    console.log('📍 Path:', event.path);
    console.log('📏 Content-Length header:', event.headers['content-length'] || 'Not set');
    console.log('📋 Content-Type header:', event.headers['content-type'] || 'Not set');
    console.log('📊 Body type:', typeof event.body);
    console.log('📏 Body length:', event.body ? event.body.length : 0);
    console.log('🔤 Is base64 encoded:', event.isBase64Encoded);
    
    // Check for suspiciously large requests early
    const contentLength = event.headers['content-length'];
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      console.log('📐 Request size:', sizeInMB.toFixed(2), 'MB');
      
      if (sizeInMB > 50) {
        console.warn('⚠️ Large request detected:', sizeInMB.toFixed(2), 'MB');
      }
    }
    
    // Memory usage check
    if (process.memoryUsage) {
      const memory = process.memoryUsage();
      console.log('🧠 Memory usage:', {
        rss: Math.round(memory.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + 'MB'
      });
    }
    
    console.log('🎵 === SIMPLIFIED AUDIO UPLOAD FUNCTION START ===');
  
  // Enhanced CORS headers
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
      body: ''
    };
  }
  
  if (event.httpMethod !== 'POST') {
    console.log('❌ Method not allowed:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: `Method ${event.httpMethod} not allowed` })
    };
  }
  
  try {
    // Step 1: Check Environment Variables
    console.log('🔍 === STEP 1: ENVIRONMENT VARIABLES ===');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    console.log('SUPABASE_URL present:', !!supabaseUrl);
    console.log('SUPABASE_SERVICE_KEY present:', !!supabaseServiceKey);
    
    if (supabaseUrl) {
      console.log('SUPABASE_URL starts with:', supabaseUrl.substring(0, 20));
    }
    if (supabaseServiceKey) {
      console.log('SUPABASE_SERVICE_KEY starts with:', supabaseServiceKey.substring(0, 20));
    }
    
    // Check for placeholder values
    if (!supabaseUrl || supabaseUrl.includes('your-supabase-url-here') || supabaseUrl.includes('placeholder')) {
      console.error('❌ SUPABASE_URL is missing or contains placeholder');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error: SUPABASE_URL not properly configured',
          debug: 'Environment variable contains placeholder or is missing'
        })
      };
    }
    
    if (!supabaseServiceKey || supabaseServiceKey.includes('your-service-key-here') || supabaseServiceKey.includes('placeholder')) {
      console.error('❌ SUPABASE_SERVICE_KEY is missing or contains placeholder');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error: SUPABASE_SERVICE_KEY not properly configured',
          debug: 'Environment variable contains placeholder or is missing'
        })
      };
    }
    
    console.log('✅ Environment variables validated');
    
    // Step 2: Initialize Supabase Client
    console.log('🔍 === STEP 2: SUPABASE CLIENT ===');
    let supabase;
    try {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
      console.log('✅ Supabase client created successfully');
    } catch (error) {
      console.error('❌ Failed to create Supabase client:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to initialize storage client',
          details: error.message 
        })
      };
    }
    
    // Step 3: Test Supabase Connection
    console.log('🔍 === STEP 3: SUPABASE CONNECTION TEST ===');
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) {
        console.error('❌ Supabase connection failed:', bucketsError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Storage connection failed',
            details: bucketsError.message,
            code: bucketsError.code
          })
        };
      }
      console.log('✅ Supabase connection successful');
      console.log('📂 Available buckets:', buckets ? buckets.map(b => b.name) : 'none');
    } catch (error) {
      console.error('❌ Supabase connection test failed:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Storage connection test failed',
          details: error.message 
        })
      };
    }
    
    // Step 4: Parse Request
    console.log('🔍 === STEP 4: PARSE REQUEST ===');
    console.log('Content-Type:', event.headers['content-type'] || event.headers['Content-Type']);
    console.log('Body length:', event.body ? event.body.length : 0);
    console.log('Is base64:', event.isBase64Encoded);
    
    // Memory check before parsing
    if (process.memoryUsage) {
      const memoryBefore = process.memoryUsage();
      console.log('🧠 Memory before parsing:', {
        rss: Math.round(memoryBefore.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryBefore.heapUsed / 1024 / 1024) + 'MB'
      });
    }
    
    console.log('⚡ Starting multipart parsing...');
    let result;
    try {
      result = await parseMultipart(event);
      console.log('✅ Multipart parsing successful');
      console.log('📋 Parsed fields:', Object.keys(result));
      
      // Memory check after parsing
      if (process.memoryUsage) {
        const memoryAfter = process.memoryUsage();
        console.log('🧠 Memory after parsing:', {
          rss: Math.round(memoryAfter.rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryAfter.heapUsed / 1024 / 1024) + 'MB'
        });
      }
    } catch (error) {
      console.error('❌ Request parsing failed:', error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to parse upload request',
          details: error.message 
        })
      };
    }
    
    // Step 5: Validate File
    console.log('🔍 === STEP 5: FILE VALIDATION ===');
    
    // Check for both 'file' and 'files' field names (frontend inconsistency)
    // Note: lambda-multipart-parser sometimes returns files as arrays
    let file = result.file || result.files;
    
    // If files is an array, get the first file
    if (Array.isArray(file)) {
      console.log('📄 Files field is array, taking first item');
      file = file[0];
    }
    
    if (!file) {
      console.error('❌ No file found in request');
      console.log('Available fields:', Object.keys(result));
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'No file provided in request',
          availableFields: Object.keys(result),
          debug: 'Expected "file" or "files" field'
        })
      };
    }
    
    const userId = result.userId || 'anonymous';
    const filename = result.filename || file.filename || 'unknown.mp3';
    
    console.log('📄 File details:', {
      filename: filename,
      contentType: file.contentType,
      size: file.content ? file.content.length : 'unknown',
      userId: userId
    });
    
    // Debug file content (only in case of issues)
    if (!file.content || file.content.length === 0) {
      console.log('🔍 === FILE CONTENT DEBUG ===');
      console.log('📄 File object keys:', Object.keys(file));
      console.log('📄 File.content type:', typeof file.content);
      console.log('📄 File.content is Buffer:', Buffer.isBuffer(file.content));
    }
    
    if (!file.content || file.content.length === 0) {
      console.error('❌ File content is empty');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'File content is empty',
          debug: {
            fileKeys: Object.keys(file),
            contentType: typeof file.content,
            isBuffer: Buffer.isBuffer(file.content),
            hasContent: !!file.content
          }
        })
      };
    }
    
    console.log('✅ File validation passed');
    
    // Step 6: Simple Upload
    console.log('🔍 === STEP 6: UPLOAD TO STORAGE ===');
    const bucketName = 'audio-files';
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${timestamp}_${sanitizedFilename}`;
    
    console.log('📁 Upload path:', filePath);
    console.log('🗂️ Bucket:', bucketName);
    
    try {
      // Determine proper content type based on file extension
      let contentType = file.contentType;
      const fileExtension = sanitizedFilename.split('.').pop().toLowerCase();
      
      // Override content type for known audio extensions
      if (fileExtension === 'mp3') {
        contentType = 'audio/mpeg';
      } else if (fileExtension === 'wav') {
        contentType = 'audio/wav';
      } else if (fileExtension === 'm4a' || fileExtension === 'mp4') {
        contentType = 'audio/mp4';
      } else if (!contentType || contentType === 'application/octet-stream') {
        contentType = 'audio/mpeg'; // Default fallback
      }
      
      console.log('📄 Final content type:', contentType);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file.content, {
          contentType: contentType,
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('❌ Upload failed:', uploadError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'File upload failed',
            details: uploadError.message,
            code: uploadError.code
          })
        };
      }
      
      console.log('✅ Upload successful!');
      console.log('📄 Upload result:', uploadData);
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      console.log('🔗 Public URL:', publicUrl);
      
      const responseData = {
        success: true,
        publicUrl: publicUrl,
        filePath: filePath,
        filename: filename,
        size: file.content.length,
        contentType: file.contentType
      };
      
      console.log('🎉 === UPLOAD COMPLETED SUCCESSFULLY ===');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(responseData)
      };
      
    } catch (uploadError) {
      console.error('❌ Upload exception:', uploadError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Upload operation failed',
          details: uploadError.message 
        })
      };
    }
    
  } catch (error) {
    // ========================
    // FATAL ERROR HANDLER
    // ========================
    console.error('💀 === FATAL FUNCTION ERROR ===');
    console.error('🚨 Error type:', error.constructor.name);
    console.error('📝 Error name:', error.name);
    console.error('💬 Error message:', error.message);
    console.error('📚 Error stack:', error.stack);
    
    // Memory usage at time of crash
    if (process.memoryUsage) {
      try {
        const memory = process.memoryUsage();
        console.error('🧠 Memory at crash:', {
          rss: Math.round(memory.rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + 'MB'
        });
      } catch (memError) {
        console.error('❌ Could not get memory usage:', memError.message);
      }
    }
    
    // Attempt to determine error category
    let errorCategory = 'unknown';
    let errorDetails = error.message;
    
    if (error.message && error.message.toLowerCase().includes('memory')) {
      errorCategory = 'memory_limit';
      errorDetails = 'Function ran out of memory processing the request';
    } else if (error.message && error.message.toLowerCase().includes('timeout')) {
      errorCategory = 'timeout';
      errorDetails = 'Function timed out processing the request';
    } else if (error.message && error.message.toLowerCase().includes('multipart')) {
      errorCategory = 'parsing_error';
      errorDetails = 'Failed to parse multipart form data';
    } else if (error.name === 'RangeError') {
      errorCategory = 'range_error';
      errorDetails = 'Possible memory allocation issue with large file';
    }
    
    console.error('🏷️ Error category:', errorCategory);
    console.error('📖 Error details:', errorDetails);
    
    // Ensure we always return a proper JSON response
    const errorHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Content-Type': 'application/json'
    };
    
    return {
      statusCode: 500,
      headers: errorHeaders,
      body: JSON.stringify({ 
        error: 'Function execution failed',
        category: errorCategory,
        details: errorDetails,
        originalError: error.message,
        timestamp: new Date().toISOString(),
        requestId: context?.awsRequestId || 'unknown'
      })
    };
  }
};