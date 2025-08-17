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

// Upload audio file via Netlify function
export const uploadAudioFile = async (file, userId, onProgress = null) => {
  console.log('🎵 === NEW AUDIO UPLOAD START ===');
  console.log('📄 File:', file.name, '| Size:', file.size, '| User:', userId);
  
  // Validate file
  const validation = validateAudioFile(file);
  if (!validation.isValid) {
    console.error('❌ File validation failed:', validation.errors);
    throw new Error(validation.errors.join(', '));
  }
  
  try {
    // Get audio duration
    let duration = null;
    try {
      duration = await getAudioDuration(file);
      console.log('✅ Audio duration detected:', duration);
    } catch (error) {
      console.warn('⚠️ Could not get audio duration:', error);
    }
    
    if (onProgress) onProgress(10);
    
    // Create FormData for upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId || 'anonymous');
    formData.append('filename', file.name);
    if (duration) formData.append('duration', duration.toString());
    
    console.log('📤 Uploading via Netlify function...');
    if (onProgress) onProgress(30);
    
    // Upload via Netlify function
    const response = await fetch('/.netlify/functions/upload-audio', {
      method: 'POST',
      body: formData
    });
    
    if (onProgress) onProgress(70);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Upload failed:', response.status, errorData);
      throw new Error(`Upload failed: ${response.status} ${errorData}`);
    }
    
    const result = await response.json();
    console.log('✅ Upload successful!');
    console.log('📊 Result:', result);
    
    if (onProgress) onProgress(100);
    
    console.log('🎉 === NEW AUDIO UPLOAD END ===');
    return {
      url: result.publicUrl,
      path: result.filePath,
      filename: file.name,
      size: file.size,
      duration: duration
    };
    
  } catch (error) {
    console.error('❌ Audio upload error:', error);
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

// Test upload function for debugging
export const testAudioUpload = async () => {
  try {
    console.log('🧪 Testing audio upload system...');
    
    // Create a small test audio file (1 second of silence)
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        // Create a fake audio file for testing
        const testFile = new File([blob], 'test-audio.mp3', { type: 'audio/mpeg' });
        
        try {
          const result = await uploadAudioFile(testFile, 'test-user');
          console.log('✅ Test upload successful:', result);
          resolve({ success: true, result });
        } catch (error) {
          console.error('❌ Test upload failed:', error);
          resolve({ success: false, error: error.message });
        }
      }, 'audio/mpeg');
    });
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
  testAudioUpload,
  formatFileSize,
  formatDuration,
  AUDIO_CONFIG
};

export default audioStorageService;