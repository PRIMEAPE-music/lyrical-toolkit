import React, { useState, useRef, useEffect } from 'react';
import { Edit3, Minimize2, Maximize2, Download, Upload, RotateCcw, Plus } from 'lucide-react';
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
  const [tempPosition, setTempPosition] = useState(position);
  const [tempDimensions, setTempDimensions] = useState(dimensions);

  useEffect(() => {
    setTempPosition(position);
  }, [position]);

  useEffect(() => {
    setTempDimensions(dimensions);
  }, [dimensions]);

  const startDrag = (clientX, clientY) => {
    if (isMinimized) return;
    if (dragDataRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    dragDataRef.current = {
      startX: clientX,
      startY: clientY,
      rect
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', endDrag);
  };

  const handleMouseDown = (e) => {
    // Don't start drag if clicking on resize handles, inputs, or buttons
    if (e.target.closest('input, button') || 
        e.target.style.cursor.includes('resize') ||
        e.target.title?.includes('Resize')) return;
    startDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.target.closest('input, button')) return;
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  };

  const handleMouseMove = (e) => {
    if (!dragDataRef.current) return;
    const { startX, startY, rect } = dragDataRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const newLeft = rect.left + dx;
    const newTop = rect.top + dy;
    const newRight = Math.max(0, window.innerWidth - newLeft - rect.width);
    const newBottom = Math.max(0, window.innerHeight - newTop - rect.height);
    setTempPosition({ bottom: newBottom, right: newRight });
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  };

  const endDrag = () => {
    if (!dragDataRef.current) return;
    dragDataRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', endDrag);
    setPosition(tempPosition);
  };

  // Resize functionality
  const startResize = (direction, clientX, clientY) => {
    if (isMinimized || resizeDataRef.current) return;
    
    console.log('🔄 Starting resize:', direction);
    
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

    document.addEventListener('mousemove', handleResizeMouseMove);
    document.addEventListener('mouseup', endResize);
    document.body.style.cursor = getResizeCursor(direction);
    document.body.style.userSelect = 'none';
  };

  const handleResizeMouseMove = (e) => {
    if (!resizeDataRef.current) return;
    
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
      const widthChange = Math.max(minWidth - startWidth, Math.min(maxWidth - startWidth, -dx));
      newWidth = startWidth + widthChange;
      newRight = startRight + widthChange;
    }
    if (direction.includes('s')) { // South (bottom edge)
      newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + dy));
    }
    if (direction.includes('n')) { // North (top edge)
      const heightChange = Math.max(minHeight - startHeight, Math.min(maxHeight - startHeight, -dy));
      newHeight = startHeight + heightChange;
      newBottom = startBottom + heightChange;
    }

    // Ensure we don't go off screen
    const maxRight = window.innerWidth - newWidth;
    const maxBottom = window.innerHeight - newHeight;
    newRight = Math.max(0, Math.min(maxRight, newRight));
    newBottom = Math.max(0, Math.min(maxBottom, newBottom));

    setTempDimensions({ width: newWidth, height: newHeight });
    setTempPosition({ right: newRight, bottom: newBottom });
  };

  const endResize = () => {
    if (!resizeDataRef.current) return;
    
    resizeDataRef.current = null;
    document.removeEventListener('mousemove', handleResizeMouseMove);
    document.removeEventListener('mouseup', endResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // Update the notepad state through the parent
    updateDimensions(tempDimensions);
    setPosition(tempPosition);
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
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`fixed shadow-2xl border transition-all duration-300 ${
        isMinimized ? 'z-30 md:z-50 floating-notepad-minimized' : 'z-40'
      } ${
        darkMode
          ? 'bg-gray-800 border-gray-600'
          : 'bg-white border-gray-300'
      } ${!isMinimized ? 'floating-notepad-expanded' : ''}`}
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
        }`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
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
            height: currentSongAudio ? 'calc(100% - 49px - 60px)' : 'calc(100% - 49px)',
            minHeight: '150px',
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
          
          {/* Character count - positioned in bottom right corner */}
          <div className={`absolute bottom-2 right-2 text-xs pointer-events-none ${
            darkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            {content.length} chars
          </div>
        </div>
      )}

      {/* Resize handles - Only show when expanded and on desktop */}
      {!isMinimized && (
        <>
          {/* Corner handles - Made larger and more accessible */}
          <div 
            className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize bg-blue-500 bg-opacity-10 hover:bg-opacity-30 border border-blue-300"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startResize('nw', e.clientX, e.clientY);
            }}
            style={{ margin: '-2px 0 0 -2px', zIndex: 10 }}
            title="Resize from top-left corner"
          />
          <div 
            className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize bg-blue-500 bg-opacity-10 hover:bg-opacity-30 border border-blue-300"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startResize('ne', e.clientX, e.clientY);
            }}
            style={{ margin: '-2px -2px 0 0', zIndex: 10 }}
            title="Resize from top-right corner"
          />
          <div 
            className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize bg-blue-500 bg-opacity-10 hover:bg-opacity-30 border border-blue-300"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startResize('sw', e.clientX, e.clientY);
            }}
            style={{ margin: '0 0 -2px -2px', zIndex: 10 }}
            title="Resize from bottom-left corner"
          />
          <div 
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-blue-500 bg-opacity-10 hover:bg-opacity-30 border border-blue-300"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startResize('se', e.clientX, e.clientY);
            }}
            style={{ margin: '0 -2px -2px 0', zIndex: 10 }}
            title="Resize from bottom-right corner"
          />
          
          {/* Edge handles - Made thicker and more accessible */}
          <div 
            className="absolute top-0 left-4 right-4 h-2 cursor-n-resize bg-green-500 bg-opacity-10 hover:bg-opacity-30 border border-green-300"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startResize('n', e.clientX, e.clientY);
            }}
            style={{ margin: '-1px 0 0 0', zIndex: 10 }}
            title="Resize from top edge"
          />
          <div 
            className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize bg-green-500 bg-opacity-10 hover:bg-opacity-30 border border-green-300"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startResize('s', e.clientX, e.clientY);
            }}
            style={{ margin: '0 0 -1px 0', zIndex: 10 }}
            title="Resize from bottom edge"
          />
          <div 
            className="absolute top-4 bottom-4 left-0 w-2 cursor-w-resize bg-green-500 bg-opacity-10 hover:bg-opacity-30 border border-green-300"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startResize('w', e.clientX, e.clientY);
            }}
            style={{ margin: '0 0 0 -1px', zIndex: 10 }}
            title="Resize from left edge"
          />
          <div 
            className="absolute top-4 bottom-4 right-0 w-2 cursor-e-resize bg-green-500 bg-opacity-10 hover:bg-opacity-30 border border-green-300"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startResize('e', e.clientX, e.clientY);
            }}
            style={{ margin: '0 -1px 0 0', zIndex: 10 }}
            title="Resize from right edge"
          />
        </>
      )}
    </div>
  );
};

export default FloatingNotepad;