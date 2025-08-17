import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for storage operations
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Debug environment variables
console.log('=== AUDIO STORAGE SERVICE DEBUG ===');
console.log('REACT_APP_SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'UNDEFINED');
console.log('REACT_APP_SUPABASE_ANON_KEY:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'UNDEFINED');
console.log('All REACT_APP env vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')));

// Validate environment variables
function isValidSupabaseConfig() {
  console.log('Validating Supabase config...');
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing environment variables:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
    return false;
  }
  
  // Check if they're still placeholder values
  if (supabaseUrl.includes('your_supabase_project_url_here') || 
      supabaseKey.includes('your_supabase_anon_key_here') ||
      supabaseUrl.includes('your-project.supabase.co') ||
      supabaseKey.includes('your-actual-anon-key')) {
    console.log('❌ Placeholder values detected in environment variables');
    return false;
  }
  
  // Validate URL format
  try {
    new URL(supabaseUrl);
    console.log('✅ Supabase config validation passed');
    return true;
  } catch (error) {
    console.log('❌ Invalid URL format:', error.message);
    return false;
  }
}

// Force production mode for testing (set to true to bypass demo mode)
const FORCE_PRODUCTION_MODE = false;

// Create Supabase client only if config is valid
let supabase = null;
if (isValidSupabaseConfig()) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized successfully for audio storage');
    console.log('🔗 Connected to:', supabaseUrl);
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
  }
} else {
  console.warn('⚠️  Supabase not configured. Audio upload will work in demo mode only.');
  console.warn('📝 To enable real Supabase Storage, update your .env file:');
  console.warn('   1. Uncomment the Supabase lines in .env');
  console.warn('   2. Replace with your actual values:');
  console.warn('      REACT_APP_SUPABASE_URL=https://your-project.supabase.co');
  console.warn('      REACT_APP_SUPABASE_ANON_KEY=your-actual-anon-key');
  console.warn('   3. Restart the development server (npm start)');
  console.warn('🔄 Current values detected:');
  console.warn('   URL:', supabaseUrl || 'UNDEFINED');
  console.warn('   KEY:', supabaseKey ? `${supabaseKey.substring(0, 8)}...` : 'UNDEFINED');
  
  if (FORCE_PRODUCTION_MODE) {
    console.warn('🚨 FORCE_PRODUCTION_MODE is enabled - this will cause errors!');
  }
}

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

// Demo upload function (when Supabase is not configured)
const uploadAudioFileDemo = async (file, userId, onProgress = null) => {
  console.log('Demo mode: Simulating audio upload...', { filename: file.name, size: file.size, userId });
  
  // Validate file
  const validation = validateAudioFile(file);
  if (!validation.isValid) {
    console.error('File validation failed:', validation.errors);
    throw new Error(validation.errors.join(', '));
  }
  
  try {
    // Simulate upload progress
    if (onProgress) {
      onProgress(10);
      await new Promise(resolve => setTimeout(resolve, 200));
      onProgress(40);
      await new Promise(resolve => setTimeout(resolve, 200));
      onProgress(70);
      await new Promise(resolve => setTimeout(resolve, 200));
      onProgress(100);
    }
    
    // Get audio duration
    let duration = null;
    try {
      duration = await getAudioDuration(file);
      console.log('Audio duration detected:', duration);
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
      uploadTime: Date.now(),
      isDemo: true
    };
    
    // Store in localStorage for demo persistence
    const storedAudio = JSON.parse(localStorage.getItem('demoAudioFiles') || '{}');
    storedAudio[filePath] = audioData;
    localStorage.setItem('demoAudioFiles', JSON.stringify(storedAudio));
    
    console.log('Demo audio upload completed:', audioData);
    return {
      url: audioData.url,
      path: audioData.path,
      filename: audioData.filename,
      size: audioData.size,
      duration: audioData.duration
    };
    
  } catch (error) {
    console.error('Demo audio upload error:', error);
    throw error;
  }
};

// Test Supabase Storage connection
export const testSupabaseStorageConnection = async () => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  try {
    console.log('🧪 Testing Supabase Storage connection...');
    
    // Test 1: List buckets to verify connection
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error('❌ Failed to list buckets:', bucketsError);
      throw bucketsError;
    }
    console.log('✅ Successfully connected to Supabase Storage');
    console.log('📂 Available buckets:', buckets.map(b => b.name));
    
    // Test 2: Check if audio-files bucket exists
    const audioFilesBucket = buckets.find(b => b.name === AUDIO_CONFIG.BUCKET_NAME);
    if (!audioFilesBucket) {
      console.warn('⚠️  Audio files bucket not found. Creating bucket...');
      const { data: newBucket, error: createError } = await supabase.storage.createBucket(AUDIO_CONFIG.BUCKET_NAME, {
        public: true,
        allowedMimeTypes: AUDIO_CONFIG.ALLOWED_TYPES,
        fileSizeLimit: AUDIO_CONFIG.MAX_FILE_SIZE
      });
      if (createError) {
        console.error('❌ Failed to create audio-files bucket:', createError);
        throw createError;
      }
      console.log('✅ Created audio-files bucket successfully');
    } else {
      console.log('✅ Audio-files bucket found');
    }
    
    // Test 3: Test file listing in the bucket
    const { data: files, error: listError } = await supabase.storage
      .from(AUDIO_CONFIG.BUCKET_NAME)
      .list('', { limit: 5 });
    
    if (listError) {
      console.error('❌ Failed to list files in bucket:', listError);
      throw listError;
    }
    
    console.log('✅ Bucket access verified');
    console.log('📁 Files in bucket:', files.length);
    
    return { success: true, buckets, files };
  } catch (error) {
    console.error('❌ Supabase Storage connection test failed:', error);
    throw error;
  }
};

// Upload audio file to Supabase Storage (with demo fallback)
export const uploadAudioFile = async (file, userId, onProgress = null) => {
  console.log('🎵 === AUDIO UPLOAD START ===');
  console.log('📄 File:', file.name, '| Size:', file.size, '| User:', userId);
  console.log('🔗 Supabase client available:', !!supabase);
  
  // If Supabase is not configured, use demo mode (unless forced)
  if (!supabase && !FORCE_PRODUCTION_MODE) {
    console.warn('⚠️  Supabase not configured - using demo mode for audio upload');
    return await uploadAudioFileDemo(file, userId, onProgress);
  }
  
  if (!supabase && FORCE_PRODUCTION_MODE) {
    console.error('🚨 FORCE_PRODUCTION_MODE enabled but Supabase client not available!');
    throw new Error('Supabase client not initialized - check environment variables');
  }
  
  // Test connection first
  try {
    await testSupabaseStorageConnection();
  } catch (error) {
    console.error('❌ Storage connection test failed, falling back to demo mode:', error);
    return await uploadAudioFileDemo(file, userId, onProgress);
  }
  
  console.log('✅ Starting audio upload to Supabase Storage...');
  
  // Validate file
  const validation = validateAudioFile(file);
  if (!validation.isValid) {
    console.error('File validation failed:', validation.errors);
    throw new Error(validation.errors.join(', '));
  }
  
  try {
    // Get audio duration
    let duration = null;
    try {
      duration = await getAudioDuration(file);
      console.log('Audio duration detected:', duration);
    } catch (error) {
      console.warn('Could not get audio duration:', error);
    }
    
    // Generate file path
    const filePath = generateAudioFilePath(userId, file.name);
    console.log('Generated file path:', filePath);
    
    // Simulate progress for initial feedback
    if (onProgress) onProgress(10);
    
    // Upload file to Supabase Storage
    console.log('📤 Uploading to Supabase Storage bucket:', AUDIO_CONFIG.BUCKET_NAME);
    console.log('📁 File path:', filePath);
    console.log('📊 Upload options:', {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });
    
    const { data, error } = await supabase.storage
      .from(AUDIO_CONFIG.BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });
    
    if (error) {
      console.error('❌ Supabase Storage upload error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error
      });
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    console.log('✅ Upload successful to Supabase Storage!');
    console.log('📄 Upload data:', data);
    if (onProgress) onProgress(80);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(AUDIO_CONFIG.BUCKET_NAME)
      .getPublicUrl(filePath);
    
    console.log('🔗 Generated public URL:', publicUrl);
    if (onProgress) onProgress(100);
    
    const result = {
      url: publicUrl,
      path: filePath,
      filename: file.name,
      size: file.size,
      duration: duration
    };
    
    console.log('🎉 Audio upload completed successfully!');
    console.log('📊 Final result:', result);
    console.log('🎵 === AUDIO UPLOAD END ===');
    return result;
    
  } catch (error) {
    console.error('Audio upload error:', error);
    throw error;
  }
};

// Get signed URL for downloading audio file (with demo fallback)
export const getAudioDownloadUrl = async (filePath) => {
  if (!supabase) {
    // Demo mode: get URL from localStorage
    try {
      const storedAudio = JSON.parse(localStorage.getItem('demoAudioFiles') || '{}');
      const audioData = storedAudio[filePath];
      
      if (!audioData) {
        throw new Error('Demo audio file not found');
      }
      
      return audioData.url;
    } catch (error) {
      console.error('Demo get download URL error:', error);
      throw error;
    }
  }
  
  try {
    console.log('Getting download URL for:', filePath);
    const { data, error } = await supabase.storage
      .from(AUDIO_CONFIG.BUCKET_NAME)
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    if (error) {
      console.error('Failed to get download URL:', error);
      throw new Error(`Failed to get download URL: ${error.message}`);
    }
    
    console.log('Download URL generated:', data.signedUrl);
    return data.signedUrl;
  } catch (error) {
    console.error('Get download URL error:', error);
    throw error;
  }
};

// Delete audio file from storage (with demo fallback)
export const deleteAudioFile = async (filePath) => {
  if (!supabase) {
    // Demo mode: delete from localStorage
    try {
      const storedAudio = JSON.parse(localStorage.getItem('demoAudioFiles') || '{}');
      
      if (storedAudio[filePath]) {
        // Revoke the blob URL to free memory
        URL.revokeObjectURL(storedAudio[filePath].url);
        
        // Remove from localStorage
        delete storedAudio[filePath];
        localStorage.setItem('demoAudioFiles', JSON.stringify(storedAudio));
        
        console.log('Demo audio file deleted successfully:', filePath);
      }
      
      return true;
    } catch (error) {
      console.error('Demo delete audio file error:', error);
      throw error;
    }
  }
  
  try {
    console.log('Deleting audio file from Storage:', filePath);
    const { error } = await supabase.storage
      .from(AUDIO_CONFIG.BUCKET_NAME)
      .remove([filePath]);
    
    if (error) {
      console.error('Failed to delete audio file:', error);
      throw new Error(`Failed to delete audio file: ${error.message}`);
    }
    
    console.log('Audio file deleted successfully:', filePath);
    return true;
  } catch (error) {
    console.error('Delete audio file error:', error);
    throw error;
  }
};

// Replace existing audio file
export const replaceAudioFile = async (oldFilePath, newFile, userId, onProgress = null) => {
  try {
    console.log('Replacing audio file:', { oldFilePath, newFilename: newFile.name });
    
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
    
    console.log('Audio file replaced successfully');
    return uploadResult;
  } catch (error) {
    console.error('Replace audio file error:', error);
    throw error;
  }
};

// Download audio file with proper filename
export const downloadAudioFile = async (filePath, filename) => {
  try {
    console.log('Downloading audio file:', { filePath, filename });
    const downloadUrl = await getAudioDownloadUrl(filePath);
    
    // Create download link
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('Audio file download initiated');
    return true;
  } catch (error) {
    console.error('Download audio file error:', error);
    throw error;
  }
};

// Extract file path from URL (with demo fallback)
export const extractFilePathFromUrl = (url) => {
  if (!url) return null;
  
  try {
    // Check if it's a demo blob URL first
    if (url.startsWith('blob:')) {
      // For demo mode, find the file path in localStorage by matching URL
      const storedAudio = JSON.parse(localStorage.getItem('demoAudioFiles') || '{}');
      
      for (const [filePath, audioData] of Object.entries(storedAudio)) {
        if (audioData.url === url) {
          return filePath;
        }
      }
      
      return null;
    }
    
    // For real Supabase URLs
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