import React, { useState, useRef, useEffect } from 'react';
import { Edit3, Minimize2, Maximize2, Download, Upload, RotateCcw, Plus, Expand, Shrink } from 'lucide-react';
import AudioPlayer from '../Audio/AudioPlayer';

const FloatingNotepad = ({ 
  notepadState, 
  darkMode, 
  onExportTxt, 
  onUploadToSongs,
  onSaveChanges,
  onRevertChanges,
  onStartNewContent,
  hasUnsavedChanges,
  // Audio-related props
  currentSongAudio = null,
  onAudioDownload = null,
  onAudioRemove = null,
  onAudioReplace = null
}) => {
  const {
    content,
    title,
    isMinimized,
    dimensions,
    position,
    updateContent,
    updateTitle,
    toggleMinimized,
    setPosition,
    updateDimensions
  } = notepadState;

  const containerRef = useRef(null);
  const dragDataRef = useRef(null);
  const resizeDataRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tempPosition, setTempPosition] = useState(position);
  const [tempDimensions, setTempDimensions] = useState(dimensions);
  
  // Store the current transform for immediate DOM updates
  const currentTransformRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  // Mobile detection
  const isMobile = window.innerWidth <= 768;
  
  // Toggle fullscreen on mobile
  const toggleFullscreen = () => {
    if (!isMobile) return;
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    setTempPosition(position);
    currentTransformRef.current = {
      ...currentTransformRef.current,
      right: position.right,
      bottom: position.bottom
    };
  }, [position]);

  useEffect(() => {
    setTempDimensions(dimensions);
    currentTransformRef.current = {
      ...currentTransformRef.current,
      width: dimensions.width,
      height: dimensions.height
    };
  }, [dimensions]);

  const startDrag = (clientX, clientY) => {
    if (isMinimized) return;
    if (dragDataRef.current) return;
    if (isMobile) return; // Disable dragging on mobile
    
    const rect = containerRef.current.getBoundingClientRect();
    dragDataRef.current = {
      startX: clientX,
      startY: clientY,
      rect
    };
    
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'move';
    
    // Initialize current transform with starting position
    currentTransformRef.current = {
      ...currentTransformRef.current,
      right: tempPosition.right,
      bottom: tempPosition.bottom
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', endDrag);
  };

  const handleMouseDown = (e) => {
    // Don't start drag if clicking on resize handles, inputs, or buttons
    if (e.target.closest('input, button') || 
        e.target.style.cursor.includes('resize') ||
        e.target.title?.includes('Resize')) return;
    if (isMobile) return; // Disable dragging on mobile
    startDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.target.closest('input, button')) return;
    if (isMobile) return; // Disable touch dragging on mobile
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  };

  const handleMouseMove = (e) => {
    if (!dragDataRef.current || !containerRef.current) return;
    
    const { startX, startY, rect } = dragDataRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const newLeft = rect.left + dx;
    const newTop = rect.top + dy;
    
    // Keep within viewport bounds
    const maxLeft = window.innerWidth - rect.width;
    const maxTop = window.innerHeight - rect.height;
    const constrainedLeft = Math.max(0, Math.min(maxLeft, newLeft));
    const constrainedTop = Math.max(0, Math.min(maxTop, newTop));
    
    // Update DOM directly for immediate response using transform for better performance
    const element = containerRef.current;
    const newRight = window.innerWidth - constrainedLeft - rect.width;
    const newBottom = window.innerHeight - constrainedTop - rect.height;
    
    // Use transform instead of changing position for better performance
    const translateX = constrainedLeft - rect.left;
    const translateY = constrainedTop - rect.top;
    element.style.transform = `translate(${translateX}px, ${translateY}px)`;
    
    // Store the new position for final state update
    currentTransformRef.current = { ...currentTransformRef.current, right: newRight, bottom: newBottom };
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  };

  const endDrag = () => {
    if (!dragDataRef.current) return;
    
    dragDataRef.current = null;
    setIsDragging(false);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', endDrag);
    
    // Clear transform and update React state with final position
    if (containerRef.current) {
      containerRef.current.style.transform = '';
    }
    
    const finalPosition = {
      right: currentTransformRef.current.right,
      bottom: currentTransformRef.current.bottom
    };
    setTempPosition(finalPosition);
    setPosition(finalPosition);
  };

  // Resize functionality
  const startResize = (direction, clientX, clientY) => {
    if (isMinimized || resizeDataRef.current) return;
    if (isMobile) return; // Disable resizing on mobile
    
    const rect = containerRef.current.getBoundingClientRect();
    resizeDataRef.current = {
      direction,
      startX: clientX,
      startY: clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      startLeft: rect.left,
      startTop: rect.top,
      startRight: tempPosition.right,
      startBottom: tempPosition.bottom
    };
    
    setIsResizing(true);
    
    // Initialize current transform with starting dimensions and position
    currentTransformRef.current = {
      width: rect.width,
      height: rect.height,
      right: tempPosition.right,
      bottom: tempPosition.bottom
    };
    
    document.addEventListener('mousemove', handleResizeMouseMove, { passive: false });
    document.addEventListener('mouseup', endResize);
    document.body.style.cursor = getResizeCursor(direction);
    document.body.style.userSelect = 'none';
  };

  const handleResizeMouseMove = (e) => {
    if (!resizeDataRef.current || !containerRef.current) return;
    
    const { direction, startX, startY, startWidth, startHeight, startRight, startBottom } = resizeDataRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    let newWidth = startWidth;
    let newHeight = startHeight;
    let newRight = startRight;
    let newBottom = startBottom;
    
    const minWidth = 200;
    const minHeight = 200;
    const maxWidth = window.innerWidth - 40;
    const maxHeight = window.innerHeight - 40;

    // Handle different resize directions
    if (direction.includes('e')) { // East (right edge)
      newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + dx));
    }
    if (direction.includes('w')) { // West (left edge)
      const proposedWidth = startWidth - dx;
      newWidth = Math.max(minWidth, Math.min(maxWidth, proposedWidth));
      const actualWidthChange = newWidth - startWidth;
      newRight = startRight - actualWidthChange;
    }
    if (direction.includes('s')) { // South (bottom edge)
      newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + dy));
    }
    if (direction.includes('n')) { // North (top edge)
      const proposedHeight = startHeight - dy;
      newHeight = Math.max(minHeight, Math.min(maxHeight, proposedHeight));
      const actualHeightChange = newHeight - startHeight;
      newBottom = startBottom - actualHeightChange;
    }

    // Ensure we don't go off screen
    const maxRight = window.innerWidth - newWidth;
    const maxBottom = window.innerHeight - newHeight;
    newRight = Math.max(0, Math.min(maxRight, newRight));
    newBottom = Math.max(0, Math.min(maxBottom, newBottom));

    // Update DOM directly for immediate response
    const element = containerRef.current;
    element.style.width = `${newWidth}px`;
    element.style.height = `${newHeight}px`;
    
    // Only update position if it changed to avoid unnecessary reflows
    if (newRight !== startRight || newBottom !== startBottom) {
      element.style.right = `${newRight}px`;
      element.style.bottom = `${newBottom}px`;
    }
    
    // Store the new dimensions and position for final state update
    currentTransformRef.current = {
      width: newWidth,
      height: newHeight,
      right: newRight,
      bottom: newBottom
    };
  };

  const endResize = () => {
    if (!resizeDataRef.current) return;
    
    resizeDataRef.current = null;
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResizeMouseMove);
    document.removeEventListener('mouseup', endResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // Update React state with final dimensions and position
    const finalDimensions = {
      width: currentTransformRef.current.width,
      height: currentTransformRef.current.height
    };
    const finalPosition = {
      right: currentTransformRef.current.right,
      bottom: currentTransformRef.current.bottom
    };
    
    setTempDimensions(finalDimensions);
    setTempPosition(finalPosition);
    updateDimensions(finalDimensions);
    setPosition(finalPosition);
  };

  const getResizeCursor = (direction) => {
    const cursors = {
      'n': 'ns-resize',
      'ne': 'ne-resize', 
      'e': 'ew-resize',
      'se': 'se-resize',
      's': 'ns-resize',
      'sw': 'sw-resize',
      'w': 'ew-resize',
      'nw': 'nw-resize'
    };
    return cursors[direction] || 'default';
  };

  const handleKeyDown = (e) => {
    if (e.target !== e.currentTarget) return;
    const step = 10;
    let newPos = { ...tempPosition };
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        newPos.bottom = newPos.bottom + step;
        setTempPosition(newPos);
        setPosition(newPos);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newPos.bottom = Math.max(0, newPos.bottom - step);
        setTempPosition(newPos);
        setPosition(newPos);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newPos.right = newPos.right + step;
        setTempPosition(newPos);
        setPosition(newPos);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newPos.right = Math.max(0, newPos.right - step);
        setTempPosition(newPos);
        setPosition(newPos);
        break;
      case 'Escape':
        e.preventDefault();
        newPos = { bottom: 20, right: 20 };
        setTempPosition(newPos);
        setPosition(newPos);
        break;
      default:
    }
  };
  
  const handleContentChange = (e) => {
    updateContent(e.target.value);
  };

  const handleTitleChange = (e) => {
    updateTitle(e.target.value);
  };

  return (
    <>
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`fixed shadow-2xl border ${
        isDragging || isResizing ? 'transition-none' : 'transition-all duration-300'
      } ${
        isMinimized ? 'z-[60] md:z-[70] floating-notepad-minimized' : 'z-[999999]'
      } ${
        darkMode
          ? 'bg-gray-800 border-gray-600'
          : 'bg-white border-gray-300'
      } ${!isMinimized ? 'floating-notepad-expanded' : ''} ${
        isDragging ? 'shadow-3xl scale-[1.02]' : ''
      } ${
        isResizing ? 'shadow-3xl' : ''
      }`}
      style={
        isMinimized
          ? {
              // Collapsed: Bottom bar - FIXED to viewport bottom
              bottom: '0',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(300px, calc(100vw - 32px))',
              height: '40px',
              borderRadius: '8px 8px 0 0',
              borderBottom: 'none',
              resize: 'none',
              overflow: 'hidden'
            }
          : {
              // Expanded: Floating window
              bottom: `${tempPosition.bottom}px`,
              right: `${tempPosition.right}px`,
              width: `${tempDimensions.width}px`,
              height: `${tempDimensions.height}px`,
              borderRadius: '8px',
              resize: 'none', // Disable default resize, we'll use custom handles
              overflow: 'hidden',
              minWidth: '200px',
              minHeight: '200px'
            }
      }
    >
      {/* Header - Contains title and buttons */}
      <div
        className={`flex items-center justify-between p-2 ${
          isMinimized ? '' : 'border-b'
        } ${
          darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
        } ${
          isMobile ? 'cursor-default' : 'cursor-move'
        }`}
        onMouseDown={isMobile ? undefined : handleMouseDown}
        onTouchStart={isMobile ? undefined : handleTouchStart}
      >
        {/* Left side - Icon + Title or Notepad label */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Edit3 className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          {isMinimized ? (
            <span 
              className={`text-sm font-medium cursor-pointer truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
              onClick={toggleMinimized}
            >
              {title || 'Notepad'}{hasUnsavedChanges ? '*' : ''}
            </span>
          ) : (
            <input
              type="text"
              value={title + (hasUnsavedChanges ? '*' : '')}
              onChange={(e) => handleTitleChange({ target: { value: e.target.value.replace('*', '') } })}
              placeholder="Title..."
              className={`flex-1 px-1 md:px-2 py-0.5 md:py-1 text-xs md:text-sm border rounded min-w-0 max-w-[100px] md:max-w-none ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          )}
        </div>

        {/* Right side - Export buttons (when expanded) + Minimize/Maximize button */}
        <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0 notepad-header-buttons">
          {!isMinimized && (
            <>
              {/* 1. Upload/Save Song Button - Context Aware */}
              <button
                onClick={notepadState.currentEditingSongId ? onSaveChanges : onUploadToSongs}
                disabled={!content.trim()}
                className={`p-1 rounded text-xs transition-colors ${
                  content.trim()
                    ? notepadState.currentEditingSongId
                      ? darkMode 
                        ? 'bg-blue-800 hover:bg-blue-700 text-blue-200' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                      : darkMode 
                        ? 'bg-green-800 hover:bg-green-700 text-green-200' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    : darkMode
                      ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title={notepadState.currentEditingSongId ? "Save Changes" : "Add to Songs"}
              >
                <Upload className="w-3 h-3" style={darkMode ? {} : { color: '#000000' }} />
              </button>

              {/* 2. Export Song Button - Hide on mobile when editing */}
              <button
                onClick={onExportTxt}
                disabled={!content.trim()}
                className={`p-1 rounded text-xs transition-colors ${
                  notepadState.currentEditingSongId ? 'hidden md:block' : ''
                } ${
                  content.trim()
                    ? darkMode 
                      ? 'bg-blue-800 hover:bg-blue-700 text-blue-200' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                    : darkMode
                      ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title="Export as TXT"
              >
                <Download className="w-3 h-3" style={darkMode ? {} : { color: '#000000' }} />
              </button>

              {/* 3. Empty Notepad Button - Only show when editing */}
              {notepadState.currentEditingSongId && (
                <button
                  onClick={onStartNewContent}
                  className={`p-1 rounded text-xs transition-colors ${
                    darkMode 
                      ? 'bg-purple-800 hover:bg-purple-700 text-purple-200' 
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                  title="Empty Notepad"
                >
                  <Plus className="w-3 h-3" style={darkMode ? {} : { color: '#000000' }} />
                </button>
              )}

              {/* 4. Revert Changes Button - Only show when editing */}
              {notepadState.currentEditingSongId && (
                <button
                  onClick={onRevertChanges}
                  disabled={!hasUnsavedChanges}
                  className={`p-1 rounded text-xs transition-colors ${
                    hasUnsavedChanges
                      ? darkMode 
                        ? 'bg-orange-800 hover:bg-orange-700 text-orange-200' 
                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                      : darkMode
                        ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title="Revert to Original"
                >
                  <RotateCcw className="w-3 h-3" style={darkMode ? {} : { color: '#000000' }} />
                </button>
              )}
            </>
          )}
          
          
          <button
            onClick={toggleMinimized}
            className={`p-1 rounded hover:bg-opacity-20 hover:bg-gray-500 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Audio Player Bar - Show between header and content when audio exists */}
      {!isMinimized && currentSongAudio && (
        <div className={`flex-shrink-0 border-b w-full ${
          darkMode ? 'border-gray-600' : 'border-gray-200'
        }`}>
          <AudioPlayer
            audioUrl={currentSongAudio.url}
            audioFilename={currentSongAudio.filename}
            audioSize={currentSongAudio.size}
            audioDuration={currentSongAudio.duration}
            darkMode={darkMode}
            onDownload={onAudioDownload}
            onRemove={onAudioRemove}
            onReplace={onAudioReplace}
            showControls={true}
            compact={true}
            hideMenu={true}
          />
        </div>
      )}

      {/* Content - Full-size textarea when not minimized */}
      {!isMinimized && (
        <div 
          className="flex-1 w-full relative overflow-hidden"
          style={{ 
            height: isMobile && isFullscreen ? (currentSongAudio ? 'calc(100vh - 49px - 60px)' : 'calc(100vh - 49px)') : (currentSongAudio ? 'calc(100% - 49px - 60px)' : 'calc(100% - 49px)'),
            minHeight: isMobile && isFullscreen ? '200px' : '150px',
            width: '100%'
          }}
        >
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Start writing your lyrics..."
            className={`w-full h-full resize-none border-none outline-none text-sm p-3 block ${
              darkMode 
                ? 'bg-gray-800 text-gray-300 placeholder-gray-500' 
                : 'bg-white text-gray-900 placeholder-gray-400'
            }`}
            style={{ 
              width: '100%', 
              height: '100%',
              minHeight: '150px',
              resize: 'none',
              border: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              display: 'block',
              textAlign: 'left'
            }}
          />
          
          {/* Fullscreen toggle button - floating in bottom right corner on mobile */}
          {isMobile && (
            <button
              onClick={toggleFullscreen}
              className={`absolute bottom-2 right-2 w-10 h-10 rounded-full shadow-lg transition-all duration-200 ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
              } hover:scale-110 z-10`}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Shrink className="w-5 h-5" /> : <Expand className="w-5 h-5" />}
            </button>
          )}
          
          {/* Character count - positioned in bottom left corner when fullscreen button is present */}
          <div className={`absolute bottom-2 ${isMobile ? 'left-2' : 'right-2'} text-xs pointer-events-none ${
            darkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            {content.length} chars
          </div>
        </div>
      )}

      {/* Resize handles - Only show when expanded and on desktop */}
      {!isMinimized && !isMobile && (
        <>
          {/* Corner handles - Small and clearly visible */}
          <div 
            className="absolute w-3 h-3 cursor-nw-resize resize-handle"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startResize('nw', e.clientX, e.clientY);
            }}
            style={{ 
              top: '-3px', 
              left: '-3px', 
              zIndex: 1000,
              backgroundColor: 'rgba(59, 130, 246, 0.7)',
              border: '2px solid #3b82f6',
              borderRadius: '2px'
            }}
            title="Resize from top-left corner"
          />
          <div 
            className="absolute w-6 h-6 cursor-ne-resize resize-handle"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startResize('ne', e.clientX, e.clientY);
            }}
            style={{ 
              top: '-3px', 
              right: '-3px', 
              zIndex: 1000,
              backgroundColor: 'rgba(59, 130, 246, 0.7)',
              border: '2px solid #3b82f6',
              borderRadius: '2px'
            }}
            title="Resize from top-right corner"
          />
          <div 
            className="absolute w-6 h-6 cursor-sw-resize resize-handle"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startResize('sw', e.clientX, e.clientY);
            }}
            style={{ 
              bottom: '-3px', 
              left: '-3px', 
              zIndex: 1000,
              backgroundColor: 'rgba(59, 130, 246, 0.7)',
              border: '2px solid #3b82f6',
              borderRadius: '2px'
            }}
            title="Resize from bottom-left corner"
          />
          <div 
            className="absolute w-6 h-6 cursor-se-resize resize-handle"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startResize('se', e.clientX, e.clientY);
            }}
            style={{ 
              bottom: '-3px', 
              right: '-3px', 
              zIndex: 1000,
              backgroundColor: 'rgba(59, 130, 246, 0.7)',
              border: '2px solid #3b82f6',
              borderRadius: '2px'
            }}
            title="Resize from bottom-right corner"
          />
          
          {/* Edge handles - Thick and clearly visible */}
          <div 
            className="absolute h-3 cursor-n-resize resize-handle"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startResize('n', e.clientX, e.clientY);
            }}
            style={{ 
              top: '-2px', 
              left: '6px', 
              right: '6px', 
              zIndex: 1000,
              backgroundColor: 'rgba(34, 197, 94, 0.7)',
              border: '1px solid #22c55e'
            }}
            title="Resize from top edge"
          />
          <div 
            className="absolute h-3 cursor-s-resize resize-handle"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startResize('s', e.clientX, e.clientY);
            }}
            style={{ 
              bottom: '-2px', 
              left: '6px', 
              right: '6px', 
              zIndex: 1000,
              backgroundColor: 'rgba(34, 197, 94, 0.7)',
              border: '1px solid #22c55e'
            }}
            title="Resize from bottom edge"
          />
          <div 
            className="absolute w-3 cursor-w-resize resize-handle"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startResize('w', e.clientX, e.clientY);
            }}
            style={{ 
              top: '6px', 
              bottom: '6px', 
              left: '-2px', 
              zIndex: 1000,
              backgroundColor: 'rgba(34, 197, 94, 0.7)',
              border: '1px solid #22c55e'
            }}
            title="Resize from left edge"
          />
          <div 
            className="absolute w-3 cursor-e-resize resize-handle"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startResize('e', e.clientX, e.clientY);
            }}
            style={{ 
              top: '6px', 
              bottom: '6px', 
              right: '-2px', 
              zIndex: 1000,
              backgroundColor: 'rgba(34, 197, 94, 0.7)',
              border: '1px solid #22c55e'
            }}
            title="Resize from right edge"
          />
        </>
      )}
    </div>

    {isMobile && isFullscreen && !isMinimized && (
      <div className={`fixed inset-0 z-[999999] flex flex-col ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header - Same as regular notepad but not draggable */}
        <div className={`flex items-center justify-between p-2 border-b ${
          darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Edit3 className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              value={title + (hasUnsavedChanges ? '*' : '')}
              onChange={(e) => updateTitle(e.target.value.replace('*', ''))}
              placeholder="Title..."
              className={`flex-1 px-2 py-1 text-sm border rounded ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>

          {/* Header buttons - same as regular notepad */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={notepadState.currentEditingSongId ? onSaveChanges : onUploadToSongs}
              disabled={!content.trim()}
              className={`p-1 rounded text-xs transition-colors ${
                content.trim()
                  ? notepadState.currentEditingSongId
                    ? darkMode 
                      ? 'bg-blue-800 hover:bg-blue-700 text-blue-200' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                    : darkMode 
                      ? 'bg-green-800 hover:bg-green-700 text-green-200' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  : darkMode
                    ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              title={notepadState.currentEditingSongId ? "Save Changes" : "Add to Songs"}
            >
              <Upload className="w-3 h-3" />
            </button>

            <button
              onClick={onExportTxt}
              disabled={!content.trim()}
              className={`p-1 rounded text-xs transition-colors ${
                content.trim()
                  ? darkMode 
                    ? 'bg-blue-800 hover:bg-blue-700 text-blue-200' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  : darkMode
                    ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              title="Export as TXT"
            >
              <Download className="w-3 h-3" />
            </button>

            {notepadState.currentEditingSongId && (
              <>
                <button
                  onClick={onStartNewContent}
                  className={`p-1 rounded text-xs transition-colors ${
                    darkMode 
                      ? 'bg-purple-800 hover:bg-purple-700 text-purple-200' 
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                  title="Empty Notepad"
                >
                  <Plus className="w-3 h-3" />
                </button>
                
                <button
                  onClick={onRevertChanges}
                  disabled={!hasUnsavedChanges}
                  className={`p-1 rounded text-xs transition-colors ${
                    hasUnsavedChanges
                      ? darkMode 
                        ? 'bg-orange-800 hover:bg-orange-700 text-orange-200' 
                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                      : darkMode
                        ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title="Revert to Original"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Audio Player Bar - Same as regular notepad if audio exists */}
        {currentSongAudio && (
          <div className={`flex-shrink-0 border-b w-full ${
            darkMode ? 'border-gray-600' : 'border-gray-200'
          }`}>
            <AudioPlayer
              audioUrl={currentSongAudio.url}
              audioFilename={currentSongAudio.filename}
              audioSize={currentSongAudio.size}
              audioDuration={currentSongAudio.duration}
              darkMode={darkMode}
              onDownload={onAudioDownload}
              onRemove={onAudioRemove}
              onReplace={onAudioReplace}
              showControls={true}
              compact={true}
              hideMenu={true}
            />
          </div>
        )}

        {/* Fullscreen Textarea - Takes up remaining space */}
        <div className="flex-1 relative">
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Start writing your lyrics..."
            className={`w-full h-full resize-none border-none outline-none p-4 text-base ${
              darkMode 
                ? 'bg-gray-800 text-gray-300 placeholder-gray-500' 
                : 'bg-white text-gray-900 placeholder-gray-400'
            }`}
            style={{
              fontSize: '16px',
              lineHeight: '1.6',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          />
          
          {/* Exit fullscreen button - positioned in bottom right */}
          <button
            onClick={toggleFullscreen}
            className={`absolute bottom-4 right-4 w-12 h-12 rounded-full shadow-xl transition-all duration-200 ${ 
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600' 
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
            } hover:scale-110`}
            title="Exit Fullscreen"
          >
            <Shrink className="w-6 h-6" />
          </button>
          
          {/* Character count - positioned in bottom left */}
          <div className={`absolute bottom-4 left-4 text-sm ${
            darkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            {content.length} chars
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default FloatingNotepad;