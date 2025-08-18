// NEW SIMPLE AUDIO STORAGE SERVICE
// Frontend-only service that communicates with Netlify functions
// No direct Supabase client - all storage operations go through backend

// Audio file validation constants
export const AUDIO_CONFIG = {
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

// Validate audio file
export const validateAudioFile = (file) => {
  const errors = [];
  
  // Check file size
  if (file.size > AUDIO_CONFIG.MAX_FILE_SIZE) {
    errors.push(`File size must be less than ${AUDIO_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
  
  // Check MIME type
  if (!AUDIO_CONFIG.ALLOWED_TYPES.includes(file.type)) {
    errors.push(`File type must be one of: ${AUDIO_CONFIG.ALLOWED_TYPES.join(', ')}`);
  }
  
  // Check file extension as fallback
  const extension = file.name.split('.').pop().toLowerCase();
  const allowedExtensions = ['mp3', 'wav', 'm4a', 'mp4'];
  if (!allowedExtensions.includes(extension)) {
    errors.push(`File extension must be one of: ${allowedExtensions.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Get audio file duration from File object
export const getAudioDuration = (file) => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load audio file to get duration'));
    });
    
    audio.src = url;
  });
};

// Upload audio file - uses direct upload for large files to avoid Netlify payload limits
export const uploadAudioFile = async (file, userId, onProgress = null) => {
  console.log('🎵 === AUDIO UPLOAD START ===');
  console.log('📄 File details:', {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified
  });
  console.log('👤 User ID:', userId);
  
  // Validate file first
  const validation = validateAudioFile(file);
  if (!validation.isValid) {
    console.error('❌ File validation failed:', validation.errors);
    throw new Error(validation.errors.join(', '));
  }
  console.log('✅ File validation passed');
  
  try {
    // Get audio duration (optional)
    let duration = null;
    try {
      duration = await getAudioDuration(file);
      console.log('✅ Audio duration detected:', duration, 'seconds');
    } catch (error) {
      console.warn('⚠️ Could not get audio duration:', error.message);
    }
    
    if (onProgress) onProgress(20);
    
    // Check if file is too large for Netlify function (>5MB becomes >7MB when base64 encoded)
    const isVeryLargeFile = file.size > 4 * 1024 * 1024; // 4MB threshold
    
    if (isVeryLargeFile) {
      console.log('🚀 File is large - using direct Supabase upload to bypass Netlify limits');
      return await uploadAudioFileDirect(file, userId, duration, onProgress);
    }
    
    // For smaller files, use the original method
    console.log('📦 Creating FormData...');
    const formData = new FormData();
    
    // CRITICAL: Backend expects 'file' field name exactly
    formData.append('file', file, file.name);
    formData.append('userId', userId || 'anonymous');
    formData.append('filename', file.name);
    
    if (duration !== null) {
      formData.append('duration', duration.toString());
    }
    
    // Debug FormData contents
    console.log('📋 FormData contents:');
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
    
    if (onProgress) onProgress(30);
    
    console.log('🚀 Sending request to /.netlify/functions/upload-audio');
    console.log('📡 Request method: POST');
    console.log('📡 Content-Type: multipart/form-data (auto-detected)');
    
    // Choose upload endpoint based on file size
    const isLargeFile = file.size > 3 * 1024 * 1024; // 3MB threshold
    const uploadEndpoint = isLargeFile 
      ? '/.netlify/functions/upload-audio-simple'
      : '/.netlify/functions/upload-audio';
      
    console.log(`🎯 Using ${isLargeFile ? 'SIMPLE' : 'STANDARD'} upload for ${(file.size / 1024 / 1024).toFixed(1)}MB file`);
    
    // Make the upload request
    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      body: formData
      // IMPORTANT: Do NOT set Content-Type header - let browser set it with boundary
    });
    
    console.log('📨 Response received:');
    console.log('  Status:', response.status, response.statusText);
    console.log('  Headers:', Object.fromEntries(response.headers.entries()));
    
    if (onProgress) onProgress(70);
    
    // Handle response
    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
        console.error('❌ Upload failed with response:', errorText);
      } catch (e) {
        errorText = 'Could not read error response';
        console.error('❌ Upload failed and could not read response');
      }
      
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }
    
    // Parse successful response
    let result;
    try {
      result = await response.json();
      console.log('✅ Upload successful!');
      console.log('📊 Server response:', result);
    } catch (e) {
      console.error('❌ Could not parse response as JSON');
      throw new Error('Invalid response from server');
    }
    
    if (onProgress) onProgress(100);
    
    const uploadResult = {
      url: result.publicUrl,
      path: result.filePath,
      filename: file.name,
      size: file.size,
      duration: duration
    };
    
    console.log('🎉 === AUDIO UPLOAD COMPLETE ===');
    console.log('📊 Final result:', uploadResult);
    
    return uploadResult;
    
  } catch (error) {
    console.error('❌ === AUDIO UPLOAD ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
};

// Direct upload to Supabase (bypasses Netlify function limits)
export const uploadAudioFileDirect = async (file, userId, duration, onProgress = null) => {
  console.log('🎯 === DIRECT SUPABASE UPLOAD START ===');
  console.log('📄 File size:', (file.size / 1024 / 1024).toFixed(1), 'MB');
  
  try {
    if (onProgress) onProgress(30);
    
    // Step 1: Get upload token from Netlify function
    console.log('🔐 Getting upload token...');
    const tokenResponse = await fetch('/.netlify/functions/get-upload-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        userId: userId || 'anonymous'
      })
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to get upload token: ${tokenResponse.status} - ${errorText}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('✅ Upload token received');
    
    if (onProgress) onProgress(40);
    
    // Step 2: Upload directly to Supabase storage
    console.log('🚀 Uploading directly to Supabase...');
    const uploadResponse = await fetch(tokenData.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
        'Cache-Control': '3600'
      }
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ Direct upload failed:', errorText);
      throw new Error(`Direct upload failed: ${uploadResponse.status} - ${errorText}`);
    }
    
    console.log('✅ Direct upload successful!');
    
    if (onProgress) onProgress(100);
    
    const uploadResult = {
      url: tokenData.publicUrl,
      path: tokenData.filePath,
      filename: file.name,
      size: file.size,
      duration: duration
    };
    
    console.log('🎉 === DIRECT UPLOAD COMPLETE ===');
    console.log('📊 Final result:', uploadResult);
    
    return uploadResult;
    
  } catch (error) {
    console.error('❌ === DIRECT UPLOAD ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
};

// Get signed URL for downloading audio file
export const getAudioDownloadUrl = async (filePath) => {
  try {
    console.log('🔗 Getting download URL for:', filePath);
    
    const response = await fetch('/.netlify/functions/get-audio-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filePath })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get download URL: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Download URL generated:', result.signedUrl);
    return result.signedUrl;
  } catch (error) {
    console.error('❌ Get download URL error:', error);
    throw error;
  }
};

// Delete audio file from storage
export const deleteAudioFile = async (filePath) => {
  try {
    console.log('🗑️ Deleting audio file:', filePath);
    
    const response = await fetch('/.netlify/functions/delete-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filePath })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete audio file: ${response.status}`);
    }
    
    console.log('✅ Audio file deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Delete audio file error:', error);
    throw error;
  }
};

// Replace existing audio file
export const replaceAudioFile = async (oldFilePath, newFile, userId, onProgress = null) => {
  try {
    console.log('🔄 Replacing audio file:', { oldFilePath, newFilename: newFile.name });
    
    // Upload new file
    const uploadResult = await uploadAudioFile(newFile, userId, onProgress);
    
    // Delete old file if upload succeeded
    if (oldFilePath) {
      try {
        await deleteAudioFile(oldFilePath);
      } catch (error) {
        console.warn('⚠️ Failed to delete old audio file:', error);
        // Don't throw - new file was uploaded successfully
      }
    }
    
    console.log('✅ Audio file replaced successfully');
    return uploadResult;
  } catch (error) {
    console.error('❌ Replace audio file error:', error);
    throw error;
  }
};

// Download audio file with proper filename
export const downloadAudioFile = async (filePath, filename) => {
  try {
    console.log('💾 Downloading audio file:', { filePath, filename });
    const downloadUrl = await getAudioDownloadUrl(filePath);
    
    // Create download link
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Audio file download initiated');
    return true;
  } catch (error) {
    console.error('❌ Download audio file error:', error);
    throw error;
  }
};

// Format file size for display
export const formatFileSize = (bytes) => {
  if (!bytes) return 'Unknown size';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

// Format duration for display
export const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return 'Unknown duration';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Extract file path from URL (for backend-generated URLs)
export const extractFilePathFromUrl = (url) => {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === AUDIO_CONFIG.BUCKET_NAME);
    
    if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
      return pathParts.slice(bucketIndex + 1).join('/');
    }
    
    return null;
  } catch (error) {
    console.error('❌ Extract file path error:', error);
    return null;
  }
};

// Test connectivity to upload function
export const testUploadEndpoint = async () => {
  try {
    console.log('🧪 Testing upload endpoint connectivity...');
    
    // Test with a simple GET request first (should get 405 Method Not Allowed)
    const response = await fetch('/.netlify/functions/upload-audio', {
      method: 'GET'
    });
    
    console.log('📡 GET test response:', response.status, response.statusText);
    
    if (response.status === 405) {
      console.log('✅ Upload function is reachable and responding correctly');
      return { success: true, reachable: true };
    } else {
      console.log('⚠️ Unexpected response from upload function');
      return { success: false, reachable: true, unexpectedStatus: response.status };
    }
  } catch (error) {
    console.error('❌ Upload function not reachable:', error);
    return { success: false, reachable: false, error: error.message };
  }
};

// Test upload function for debugging
export const testAudioUpload = async () => {
  try {
    console.log('🧪 === FULL UPLOAD TEST START ===');
    
    // First test endpoint connectivity
    const connectivityTest = await testUploadEndpoint();
    if (!connectivityTest.reachable) {
      return { success: false, error: 'Upload endpoint not reachable', details: connectivityTest };
    }
    
    console.log('✅ Endpoint reachable, proceeding with upload test...');
    
    // Create a minimal test file 
    const testContent = 'fake audio content for testing';
    const testBlob = new Blob([testContent], { type: 'audio/mpeg' });
    const testFile = new File([testBlob], 'test-upload.mp3', { type: 'audio/mpeg' });
    
    console.log('📄 Test file created:', {
      name: testFile.name,
      size: testFile.size,
      type: testFile.type
    });
    
    try {
      const result = await uploadAudioFile(testFile, 'test-user');
      console.log('✅ === TEST UPLOAD SUCCESSFUL ===');
      console.log('📊 Result:', result);
      return { success: true, result, connectivity: connectivityTest };
    } catch (error) {
      console.error('❌ === TEST UPLOAD FAILED ===');
      console.error('Error:', error.message);
      return { success: false, error: error.message, connectivity: connectivityTest };
    }
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    return { success: false, error: error.message };
  }
};

const audioStorageService = {
  validateAudioFile,
  getAudioDuration,
  uploadAudioFile,
  getAudioDownloadUrl,
  deleteAudioFile,
  replaceAudioFile,
  downloadAudioFile,
  extractFilePathFromUrl,
  testUploadEndpoint,
  testAudioUpload,
  formatFileSize,
  formatDuration,
  AUDIO_CONFIG
};

export default audioStorageService;