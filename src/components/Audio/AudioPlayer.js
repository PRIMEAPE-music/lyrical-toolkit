import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Download, 
  Trash2,
  RotateCcw,
  MoreHorizontal,
  Repeat,
  X
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
  compact = false,
  hideMenu = false
}) => {
  // Create unique ID for this component instance
  const componentId = useRef(Math.random().toString(36).substr(2, 9));
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audioDuration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  // A-B Loop functionality state
  const [loopStart, setLoopStart] = useState(null);
  const [loopEnd, setLoopEnd] = useState(null);
  const [isLooping, setIsLooping] = useState(false);
  const [showLoopMarkers, setShowLoopMarkers] = useState(false);
  const [draggingMarker, setDraggingMarker] = useState(null); // 'start' or 'end' or null
  const [markerTooltip, setMarkerTooltip] = useState(null); // { type: 'start'|'end', time: number, x: number }
  
  // Debug re-renders
  useEffect(() => {
    // console.log(`🔄 AudioPlayer [${componentId.current}] re-rendered:`, {
    //   showMenu,
    //   showVolumeSlider,
    //   hideMenu,
    //   compact,
    //   duration,
    //   currentTime,
    //   audioUrl: !!audioUrl
    // });
  });
  
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const dropdownRef = useRef(null);
  const volumeSliderRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);

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
    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      setCurrentTime(currentTime);
      
      // A-B Loop logic
      if (isLooping && loopStart !== null && loopEnd !== null) {
        if (currentTime >= loopEnd) {
          audio.currentTime = loopStart;
        }
      }
    };
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

  // Handle click outside to close menu
  useEffect(() => {
    if (!showMenu) return;
    
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        console.log(`🔘 [${componentId.current}] Click outside detected, closing menu`);
        setShowMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Handle click outside to close volume slider
  useEffect(() => {
    if (!showVolumeSlider) return;
    
    const handleClickOutside = (e) => {
      if (volumeSliderRef.current && !volumeSliderRef.current.contains(e.target)) {
        setShowVolumeSlider(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVolumeSlider]);

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
    // console.log('🎯 handleSeek called - event:', e);
    if (!audioRef.current || !progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    // console.log('🎯 Seeking to:', newTime, 'duration:', duration, 'percentage:', percentage);
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

  // Volume button toggle (mute/unmute or show/hide volume slider)
  const toggleVolume = useCallback(() => {
    if (hideMenu && compact) {
      // In notepad mode, toggle volume slider visibility
      setShowVolumeSlider(!showVolumeSlider);
    } else {
      // In normal mode, toggle mute
      // console.log('🔊 Normal mode - toggling mute');
      if (!audioRef.current) return;
      
      if (isMuted) {
        audioRef.current.volume = volume || 0.5;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [hideMenu, compact, showVolumeSlider, isMuted, volume]);

  // Mute toggle (for backwards compatibility)
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

  // A-B Loop functionality
  const toggleLoopMarkers = useCallback(() => {
    setShowLoopMarkers(!showLoopMarkers);
    if (showLoopMarkers) {
      // Hide markers, clear loop
      clearLoop();
    } else {
      // Show markers, set default positions if none exist
      if (loopStart === null || loopEnd === null) {
        const quarterDuration = duration * 0.25;
        const threeQuarterDuration = duration * 0.75;
        setLoopStart(quarterDuration);
        setLoopEnd(threeQuarterDuration);
      }
    }
  }, [showLoopMarkers, loopStart, loopEnd, duration]);

  const toggleLoop = useCallback(() => {
    if (loopStart === null || loopEnd === null) return;
    setIsLooping(!isLooping);
  }, [isLooping, loopStart, loopEnd]);

  const clearLoop = useCallback(() => {
    setLoopStart(null);
    setLoopEnd(null);
    setIsLooping(false);
    setShowLoopMarkers(false);
    setDraggingMarker(null);
    setMarkerTooltip(null);
  }, []);

  const calculateMarkerPosition = useCallback((time) => {
    if (!duration) return 0;
    return (time / duration) * 100;
  }, [duration]);

  const calculateTimeFromPosition = useCallback((clientX) => {
    if (!progressRef.current || !duration) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    return percentage * duration;
  }, [duration]);

  const handleMarkerDragStart = useCallback((markerType, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingMarker(markerType);
    
    const handleMouseMove = (e) => {
      const newTime = calculateTimeFromPosition(e.clientX);
      
      if (markerType === 'start') {
        const maxTime = loopEnd !== null ? loopEnd - 0.1 : duration;
        const clampedTime = Math.max(0, Math.min(newTime, maxTime));
        setLoopStart(clampedTime);
        setMarkerTooltip({ type: 'start', time: clampedTime, x: e.clientX });
      } else {
        const minTime = loopStart !== null ? loopStart + 0.1 : 0;
        const clampedTime = Math.max(minTime, Math.min(newTime, duration));
        setLoopEnd(clampedTime);
        setMarkerTooltip({ type: 'end', time: clampedTime, x: e.clientX });
      }
    };
    
    const handleMouseUp = () => {
      setDraggingMarker(null);
      setMarkerTooltip(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [loopStart, loopEnd, duration, calculateTimeFromPosition]);

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
    } ${compact ? '' : 'rounded-lg border'} ${
      !compact && (darkMode 
        ? 'border-gray-600 bg-gray-800' 
        : 'border-gray-200 bg-white')
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🔘 [${componentId.current}] Menu button clicked, current showMenu:`, showMenu, 'setting to:', !showMenu);
                    setShowMenu(!showMenu);
                    // Verify the state was set
                    setTimeout(() => {
                      console.log(`🔘 [${componentId.current}] After setState timeout, showMenu should be:`, !showMenu);
                    }, 0);
                  }}
                  className={`p-1 rounded hover:bg-opacity-75 ${
                    darkMode 
                      ? 'text-gray-400 hover:bg-gray-700' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                
                {(() => {
                  if (showMenu) {
                    console.log(`📋 [${componentId.current}] Rendering menu dropdown`);
                  }
                  return showMenu;
                })() && (
                  <div 
                    ref={dropdownRef}
                    className={`absolute right-0 top-full mt-1 py-1 min-w-[120px] rounded-lg border shadow-lg z-20 ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-800' 
                        : 'border-gray-200 bg-white'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(`📋 [${componentId.current}] Click inside dropdown menu`);
                    }}
                  >
                    {onDownload && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('💾 Download audio button clicked');
                          handleDownload();
                          setShowMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-opacity-75 audio-menu-button ${
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
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🔄 Replace audio button clicked');
                          onReplace();
                          setShowMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-opacity-75 audio-menu-button ${
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
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🗑️ Remove audio button clicked');
                          onRemove();
                          setShowMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-opacity-75 audio-menu-button ${
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
      {compact ? (
        /* Compact horizontal layout: [Play] [Seek Bar] [Volume] [Time Display] */
        <div className="relative flex items-center gap-2 w-full">
          {/* Play/pause button */}
          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors flex-shrink-0 ${
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
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>
          
          {/* Loop control buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Toggle loop markers button */}
            <button
              onClick={toggleLoopMarkers}
              className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${
                showLoopMarkers
                  ? darkMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : darkMode
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title={showLoopMarkers ? "Hide loop markers" : "Show loop markers"}
            >
              <Repeat className="w-3 h-3" />
            </button>
            
            {/* Toggle loop active button */}
            {showLoopMarkers && loopStart !== null && loopEnd !== null && (
              <button
                onClick={toggleLoop}
                className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${
                  isLooping
                    ? darkMode
                      ? 'bg-green-600 text-white'
                      : 'bg-green-500 text-white'
                    : darkMode
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title={isLooping ? "Disable A-B loop" : "Enable A-B loop"}
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
            
            {/* Clear loop button */}
            {showLoopMarkers && (
              <button
                onClick={clearLoop}
                className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${
                  darkMode
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Clear loop markers"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          {/* Progress bar - flexible width */}
          <div 
            className="mx-2" 
            style={{ 
              flex: 1, 
              minWidth: '100px'
            }}
          >
            <div
              ref={progressRef}
              className={`relative rounded-full cursor-pointer border`}
              style={{
                height: '16px',
                backgroundColor: darkMode ? '#6b7280' : '#d1d5db',
                borderColor: darkMode ? '#9ca3af' : '#6b7280',
                width: '100%'
              }}
              onClick={handleSeek}
            >
              {/* Loop range overlay */}
              {showLoopMarkers && loopStart !== null && loopEnd !== null && (
                <div
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    left: `${calculateMarkerPosition(loopStart)}%`,
                    width: `${calculateMarkerPosition(loopEnd) - calculateMarkerPosition(loopStart)}%`,
                    backgroundColor: isLooping 
                      ? (darkMode ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)')
                      : (darkMode ? 'rgba(156, 163, 175, 0.3)' : 'rgba(156, 163, 175, 0.2)'),
                    borderLeft: `2px solid ${isLooping ? '#22c55e' : '#9ca3af'}`,
                    borderRight: `2px solid ${isLooping ? '#22c55e' : '#9ca3af'}`,
                  }}
                />
              )}
              
              {/* Current progress bar */}
              <div 
                className="absolute left-0 top-0 bg-blue-500 rounded-full transition-all duration-100"
                style={{ 
                  width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                  height: '100%',
                  backgroundColor: '#3b82f6', // Force blue color
                  minWidth: currentTime > 0 ? '2px' : '0px' // Ensure visibility when playing
                }}
              />
              
              {/* Loop start marker (A) */}
              {showLoopMarkers && loopStart !== null && (
                <div
                  ref={startMarkerRef}
                  className="absolute top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing"
                  style={{
                    left: `${calculateMarkerPosition(loopStart)}%`,
                    marginLeft: '-8px',
                    zIndex: 10
                  }}
                  onMouseDown={(e) => handleMarkerDragStart('start', e)}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: isLooping ? '#22c55e' : '#9ca3af',
                      borderColor: darkMode ? '#1f2937' : '#ffffff',
                      color: '#ffffff'
                    }}
                  >
                    A
                  </div>
                </div>
              )}
              
              {/* Loop end marker (B) */}
              {showLoopMarkers && loopEnd !== null && (
                <div
                  ref={endMarkerRef}
                  className="absolute top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing"
                  style={{
                    left: `${calculateMarkerPosition(loopEnd)}%`,
                    marginLeft: '-8px',
                    zIndex: 10
                  }}
                  onMouseDown={(e) => handleMarkerDragStart('end', e)}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: isLooping ? '#22c55e' : '#9ca3af',
                      borderColor: darkMode ? '#1f2937' : '#ffffff',
                      color: '#ffffff'
                    }}
                  >
                    B
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Volume button with dropdown toggle */}
          <div className="relative flex-shrink-0">
            <button
              onClick={toggleVolume}
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
            
            {/* Volume slider dropdown - position below button, align to right */}
            {hideMenu && showVolumeSlider && (
              <div 
                ref={volumeSliderRef}
                className={`absolute top-full right-0 mt-1 p-2 rounded-lg border shadow-lg z-50 ${
                  darkMode 
                    ? 'border-gray-600 bg-gray-800' 
                    : 'border-gray-200 bg-white'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
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
            )}
          </div>
          
          {/* Menu button - hide when hideMenu is true */}
          {!hideMenu && showControls && (onDownload || onRemove || onReplace) && (
            <div className="relative flex-shrink-0">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log(`🔘 [${componentId.current}] Menu button clicked, current showMenu:`, showMenu, 'setting to:', !showMenu);
                  setShowMenu(!showMenu);
                  // Verify the state was set
                  setTimeout(() => {
                    console.log(`🔘 [${componentId.current}] After setState timeout, showMenu should be:`, !showMenu);
                  }, 0);
                }}
                className={`p-1 rounded hover:bg-opacity-75 ${
                  darkMode 
                    ? 'text-gray-400 hover:bg-gray-700' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              
              {(() => {
                if (showMenu) {
                  console.log(`📋 [${componentId.current}] Rendering menu dropdown`);
                }
                return showMenu;
              })() && (
                <div 
                  ref={dropdownRef}
                  className={`absolute right-0 top-full mt-1 py-1 min-w-[120px] rounded-lg border shadow-lg z-20 ${
                    darkMode 
                      ? 'border-gray-600 bg-gray-800' 
                      : 'border-gray-200 bg-white'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log(`📋 [${componentId.current}] Click inside dropdown menu`);
                  }}
                >
                  {onDownload && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('💾 Download audio button clicked');
                        handleDownload();
                        setShowMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-opacity-75 audio-menu-button ${
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
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔄 Replace audio button clicked');
                        onReplace();
                        setShowMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-opacity-75 audio-menu-button ${
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
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🗑️ Remove audio button clicked');
                        onRemove();
                        setShowMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-opacity-75 audio-menu-button ${
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
          
          {/* Time display in compact mode */}
          <div className={`text-xs whitespace-nowrap flex-shrink-0 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      ) : (
        /* Original vertical layout for non-compact mode */
        <div className="space-y-3">
          {/* Loop control buttons for vertical layout */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLoopMarkers}
              className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                showLoopMarkers
                  ? darkMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : darkMode
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title={showLoopMarkers ? "Hide loop markers" : "Show loop markers"}
            >
              <Repeat className="w-4 h-4" />
            </button>
            
            {showLoopMarkers && loopStart !== null && loopEnd !== null && (
              <button
                onClick={toggleLoop}
                className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                  isLooping
                    ? darkMode
                      ? 'bg-green-600 text-white'
                      : 'bg-green-500 text-white'
                    : darkMode
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title={isLooping ? "Disable A-B loop" : "Enable A-B loop"}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            
            {showLoopMarkers && (
              <button
                onClick={clearLoop}
                className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                  darkMode
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Clear loop markers"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Progress bar */}
          <div className="space-y-1">
            <div
              ref={progressRef}
              className={`relative h-2 rounded-full cursor-pointer ${
                darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
              onClick={handleSeek}
            >
              {/* Loop range overlay for vertical layout */}
              {showLoopMarkers && loopStart !== null && loopEnd !== null && (
                <div
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    left: `${calculateMarkerPosition(loopStart)}%`,
                    width: `${calculateMarkerPosition(loopEnd) - calculateMarkerPosition(loopStart)}%`,
                    backgroundColor: isLooping 
                      ? (darkMode ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)')
                      : (darkMode ? 'rgba(156, 163, 175, 0.3)' : 'rgba(156, 163, 175, 0.2)'),
                    borderLeft: `2px solid ${isLooping ? '#22c55e' : '#9ca3af'}`,
                    borderRight: `2px solid ${isLooping ? '#22c55e' : '#9ca3af'}`,
                  }}
                />
              )}
              
              <div 
                className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all duration-100"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
              
              {/* Loop start marker (A) for vertical layout */}
              {showLoopMarkers && loopStart !== null && (
                <div
                  className="absolute top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing"
                  style={{
                    left: `${calculateMarkerPosition(loopStart)}%`,
                    marginLeft: '-6px',
                    zIndex: 10
                  }}
                  onMouseDown={(e) => handleMarkerDragStart('start', e)}
                >
                  <div
                    className="w-3 h-3 rounded-full border-2 flex items-center justify-center"
                    style={{
                      backgroundColor: isLooping ? '#22c55e' : '#9ca3af',
                      borderColor: darkMode ? '#1f2937' : '#ffffff',
                      fontSize: '8px',
                      color: '#ffffff',
                      fontWeight: 'bold'
                    }}
                  >
                    A
                  </div>
                </div>
              )}
              
              {/* Loop end marker (B) for vertical layout */}
              {showLoopMarkers && loopEnd !== null && (
                <div
                  className="absolute top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing"
                  style={{
                    left: `${calculateMarkerPosition(loopEnd)}%`,
                    marginLeft: '-6px',
                    zIndex: 10
                  }}
                  onMouseDown={(e) => handleMarkerDragStart('end', e)}
                >
                  <div
                    className="w-3 h-3 rounded-full border-2 flex items-center justify-center"
                    style={{
                      backgroundColor: isLooping ? '#22c55e' : '#9ca3af',
                      borderColor: darkMode ? '#1f2937' : '#ffffff',
                      fontSize: '8px',
                      color: '#ffffff',
                      fontWeight: 'bold'
                    }}
                  >
                    B
                  </div>
                </div>
              )}
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
      )}
      
      {/* Marker tooltip */}
      {markerTooltip && (
        <div
          className="fixed px-2 py-1 text-xs rounded shadow-lg z-50 pointer-events-none"
          style={{
            left: markerTooltip.x,
            top: -30,
            backgroundColor: darkMode ? '#1f2937' : '#ffffff',
            color: darkMode ? '#ffffff' : '#000000',
            border: `1px solid ${darkMode ? '#6b7280' : '#d1d5db'}`,
            transform: 'translateX(-50%)'
          }}
        >
          {markerTooltip.type === 'start' ? 'A: ' : 'B: '}{formatTime(markerTooltip.time)}
        </div>
      )}
      
    </div>
  );
};

export default AudioPlayer;