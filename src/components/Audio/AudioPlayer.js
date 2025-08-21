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
  const currentRegionRef = useRef(null);
  
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

    const initializeWaveSurfer = async () => {
      // Wait for next tick to ensure container is mounted
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const containerRef = compact ? waveformRef : waveformRefVertical;
      
      // Enhanced debugging for desktop vs mobile issue
      console.log('🎵 WaveSurfer Debug Info:', {
        compact,
        audioUrl: !!audioUrl,
        containerFound: !!containerRef.current,
        containerDimensions: containerRef.current ? {
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
          clientWidth: containerRef.current.clientWidth,
          clientHeight: containerRef.current.clientHeight,
          scrollWidth: containerRef.current.scrollWidth,
          scrollHeight: containerRef.current.scrollHeight
        } : null,
        containerStyle: containerRef.current ? getComputedStyle(containerRef.current) : null
      });
      
      if (!containerRef.current) {
        console.error('WaveSurfer container not found, compact:', compact);
        return;
      }
      
      // Check if container has valid dimensions
      if (containerRef.current.offsetWidth === 0 || containerRef.current.offsetHeight === 0) {
        console.warn('⚠️ Container has zero dimensions, retrying in 200ms...', {
          offsetWidth: containerRef.current.offsetWidth,
          offsetHeight: containerRef.current.offsetHeight
        });
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (containerRef.current.offsetWidth === 0 || containerRef.current.offsetHeight === 0) {
          console.error('❌ Container still has zero dimensions after retry');
          return;
        }
      }
      
      console.log('🎵 Initializing WaveSurfer, container found:', !!containerRef.current);

      // Clean up existing instance
      if (waveSurfer) {
        waveSurfer.destroy();
        setWaveSurfer(null);
      }

      setWaveformLoading(true);
      setError(null);
      
      try {
        // Create regions plugin
        const regions = RegionsPlugin.create();
        setRegionsPlugin(regions);

        // Create WaveSurfer instance with desktop-specific fixes
        const wsOptions = {
          container: containerRef.current,
          waveColor: darkMode ? '#9ca3af' : '#6b7280',
          progressColor: '#3b82f6',
          cursorColor: '#3b82f6',
          barWidth: 3,
          barGap: 1,
          barRadius: 1,
          responsive: true,
          height: compact ? 16 : 24,
          normalize: true,
          plugins: [regions],
          mediaControls: false,
          interact: true,
          backend: 'WebAudio',
          fillParent: true
        };
        
        // For vertical mode on desktop, ensure proper dimensions
        if (!compact && containerRef.current.offsetWidth > 0) {
          wsOptions.width = containerRef.current.offsetWidth;
          console.log('🖥️ Desktop vertical mode - setting explicit width:', wsOptions.width);
        }
        
        console.log('🎵 Creating WaveSurfer with options:', wsOptions);
        const ws = WaveSurfer.create(wsOptions);
        
        // Debug: Check available methods on WaveSurfer instance
        console.log('🔍 Available WaveSurfer methods:', {
          hasRenderer: !!ws.renderer,
          hasRedraw: typeof ws.redraw === 'function',
          hasSetOptions: typeof ws.setOptions === 'function',
          hasGetWrapper: typeof ws.getWrapper === 'function',
          allMethods: Object.getOwnPropertyNames(ws).filter(prop => typeof ws[prop] === 'function')
        });

        // Event listeners
        ws.on('ready', () => {
          const duration = ws.getDuration();
          setDuration(duration);
          setIsLoading(false);
          setWaveformLoading(false);
          console.log('✅ WaveSurfer ready, duration:', duration);
          console.log('📊 Container dimensions:', containerRef.current.getBoundingClientRect());
          
          // Force redraw for desktop vertical mode after a short delay
          if (!compact) {
            setTimeout(() => {
              try {
                console.log('🔄 Force redraw for desktop vertical mode');
                // Use the correct WaveSurfer v7 API
                if (ws.renderer && typeof ws.renderer.render === 'function') {
                  ws.renderer.render();
                } else if (typeof ws.redraw === 'function') {
                  ws.redraw();
                } else {
                  console.log('🔄 Redraw methods not available, trying alternative approach');
                  // Force a resize event which should trigger a redraw
                  ws.setOptions({});
                }
              } catch (error) {
                console.warn('Error during force redraw:', error);
              }
            }, 250);
          }
        });

        ws.on('loading', (percent) => {
          console.log('📊 Loading progress:', percent + '%');
          setWaveformLoading(percent < 100);
        });

        // Use timeupdate for current time tracking and loop logic
        ws.on('timeupdate', (time) => {
          setCurrentTime(time);
        });

        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));
        ws.on('finish', () => setIsPlaying(false));
        
        ws.on('error', (error) => {
          setError('Failed to load audio file');
          setIsLoading(false);
          setWaveformLoading(false);
          console.error('❌ WaveSurfer error:', error);
        });

        // Load the audio
        console.log('🎵 Loading audio URL:', audioUrl);
        await ws.load(audioUrl);
        setWaveSurfer(ws);
        
      } catch (error) {
        console.error('❌ Failed to initialize WaveSurfer:', error);
        setError('Failed to initialize audio player');
        setIsLoading(false);
        setWaveformLoading(false);
      }
    };

    initializeWaveSurfer();

    return () => {
      if (waveSurfer) {
        waveSurfer.destroy();
      }
    };
  }, [audioUrl, compact, darkMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add window resize handler to fix desktop waveform rendering issues
  useEffect(() => {
    if (!waveSurfer || compact) return; // Only for vertical mode
    
    const handleResize = () => {
      // Debounced resize to avoid too many calls
      clearTimeout(window.waveSurferResizeTimeout);
      window.waveSurferResizeTimeout = setTimeout(() => {
        if (waveSurfer && waveformRefVertical.current) {
          console.log('🔄 Resizing WaveSurfer for desktop vertical mode');
          try {
            // Use the correct WaveSurfer v7 API for resizing
            if (typeof waveSurfer.setOptions === 'function') {
              waveSurfer.setOptions({
                width: waveformRefVertical.current.offsetWidth
              });
            } else if (waveSurfer.renderer && typeof waveSurfer.renderer.render === 'function') {
              waveSurfer.renderer.render();
            } else if (typeof waveSurfer.redraw === 'function') {
              waveSurfer.redraw();
            }
          } catch (error) {
            console.warn('Error during WaveSurfer resize:', error);
          }
        }
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(window.waveSurferResizeTimeout);
    };
  }, [waveSurfer, compact]);

  // Update WaveSurfer colors when theme changes
  useEffect(() => {
    if (waveSurfer) {
      try {
        waveSurfer.setOptions({
          waveColor: darkMode ? '#6b7280' : '#d1d5db',
          progressColor: '#3b82f6',
          cursorColor: '#3b82f6'
        });
      } catch (error) {
        console.error('Failed to update WaveSurfer colors:', error);
      }
    }
  }, [darkMode, waveSurfer]);

  // Handle A-B looping logic with proper access to current state
  useEffect(() => {
    if (!waveSurfer || !showLoopMarkers || !currentRegion) return;

    const handleTimeUpdate = (time) => {
      const LOOP_TOLERANCE = 0.1;
      if (time >= (currentRegion.end - LOOP_TOLERANCE)) {
        console.log('🔄 Loop triggered - jumping from', time.toFixed(3), 'to', currentRegion.start.toFixed(3));
        waveSurfer.seekTo(currentRegion.start / waveSurfer.getDuration());
      }
    };

    waveSurfer.on('timeupdate', handleTimeUpdate);
    
    return () => {
      waveSurfer.un('timeupdate', handleTimeUpdate);
    };
  }, [waveSurfer, showLoopMarkers, currentRegion]);

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
        currentRegionRef.current = null;
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
          resize: true,
          loop: true
        });
        setCurrentRegion(region);
        currentRegionRef.current = region;
        
        // Handle region updates
        region.on('update-end', () => {
          setLoopStart(region.start);
          setLoopEnd(region.end);
          currentRegionRef.current = region;
          console.log('🔄 Region updated:', { start: region.start, end: region.end });
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
              className="waveform-container"
              style={{
                height: '16px',
                width: '100%',
                opacity: waveformLoading ? 0.3 : 1,
                backgroundColor: darkMode ? '#374151' : '#f3f4f6',
                border: '1px solid ' + (darkMode ? '#6b7280' : '#d1d5db'),
                borderRadius: '8px',
                overflow: 'hidden'
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
                style={{ height: '24px', width: '100%' }}
              >
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            {/* WaveSurfer container for vertical mode */}
            <div 
              ref={waveformRefVertical}
              className="waveform-container"
              style={{
                height: '24px',
                width: '100%',
                minWidth: '300px', // Ensure minimum width on desktop
                opacity: waveformLoading ? 0.3 : 1,
                backgroundColor: darkMode ? '#374151' : '#f3f4f6',
                border: '1px solid ' + (darkMode ? '#6b7280' : '#d1d5db'),
                borderRadius: '4px',
                overflow: 'hidden',
                display: 'block',
                position: 'relative'
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