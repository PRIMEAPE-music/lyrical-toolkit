// Audio storage service using browser APIs and simulated storage
// This provides a working demo implementation without requiring Supabase Storage setup

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

// Generate file path for user's audio file
export const generateAudioFilePath = (userId, filename) => {
  // Sanitize filename
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = Date.now();
  return `${userId}/${timestamp}_${sanitized}`;
};

// Upload audio file (demo implementation using local URL)
export const uploadAudioFile = async (file, userId, onProgress = null) => {
  // Validate file
  const validation = validateAudioFile(file);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }
  
  try {
    // Simulate upload progress
    if (onProgress) {
      onProgress(0);
      await new Promise(resolve => setTimeout(resolve, 100));
      onProgress(25);
      await new Promise(resolve => setTimeout(resolve, 100));
      onProgress(50);
      await new Promise(resolve => setTimeout(resolve, 100));
      onProgress(75);
      await new Promise(resolve => setTimeout(resolve, 100));
      onProgress(100);
    }
    
    // Get audio duration
    let duration = null;
    try {
      duration = await getAudioDuration(file);
    } catch (error) {
      console.warn('Could not get audio duration:', error);
    }
    
    // Create a local blob URL for demo purposes
    const url = URL.createObjectURL(file);
    const filePath = generateAudioFilePath(userId, file.name);
    
    // Store the blob URL in localStorage so it persists during session
    const audioData = {
      url: url,
      path: filePath,
      filename: file.name,
      size: file.size,
      duration: duration,
      uploadTime: Date.now()
    };
    
    // Store in localStorage for demo persistence
    const storedAudio = JSON.parse(localStorage.getItem('audioFiles') || '{}');
    storedAudio[filePath] = audioData;
    localStorage.setItem('audioFiles', JSON.stringify(storedAudio));
    
    console.log('Audio file uploaded successfully (demo mode):', audioData);
    return audioData;
    
  } catch (error) {
    console.error('Audio upload error:', error);
    throw error;
  }
};

// Get download URL for audio file (demo implementation)
export const getAudioDownloadUrl = async (filePath) => {
  try {
    const storedAudio = JSON.parse(localStorage.getItem('audioFiles') || '{}');
    const audioData = storedAudio[filePath];
    
    if (!audioData) {
      throw new Error('Audio file not found');
    }
    
    return audioData.url;
  } catch (error) {
    console.error('Get download URL error:', error);
    throw error;
  }
};

// Delete audio file from storage (demo implementation)
export const deleteAudioFile = async (filePath) => {
  try {
    const storedAudio = JSON.parse(localStorage.getItem('audioFiles') || '{}');
    
    if (storedAudio[filePath]) {
      // Revoke the blob URL to free memory
      URL.revokeObjectURL(storedAudio[filePath].url);
      
      // Remove from localStorage
      delete storedAudio[filePath];
      localStorage.setItem('audioFiles', JSON.stringify(storedAudio));
      
      console.log('Audio file deleted successfully (demo mode):', filePath);
    }
    
    return true;
  } catch (error) {
    console.error('Delete audio file error:', error);
    throw error;
  }
};

// Replace existing audio file
export const replaceAudioFile = async (oldFilePath, newFile, userId, onProgress = null) => {
  try {
    // Upload new file
    const uploadResult = await uploadAudioFile(newFile, userId, onProgress);
    
    // Delete old file if upload succeeded
    if (oldFilePath) {
      try {
        await deleteAudioFile(oldFilePath);
      } catch (error) {
        console.warn('Failed to delete old audio file:', error);
        // Don't throw - new file was uploaded successfully
      }
    }
    
    return uploadResult;
  } catch (error) {
    console.error('Replace audio file error:', error);
    throw error;
  }
};

// Download audio file with proper filename
export const downloadAudioFile = async (filePath, filename) => {
  try {
    const downloadUrl = await getAudioDownloadUrl(filePath);
    
    // Create download link
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Download audio file error:', error);
    throw error;
  }
};

// Extract file path from URL (demo implementation)
export const extractFilePathFromUrl = (url) => {
  if (!url) return null;
  
  try {
    // For demo mode, find the file path in localStorage by matching URL
    const storedAudio = JSON.parse(localStorage.getItem('audioFiles') || '{}');
    
    for (const [filePath, audioData] of Object.entries(storedAudio)) {
      if (audioData.url === url) {
        return filePath;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Extract file path error:', error);
    return null;
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

const audioStorageService = {
  validateAudioFile,
  getAudioDuration,
  uploadAudioFile,
  getAudioDownloadUrl,
  deleteAudioFile,
  replaceAudioFile,
  downloadAudioFile,
  extractFilePathFromUrl,
  formatFileSize,
  formatDuration,
  AUDIO_CONFIG
};

export default audioStorageService;