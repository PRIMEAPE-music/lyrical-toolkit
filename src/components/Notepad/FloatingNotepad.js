import React from 'react';
import { Edit3, Minimize2, Maximize2, Download, Upload, RotateCcw, Plus } from 'lucide-react';

const FloatingNotepad = ({ 
  notepadState, 
  darkMode, 
  onExportTxt, 
  onUploadToSongs,
  onSaveChanges,
  onRevertChanges,
  onStartNewContent,
  hasUnsavedChanges,
  originalSongContent
}) => {
  const {
    content,
    title,
    isMinimized,
    dimensions,
    updateContent,
    updateTitle,
    toggleMinimized
  } = notepadState;

  const handleContentChange = (e) => {
    updateContent(e.target.value);
  };

  const handleTitleChange = (value) => {
    updateTitle(value);
  };

  return (
    <div 
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
            bottom: '20px',
            right: '20px',
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
      <div className={`flex items-center justify-between p-2 ${
        isMinimized ? '' : 'border-b'
      } ${
        darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
      }`}>
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
              onChange={(e) => handleTitleChange(e.target.value.replace('*', ''))}
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
        <div style={{ height: 'calc(100% - 49px)', position: 'relative' }}>
          {/* Text Area - Takes full remaining space, no individual resize */}
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
      )}
    </div>
  );
};

export default FloatingNotepad;