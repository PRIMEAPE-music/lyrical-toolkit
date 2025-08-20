import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
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
  const [showLoopMarkers, setShowLoopMarkers] = useState(false);
  // draggingMarker removed - now handled by WaveSurfer regions
  const [markerTooltip, setMarkerTooltip] = useState(null); // { type: 'start'|'end', time: number, x: number }
  
  // WaveSurfer state
  const [waveSurfer, setWaveSurfer] = useState(null);
  const [regionsPlugin, setRegionsPlugin] = useState(null);
  const [waveformLoading, setWaveformLoading] = useState(false);
  const [currentRegion, setCurrentRegion] = useState(null);
  
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
  const waveformRef = useRef(null);
  const waveformRefVertical = useRef(null);
  const dropdownRef = useRef(null);
  const volumeSliderRef = useRef(null);
  const menuButtonRef = useRef(null);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!audioUrl) return;

    const initializeWaveSurfer = () => {
      const containerRef = compact ? waveformRef : waveformRefVertical;
      if (!containerRef.current) return;

      setWaveformLoading(true);
      
      // Create regions plugin
      const regions = RegionsPlugin.create();
      setRegionsPlugin(regions);

      // Create WaveSurfer instance
      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: darkMode ? '#6b7280' : '#d1d5db',
        progressColor: '#3b82f6',
        cursorColor: '#3b82f6',
        barWidth: 2,
        barRadius: 1,
        responsive: true,
        height: compact ? 16 : 8,
        normalize: true,
        plugins: [regions],
        mediaControls: false,
        interact: true
      });

      // Event listeners
      ws.on('ready', () => {
        setDuration(ws.getDuration());
        setIsLoading(false);
        setWaveformLoading(false);
      });

      ws.on('loading', (percent) => {
        if (percent < 100) {
          setWaveformLoading(true);
        } else {
          setWaveformLoading(false);
        }
      });

      ws.on('audioprocess', (time) => {
        setCurrentTime(time);
        
        // A-B Loop logic
        const LOOP_TOLERANCE = 0.1;
        if (showLoopMarkers && loopStart !== null && loopEnd !== null) {
          if (time >= (loopEnd - LOOP_TOLERANCE)) {
            ws.seekTo(loopStart / ws.getDuration());
            return;
          }
        }
      });

      ws.on('play', () => setIsPlaying(true));
      ws.on('pause', () => setIsPlaying(false));
      ws.on('finish', () => setIsPlaying(false));
      
      ws.on('error', (error) => {
        setError('Failed to load audio file');
        setIsLoading(false);
        setWaveformLoading(false);
        console.error('WaveSurfer error:', error);
      });

      ws.load(audioUrl);
      setWaveSurfer(ws);
    };

    initializeWaveSurfer();

    return () => {
      if (waveSurfer) {
        waveSurfer.destroy();
        setWaveSurfer(null);
      }
    };
  }, [audioUrl, compact, darkMode, showLoopMarkers, loopStart, loopEnd, waveSurfer]);

  // Update WaveSurfer colors when theme changes
  useEffect(() => {
    if (waveSurfer) {
      waveSurfer.setOptions({
        waveColor: darkMode ? '#6b7280' : '#d1d5db',
        progressColor: '#3b82f6',
        cursorColor: '#3b82f6'
      });
    }
  }, [darkMode, waveSurfer]);

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
    if (!waveSurfer || isLoading || waveformLoading) return;

    try {
      if (isPlaying) {
        waveSurfer.pause();
      } else {
        waveSurfer.play();
      }
    } catch (error) {
      console.error('Play/pause error:', error);
      setError('Failed to play audio');
    }
  }, [waveSurfer, isPlaying, isLoading, waveformLoading]);

  // WaveSurfer handles seeking automatically through click events

  // Volume control
  const handleVolumeChange = useCallback((newVolume) => {
    if (!waveSurfer) return;
    
    waveSurfer.setVolume(newVolume);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, [waveSurfer]);

  // Volume button toggle (mute/unmute or show/hide volume slider)
  const toggleVolume = useCallback(() => {
    if (hideMenu && compact) {
      // In notepad mode, toggle volume slider visibility
      setShowVolumeSlider(!showVolumeSlider);
    } else {
      // In normal mode, toggle mute
      if (!waveSurfer) return;
      
      if (isMuted) {
        waveSurfer.setVolume(volume || 0.5);
        setIsMuted(false);
      } else {
        waveSurfer.setVolume(0);
        setIsMuted(true);
      }
    }
  }, [waveSurfer, hideMenu, compact, showVolumeSlider, isMuted, volume]);

  // Mute toggle (for backwards compatibility)
  const toggleMute = useCallback(() => {
    if (!waveSurfer) return;
    
    if (isMuted) {
      waveSurfer.setVolume(volume || 0.5);
      setIsMuted(false);
    } else {
      waveSurfer.setVolume(0);
      setIsMuted(true);
    }
  }, [waveSurfer, isMuted, volume]);

  // Download handler
  const handleDownload = useCallback(async () => {
    if (!onDownload) return;
    
    try {
      await onDownload();
    } catch (error) {
      console.error('Download error:', error);
    }
  }, [onDownload]);

  // A-B Loop functionality with WaveSurfer regions
  const toggleLoopMarkers = useCallback(() => {
    if (!waveSurfer || !regionsPlugin) return;
    
    if (showLoopMarkers) {
      // Hide markers and disable loop functionality
      setShowLoopMarkers(false);
      setMarkerTooltip(null);
      if (currentRegion) {
        currentRegion.remove();
        setCurrentRegion(null);
      }
      setLoopStart(null);
      setLoopEnd(null);
    } else {
      // Show markers and set default positions
      setShowLoopMarkers(true);
      if (duration > 0) {
        const quarterDuration = duration * 0.25;
        const threeQuarterDuration = duration * 0.75;
        setLoopStart(quarterDuration);
        setLoopEnd(threeQuarterDuration);
        
        // Create region
        const region = regionsPlugin.addRegion({
          start: quarterDuration,
          end: threeQuarterDuration,
          color: darkMode ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)',
          drag: true,
          resize: true
        });
        setCurrentRegion(region);
        
        // Handle region updates
        region.on('update-end', () => {
          setLoopStart(region.start);
          setLoopEnd(region.end);
        });
      }
    }
  }, [waveSurfer, regionsPlugin, showLoopMarkers, duration, darkMode, currentRegion]);

  // Old marker functions removed - now handled by WaveSurfer regions

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
            disabled={isLoading || waveformLoading}
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
            {(isLoading || waveformLoading) ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>
          
          {/* A-B Loop toggle button */}
          <button
            onClick={toggleLoopMarkers}
            className={`flex items-center justify-center w-6 h-6 rounded transition-colors flex-shrink-0 ${
              showLoopMarkers
                ? darkMode
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-700'
                : darkMode
                  ? 'text-black hover:text-white hover:bg-gray-700'
                  : 'text-black hover:text-gray-700 hover:bg-gray-100'
            }`}
            title={showLoopMarkers ? "Hide A-B loop markers" : "Show A-B loop markers"}
          >
            <span className="text-xs font-bold">Loop</span>
          </button>
          
          {/* WaveSurfer container - flexible width */}
          <div 
            className="mx-2 relative" 
            style={{ 
              flex: 1, 
              minWidth: '100px'
            }}
          >
            {/* Loading state for waveform */}
            {waveformLoading && (
              <div 
                className={`absolute inset-0 flex items-center justify-center rounded-full border z-10 ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'}`}
                style={{ height: '16px' }}
              >
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            {/* WaveSurfer container for compact mode */}
            <div 
              ref={waveformRef}
              className="rounded-full overflow-hidden"
              style={{
                height: '16px',
                width: '100%',
                opacity: waveformLoading ? 0.3 : 1
              }}
            />
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
          
          {/* WaveSurfer container */}
          <div className="space-y-1">
            {/* Loading state for waveform */}
            {waveformLoading && (
              <div 
                className={`relative flex items-center justify-center rounded-full border ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'}`}
                style={{ height: '8px', width: '100%' }}
              >
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            {/* WaveSurfer container for vertical mode */}
            <div 
              ref={waveformRefVertical}
              className="rounded-full overflow-hidden"
              style={{
                height: '8px',
                width: '100%',
                opacity: waveformLoading ? 0.3 : 1
              }}
            />
            
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
            <div className="flex items-center gap-2">
              {/* Play/pause button */}
              <button
                onClick={togglePlayPause}
                disabled={isLoading || waveformLoading}
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
                {(isLoading || waveformLoading) ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>
              
              {/* A-B Loop toggle button for vertical layout */}
              <button
                onClick={toggleLoopMarkers}
                className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${
                  showLoopMarkers
                    ? darkMode
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-100 text-gray-700'
                    : darkMode
                      ? 'text-black hover:text-white hover:bg-gray-700'
                      : 'text-black hover:text-gray-700 hover:bg-gray-100'
                }`}
                title={showLoopMarkers ? "Hide A-B loop markers" : "Show A-B loop markers"}
              >
                <span className="text-xs font-bold">Loop</span>
              </button>
            </div>
            
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
              
              {/* Menu button - moved to after volume control */}
              {showControls && (onDownload || onRemove || onReplace) && (
                <div className="relative ml-2 z-[99999]" style={{ zIndex: '999999 !important', position: 'relative' }}>
                  <button
                    ref={menuButtonRef}
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
                  })() && createPortal(
                    <div 
                      ref={dropdownRef}
                      className={`fixed py-1 min-w-[120px] rounded-lg border shadow-lg z-[99999] ${
                        darkMode 
                          ? 'border-gray-600 bg-gray-800' 
                          : 'border-gray-200 bg-white'
                      }`}
                      style={{
                        top: menuButtonRef.current ? `${menuButtonRef.current.getBoundingClientRect().bottom + 4}px` : 'auto',
                        left: menuButtonRef.current ? `${menuButtonRef.current.getBoundingClientRect().right - 120}px` : 'auto',
                        zIndex: '999999 !important',
                        position: 'fixed'
                      }}
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
                              ? 'hover:bg-gray-700' 
                              : 'hover:bg-gray-100'
                          }`}
                          style={{ color: '#000000' }}
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
                              ? 'hover:bg-gray-700' 
                              : 'hover:bg-gray-100'
                          }`}
                          style={{ color: '#000000' }}
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
                    </div>,
                    document.body
                  )}
                </div>
              )}
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