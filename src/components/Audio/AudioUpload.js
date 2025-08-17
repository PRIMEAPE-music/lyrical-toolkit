import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Music, TestTube } from 'lucide-react';
import audioStorageService, { testSupabaseStorageConnection } from '../../services/audioStorageService';

const AudioUpload = ({ 
  onUploadSuccess, 
  onUploadError, 
  disabled = false,
  darkMode = false,
  currentAudio = null,
  allowReplace = false,
  userId = null  // Pass userId from parent component
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error', null
  const [statusMessage, setStatusMessage] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const fileInputRef = useRef(null);

  // Handle file selection (drag & drop or click)
  const handleFileSelect = useCallback(async (files) => {
    if (disabled || isUploading || !files.length) return;

    const file = files[0];
    
    // Validate file
    const validation = audioStorageService.validateAudioFile(file);
    if (!validation.isValid) {
      setUploadStatus('error');
      setStatusMessage(validation.errors.join(', '));
      onUploadError?.(new Error(validation.errors.join(', ')));
      return;
    }

    // Start upload
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus(null);
    setStatusMessage('Uploading audio file...');

    try {
      // Use userId passed from parent, or fallback to anonymous
      const uploadUserId = userId || 'anonymous';
      
      // Upload file with progress
      const result = await audioStorageService.uploadAudioFile(
        file, 
        uploadUserId,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // Success
      setUploadStatus('success');
      setStatusMessage(`Successfully uploaded ${file.name}`);
      setUploadProgress(100);
      
      onUploadSuccess?.(result);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setStatusMessage(error.message || 'Upload failed');
      onUploadError?.(error);
    } finally {
      setIsUploading(false);
      
      // Clear status after delay
      setTimeout(() => {
        setUploadStatus(null);
        setStatusMessage('');
        setUploadProgress(0);
      }, 3000);
    }
  }, [disabled, isUploading, onUploadSuccess, onUploadError]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    handleFileSelect(files);
  }, [disabled, isUploading, handleFileSelect]);

  // File input change handler
  const handleFileInputChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    handleFileSelect(files);
    
    // Clear input for re-upload
    e.target.value = '';
  }, [handleFileSelect]);

  // Open file browser
  const openFileBrowser = useCallback(() => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, isUploading]);

  // Test Supabase Storage connection
  const testConnection = useCallback(async () => {
    setTestingConnection(true);
    setUploadStatus(null);
    setStatusMessage('Testing Supabase Storage connection...');
    
    try {
      const result = await testSupabaseStorageConnection();
      setUploadStatus('success');
      setStatusMessage(`✅ Connection successful! Found ${result.buckets.length} buckets, ${result.files.length} files`);
      console.log('🧪 Connection test result:', result);
    } catch (error) {
      setUploadStatus('error');
      setStatusMessage(`❌ Connection failed: ${error.message}`);
      console.error('🧪 Connection test failed:', error);
    } finally {
      setTestingConnection(false);
      
      // Clear status after delay
      setTimeout(() => {
        setUploadStatus(null);
        setStatusMessage('');
      }, 5000);
    }
  }, []);

  // Get status icon
  const getStatusIcon = () => {
    if (isUploading) {
      return <Upload className="w-5 h-5 animate-spin" />;
    }
    if (uploadStatus === 'success') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (uploadStatus === 'error') {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    return <Music className="w-5 h-5" />;
  };

  // Get container classes
  const getContainerClasses = () => {
    const baseClasses = `
      relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer
      ${disabled || isUploading ? 'cursor-not-allowed' : 'cursor-pointer'}
    `;
    
    if (disabled || isUploading) {
      return `${baseClasses} ${
        darkMode 
          ? 'border-gray-700 bg-gray-800 text-gray-500' 
          : 'border-gray-200 bg-gray-50 text-gray-400'
      }`;
    }
    
    if (isDragging) {
      return `${baseClasses} ${
        darkMode 
          ? 'border-blue-400 bg-blue-900/20 text-blue-300' 
          : 'border-blue-400 bg-blue-50 text-blue-600'
      }`;
    }
    
    if (uploadStatus === 'success') {
      return `${baseClasses} ${
        darkMode 
          ? 'border-green-500 bg-green-900/20 text-green-300' 
          : 'border-green-400 bg-green-50 text-green-600'
      }`;
    }
    
    if (uploadStatus === 'error') {
      return `${baseClasses} ${
        darkMode 
          ? 'border-red-500 bg-red-900/20 text-red-300' 
          : 'border-red-400 bg-red-50 text-red-600'
      }`;
    }
    
    return `${baseClasses} ${
      darkMode 
        ? 'border-gray-600 hover:border-gray-500 bg-gray-800 text-gray-300 hover:bg-gray-700' 
        : 'border-gray-300 hover:border-gray-400 bg-white text-gray-600 hover:bg-gray-50'
    }`;
  };

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={audioStorageService.AUDIO_CONFIG.ALLOWED_TYPES.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
      
      {/* Upload area */}
      <div
        className={getContainerClasses()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileBrowser}
      >
        {/* Status icon */}
        <div className="mb-3">
          {getStatusIcon()}
        </div>
        
        {/* Upload text */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium">
            {currentAudio && allowReplace 
              ? 'Replace Audio File' 
              : 'Upload Audio File'
            }
          </h3>
          
          {isUploading ? (
            <div className="space-y-2">
              <p className="text-sm">{statusMessage}</p>
              {/* Progress bar */}
              <div className={`w-full h-2 rounded-full overflow-hidden ${
                darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}>
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs opacity-75">{uploadProgress.toFixed(0)}%</p>
            </div>
          ) : uploadStatus ? (
            <p className="text-sm">{statusMessage}</p>
          ) : (
            <div className="space-y-1">
              <p className="text-sm">
                Drag and drop your audio file here, or click to browse
              </p>
              <p className="text-xs opacity-75">
                Supports MP3, WAV, M4A • Max {audioStorageService.AUDIO_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB
              </p>
            </div>
          )}
        </div>
        
        {/* Current audio info */}
        {currentAudio && (
          <div className={`mt-4 p-3 rounded border ${
            darkMode 
              ? 'border-gray-600 bg-gray-700' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm font-medium">{currentAudio.filename}</p>
                <p className="text-xs opacity-75">
                  {audioStorageService.formatFileSize(currentAudio.size)} • {' '}
                  {audioStorageService.formatDuration(currentAudio.duration)}
                </p>
              </div>
              <Music className="w-4 h-4 opacity-50" />
            </div>
          </div>
        )}
      </div>
      
      {/* Test Connection Button */}
      <div className="mt-3 text-center">
        <button
          onClick={testConnection}
          disabled={disabled || isUploading || testingConnection}
          className={`inline-flex items-center gap-2 px-3 py-1 text-xs rounded transition-colors ${
            disabled || isUploading || testingConnection
              ? darkMode 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : darkMode 
                ? 'bg-blue-700 hover:bg-blue-600 text-blue-200' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <TestTube className="w-3 h-3" />
          {testingConnection ? 'Testing...' : 'Test Storage Connection'}
        </button>
      </div>

      {/* Additional info */}
      <div className="mt-2 text-xs opacity-75 text-center">
        {disabled && (
          <p>Audio upload is temporarily disabled</p>
        )}
      </div>
    </div>
  );
};

export default AudioUpload;