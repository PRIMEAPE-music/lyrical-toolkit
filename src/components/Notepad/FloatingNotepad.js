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
  originalSongContent,
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
    setPosition
  } = notepadState;

  const containerRef = useRef(null);
  const dragDataRef = useRef(null);
  const [tempPosition, setTempPosition] = useState(position);

  useEffect(() => {
    setTempPosition(position);
  }, [position]);

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
    if (e.target.closest('input, button')) return;
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
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            borderRadius: '8px',
            resize: 'both',
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
                <Upload className="w-3 h-3" />
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
                <Download className="w-3 h-3" />
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
                  <Plus className="w-3 h-3" />
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
                  <RotateCcw className="w-3 h-3" />
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

      {/* Content - Full-size textarea when not minimized */}
      {!isMinimized && (
        <div style={{ height: 'calc(100% - 49px)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {/* Audio Player - Show if current song has audio */}
          {currentSongAudio && (
            <div className={`flex-shrink-0 p-3 border-b ${
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
              />
            </div>
          )}
          
          {/* Text Area - Takes remaining space */}
          <div className="flex-1 relative">
            <textarea
              value={content}
              onChange={handleContentChange}
              placeholder="Start writing your lyrics..."
              className={`w-full h-full resize-none border-none outline-none text-sm p-3 ${
                darkMode 
                  ? 'bg-gray-800 text-gray-300 placeholder-gray-500' 
                  : 'bg-white text-gray-900 placeholder-gray-400'
              }`}
              style={{ 
                width: '100%', 
                height: '100%',
                resize: 'none',
                border: 'none',
                outline: 'none'
              }}
            />
            
            {/* Character count - positioned in bottom right corner */}
            <div className={`absolute bottom-2 right-2 text-xs pointer-events-none ${
              darkMode ? 'text-gray-500' : 'text-gray-400'
            }`}>
              {content.length} chars
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingNotepad;