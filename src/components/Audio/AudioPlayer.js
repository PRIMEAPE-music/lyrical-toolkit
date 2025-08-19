import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Download, 
  Trash2,
  RotateCcw,
  MoreHorizontal
} from 'lucide-react';
import audioStorageService from '../../services/audioStorageService';

const AudioPlayer = ({ 
  audioUrl, 
  audioFilename, 
  audioSize, 
  audioDuration,
  darkMode = false,
  onDownload = null,
  onRemove = null,
  onReplace = null,
  showControls = true,
  compact = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audioDuration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioUrl) return;

    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);
    const handleError = (e) => {
      setError('Failed to load audio file');
      setIsLoading(false);
      console.error('Audio load error:', e);
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl]);

  // Play/pause toggle
  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current || isLoading) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Play/pause error:', error);
      setError('Failed to play audio');
    }
  }, [isPlaying, isLoading]);

  // Seek to position
  const handleSeek = useCallback((e) => {
    if (!audioRef.current || !progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  // Volume control
  const handleVolumeChange = useCallback((newVolume) => {
    if (!audioRef.current) return;
    
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  // Mute toggle
  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // Download handler
  const handleDownload = useCallback(async () => {
    if (!onDownload) return;
    
    try {
      await onDownload();
    } catch (error) {
      console.error('Download error:', error);
    }
  }, [onDownload]);

  // Format time display
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) {
    return null;
  }

  if (error) {
    return (
      <div className={`p-3 rounded border ${
        darkMode 
          ? 'border-red-500 bg-red-900/20 text-red-300' 
          : 'border-red-300 bg-red-50 text-red-600'
      }`}>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`audio-player ${
      compact ? 'p-2' : 'p-4'
    } rounded-lg border ${
      darkMode 
        ? 'border-gray-600 bg-gray-800' 
        : 'border-gray-200 bg-white'
    }`}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />
      
      {/* Audio info */}
      {!compact && audioFilename && (
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-medium truncate ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {audioFilename}
              </h4>
              {(audioSize || audioDuration) && (
                <p className={`text-xs mt-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {audioSize && audioStorageService.formatFileSize(audioSize)}
                  {audioSize && audioDuration && ' • '}
                  {audioDuration && audioStorageService.formatDuration(audioDuration)}
                </p>
              )}
            </div>
            
            {/* Menu button */}
            {showControls && (onDownload || onRemove || onReplace) && (
              <div className="relative ml-2">
                <button
                  onClick={() => {
                    console.log('🔘 Menu button clicked, current showMenu:', showMenu);
                    setShowMenu(!showMenu);
                  }}
                  className={`p-1 rounded hover:bg-opacity-75 ${
                    darkMode 
                      ? 'text-gray-400 hover:bg-gray-700' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                
                {showMenu && (
                  <div className={`absolute right-0 top-full mt-1 py-1 min-w-[120px] rounded-lg border shadow-lg z-10 ${
                    darkMode 
                      ? 'border-gray-600 bg-gray-800' 
                      : 'border-gray-200 bg-white'
                  }`}>
                    {onDownload && (
                      <button
                        onClick={() => {
                          console.log('💾 Download audio button clicked');
                          handleDownload();
                          setShowMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-opacity-75 ${
                          darkMode 
                            ? 'text-gray-300 hover:bg-gray-700' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    )}
                    
                    {onReplace && (
                      <button
                        onClick={() => {
                          console.log('🔄 Replace audio button clicked');
                          onReplace();
                          setShowMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-opacity-75 ${
                          darkMode 
                            ? 'text-gray-300 hover:bg-gray-700' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Replace
                      </button>
                    )}
                    
                    {onRemove && (
                      <button
                        onClick={() => {
                          console.log('🗑️ Remove audio button clicked');
                          onRemove();
                          setShowMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-opacity-75 ${
                          darkMode 
                            ? 'text-red-300 hover:bg-red-900/20' 
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Player controls */}
      <div className="space-y-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <div
            ref={progressRef}
            className={`relative h-2 rounded-full cursor-pointer ${
              darkMode ? 'bg-gray-700' : 'bg-gray-200'
            }`}
            onClick={handleSeek}
          >
            <div 
              className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all duration-100"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          
          {/* Time display */}
          <div className={`flex justify-between text-xs ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Control buttons */}
        <div className="flex items-center justify-between">
          {/* Play/pause button */}
          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
              isLoading 
                ? darkMode 
                  ? 'bg-gray-700 text-gray-500' 
                  : 'bg-gray-200 text-gray-400'
                : darkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>
          
          {/* Volume control */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className={`p-1 rounded transition-colors ${
                darkMode 
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className={`w-16 h-2 rounded-lg appearance-none cursor-pointer ${
                darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(isMuted ? 0 : volume) * 100}%, ${
                  darkMode ? '#374151' : '#e5e7eb'
                } ${(isMuted ? 0 : volume) * 100}%, ${
                  darkMode ? '#374151' : '#e5e7eb'
                } 100%)`
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default AudioPlayer;