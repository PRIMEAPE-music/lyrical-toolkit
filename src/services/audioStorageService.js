import { createClient } from '@supabase/supabase-js';
import { getAuthHeader } from './authService';

// Initialize Supabase client for storage operations
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found. Audio upload will not work.');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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

// Upload audio file to Supabase Storage
export const uploadAudioFile = async (file, userId, onProgress = null) => {
  if (!supabase) {
    throw new Error('Supabase not configured for audio uploads');
  }
  
  // Validate file
  const validation = validateAudioFile(file);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }
  
  try {
    // Get audio duration
    let duration = null;
    try {
      duration = await getAudioDuration(file);
    } catch (error) {
      console.warn('Could not get audio duration:', error);
    }
    
    // Generate file path
    const filePath = generateAudioFilePath(userId, file.name);
    
    // Upload file with progress tracking
    const { data, error } = await supabase.storage
      .from(AUDIO_CONFIG.BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(AUDIO_CONFIG.BUCKET_NAME)
      .getPublicUrl(filePath);
    
    return {
      url: publicUrl,
      path: filePath,
      filename: file.name,
      size: file.size,
      duration: duration
    };
    
  } catch (error) {
    console.error('Audio upload error:', error);
    throw error;
  }
};

// Get signed URL for downloading audio file
export const getAudioDownloadUrl = async (filePath) => {
  if (!supabase) {
    throw new Error('Supabase not configured for audio downloads');
  }
  
  try {
    const { data, error } = await supabase.storage
      .from(AUDIO_CONFIG.BUCKET_NAME)
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    if (error) {
      throw new Error(`Failed to get download URL: ${error.message}`);
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Get download URL error:', error);
    throw error;
  }
};

// Delete audio file from storage
export const deleteAudioFile = async (filePath) => {
  if (!supabase) {
    throw new Error('Supabase not configured for audio deletion');
  }
  
  try {
    const { error } = await supabase.storage
      .from(AUDIO_CONFIG.BUCKET_NAME)
      .remove([filePath]);
    
    if (error) {
      throw new Error(`Failed to delete audio file: ${error.message}`);
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

// Extract file path from URL
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