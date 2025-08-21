import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Download, Edit3, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';

const RhymeEditor = ({ 
  structuredLyrics, 
  editedLyrics,
  onLyricsUpdate,
  songId,
  songTitle,
  darkMode,
  isEditMode,
  setIsEditMode
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedWord, setSelectedWord] = useState(null);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Available rhyme groups
  const rhymeGroups = [
    ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)), // A-Z
    ...Array.from({ length: 20 }, (_, i) => (i + 1).toString()) // 1-20
  ];

  // Helper function to get rhyme class
  const getManualRhymeClass = (groupIdentifier) => {
    if (!groupIdentifier) return 'rhyme-group-default';
    
    if (/^[A-Z]$/.test(groupIdentifier)) {
      return `rhyme-group-${groupIdentifier.toLowerCase()}`;
    }
    
    if (/^[0-9]$/.test(groupIdentifier)) {
      return `rhyme-group-${groupIdentifier}`;
    }
    
    return 'rhyme-group-default';
  };

  // Calculate which words belong to each rhyme group
  const rhymeGroupWords = useMemo(() => {
    const groups = {};
    const lyrics = editedLyrics || structuredLyrics;
    
    lyrics.forEach(line => {
      line.forEach(word => {
        if (word.rhymeGroup && word.clean) {
          if (!groups[word.rhymeGroup]) {
            groups[word.rhymeGroup] = new Set();
          }
          groups[word.rhymeGroup].add(word.clean.toLowerCase());
        }
      });
    });

    // Convert Sets to Arrays
    Object.keys(groups).forEach(key => {
      groups[key] = Array.from(groups[key]);
    });

    return groups;
  }, [editedLyrics, structuredLyrics]);

  // Get a preview of words in a group (for display)
  const getGroupPreview = (group) => {
    const words = rhymeGroupWords[group];
    if (!words || words.length === 0) return '';
    
    // Show up to 3 words
    const preview = words.slice(0, 3).join(', ');
    if (words.length > 3) {
      return `${preview}...`;
    }
    return preview;
  };

  // Load saved edits from localStorage
  useEffect(() => {
    if (songId) {
      const savedEdits = localStorage.getItem(`rhymeEdits_${songId}`);
      if (savedEdits) {
        const parsed = JSON.parse(savedEdits);
        onLyricsUpdate(parsed);
        setHistory([parsed]);
        setHistoryIndex(0);
      } else {
        setHistory([structuredLyrics]);
        setHistoryIndex(0);
      }
    }
  }, [songId, structuredLyrics, onLyricsUpdate]);

  // Save edits to localStorage
  const saveEdits = useCallback((newLyrics) => {
    if (songId) {
      localStorage.setItem(`rhymeEdits_${songId}`, JSON.stringify(newLyrics));
    }
    onLyricsUpdate(newLyrics);
    
    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newLyrics);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [songId, onLyricsUpdate, history, historyIndex]);

  // Handle word click event from child component
  useEffect(() => {
    const handleWordClickEvent = (event) => {
      const { word, lineIndex, wordIndex, event: clickEvent } = event.detail;
      if (!isEditMode || !word.clean) return;
      
      clickEvent.stopPropagation();
      setSelectedWord({ word, lineIndex, wordIndex });
      setMenuPosition({
        x: clickEvent.clientX,
        y: clickEvent.clientY
      });
      setShowGroupMenu(true);
    };

    const element = document.querySelector('[data-rhyme-editor]');
    if (element) {
      element.addEventListener('wordClick', handleWordClickEvent);
      return () => element.removeEventListener('wordClick', handleWordClickEvent);
    }
  }, [isEditMode]);

  // Update rhyme group for a word
  const updateRhymeGroup = (newGroup) => {
    if (!selectedWord) return;

    const newLyrics = editedLyrics.map((line, lIdx) =>
      line.map((word, wIdx) => {
        if (lIdx === selectedWord.lineIndex && wIdx === selectedWord.wordIndex) {
          return {
            ...word,
            rhymeGroup: newGroup,
            manuallyEdited: true
          };
        }
        return word;
      })
    );

    saveEdits(newLyrics);
    setShowGroupMenu(false);
    setSelectedWord(null);
  };

  // Undo functionality
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onLyricsUpdate(history[newIndex]);
      if (songId) {
        localStorage.setItem(`rhymeEdits_${songId}`, JSON.stringify(history[newIndex]));
      }
    }
  };

  // Redo functionality
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onLyricsUpdate(history[newIndex]);
      if (songId) {
        localStorage.setItem(`rhymeEdits_${songId}`, JSON.stringify(history[newIndex]));
      }
    }
  };

  // Reset to original
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all manual edits?')) {
      saveEdits(structuredLyrics);
      if (songId) {
        localStorage.removeItem(`rhymeEdits_${songId}`);
      }
    }
  };

  // Export to PDF using SVG
  const handleExportPDF = async () => {
    const element = document.getElementById('rhyme-visualization');
    if (!element) return;

    try {
      // Get the structured lyrics data (use the correct props)
      const lyricsData = editedLyrics || structuredLyrics;
      if (!lyricsData) {
        alert('No lyrics data available for export');
        return;
      }

      // SVG configuration
      const config = {
        width: 750,
        fontSize: 14,
        lineHeight: 18,
        padding: 20,
        wordSpacing: 0,
        backgroundColor: '#ffffff'
      };

      // Color mapping for rhyme groups (same as CSS)
      const rhymeColors = {
        'a': { bg: '#fca5a5', text: '#7f1d1d' },
        'b': { bg: '#93c5fd', text: '#1e3a8a' },
        'c': { bg: '#86efac', text: '#14532d' },
        'd': { bg: '#fde047', text: '#713f12' },
        'e': { bg: '#c084fc', text: '#581c87' },
        'f': { bg: '#fb7185', text: '#881337' },
        'g': { bg: '#fb923c', text: '#7c2d12' },
        'h': { bg: '#22d3ee', text: '#164e63' },
        'i': { bg: '#a3e635', text: '#365314' },
        'j': { bg: '#e879f9', text: '#701a75' },
        'k': { bg: '#38bdf8', text: '#0c4a6e' },
        'l': { bg: '#4ade80', text: '#14532d' },
        'm': { bg: '#fbbf24', text: '#78350f' },
        'n': { bg: '#f472b6', text: '#831843' },
        'o': { bg: '#a855f7', text: '#4c1d95' },
        'p': { bg: '#06b6d4', text: '#155e75' },
        'q': { bg: '#ef4444', text: '#7f1d1d' },
        'r': { bg: '#84cc16', text: '#365314' },
        's': { bg: '#64748b', text: '#f1f5f9' },
        't': { bg: '#f59e0b', text: '#78350f' },
        'u': { bg: '#8b5cf6', text: '#312e81' },
        'v': { bg: '#10b981', text: '#064e3b' },
        'w': { bg: '#f97316', text: '#7c2d12' },
        'x': { bg: '#ec4899', text: '#831843' },
        'y': { bg: '#06b6d4', text: '#0c4a6e' },
        'z': { bg: '#eab308', text: '#713f12' },
        // Numbers 1-20
        '1': { bg: '#dc2626', text: '#fef2f2' },
        '2': { bg: '#2563eb', text: '#eff6ff' },
        '3': { bg: '#16a34a', text: '#f0fdf4' },
        '4': { bg: '#ca8a04', text: '#fffbeb' },
        '5': { bg: '#9333ea', text: '#faf5ff' },
        '6': { bg: '#db2777', text: '#fdf2f8' },
        '7': { bg: '#ea580c', text: '#fff7ed' },
        '8': { bg: '#0891b2', text: '#ecfeff' },
        '9': { bg: '#65a30d', text: '#f7fee7' },
        '10': { bg: '#c026d3', text: '#fdf4ff' },
        '11': { bg: '#0284c7', text: '#f0f9ff' },
        '12': { bg: '#dc2626', text: '#fff1f2' },
        '13': { bg: '#059669', text: '#ecfdf5' },
        '14': { bg: '#7c3aed', text: '#f5f3ff' },
        '15': { bg: '#be123c', text: '#fff1f2' },
        '16': { bg: '#0369a1', text: '#e0f2fe' },
        '17': { bg: '#047857', text: '#ecfdf5' },
        '18': { bg: '#a16207', text: '#fffbeb' },
        '19': { bg: '#7e22ce', text: '#faf5ff' },
        '20': { bg: '#be185d', text: '#fdf2f8' },
        'default': { bg: '#e5e7eb', text: '#374151' }
      };

      // Function to get color for rhyme group
      const getRhymeColor = (group) => {
        if (!group) return rhymeColors.default;
        const key = group.toLowerCase();
        return rhymeColors[key] || rhymeColors.default;
      };

      // Function to measure text width (approximation)
      const measureTextWidth = (text, fontSize) => {
        // Rough approximation: each character is about 0.6 * fontSize wide
        return text.length * fontSize * 0.6;
      };

      // Build SVG content
      let svgContent = '';
      let currentY = config.padding + config.fontSize;
      let maxWidth = 0;

      // Process each line
      lyricsData.forEach((line) => {
        let currentX = config.padding;

        // Process each word in the line
        line.forEach((word) => {
          const text = word.text;
          const rhymeGroup = word.rhymeGroup;
          const colors = getRhymeColor(rhymeGroup);
          
          // Measure text width
          const textWidth = measureTextWidth(text, config.fontSize);
          
          // Check if we need highlighting
          if (rhymeGroup) {
            // Create background rectangle for highlighted words
            const padding = 2;
            const rectWidth = textWidth + (padding * 2);
            const rectHeight = config.fontSize + (padding * 2);
            
            svgContent += `<rect x="${currentX - padding}" y="${currentY - config.fontSize - padding}" width="${rectWidth}" height="${rectHeight}" fill="${colors.bg}" rx="2"/>`;
            
            // Add text with rhyme color
            svgContent += `<text x="${currentX}" y="${currentY}" font-family="Arial, sans-serif" font-size="${config.fontSize}" font-weight="600" fill="${colors.text}">${text}</text>`;
          } else {
            // Regular text
            svgContent += `<text x="${currentX}" y="${currentY}" font-family="Arial, sans-serif" font-size="${config.fontSize}" fill="#374151">${text}</text>`;
          }
          
          // Move X position for next word
          currentX += textWidth + config.wordSpacing;
        });

        // Track maximum width
        maxWidth = Math.max(maxWidth, currentX);
        
        // Move to next line
        currentY += config.lineHeight;
      });

      // Calculate final dimensions
      const svgWidth = Math.max(config.width, maxWidth + config.padding);
      const svgHeight = currentY + config.padding;

      // Create complete SVG
      const svgString = `
        <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${config.backgroundColor}"/>
          ${svgContent}
        </svg>
      `;

      console.log('SVG dimensions:', svgWidth, 'x', svgHeight);

      // Convert SVG to canvas
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      // Create image from SVG
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = svgUrl;
      });

      // Create canvas and draw image
      const canvas = document.createElement('canvas');
      canvas.width = svgWidth * 2; // Higher resolution
      canvas.height = svgHeight * 2;
      
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2); // High DPI
      ctx.drawImage(img, 0, 0);
      
      // Clean up
      URL.revokeObjectURL(svgUrl);
      
      // Convert to data URL
      const imgData = canvas.toDataURL('image/png', 0.95);
      
      // Calculate PDF dimensions
      const pdfWidth = 210; // A4 width in mm
      const pdfMargin = 10;
      const imgWidth = pdfWidth - (pdfMargin * 2);
      const imgHeight = (svgHeight * imgWidth) / svgWidth;
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [pdfWidth, Math.max(297, imgHeight + 40)]
      });
      
      // Add title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${songTitle}`, pdfMargin, 15);
      
      // Add image
      pdf.addImage(imgData, 'PNG', pdfMargin, 25, imgWidth, imgHeight);
      
      // Save
      pdf.save(`${songTitle}_rhyme_scheme.pdf`);
      
      console.log('PDF generated successfully');
      
    } catch (error) {
      console.error('Error generating SVG PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowGroupMenu(false);
      setSelectedWord(null);
    };

    if (showGroupMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showGroupMenu]);

  return (
    <div 
      className={`mb-6 rounded-lg border ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
      }`}
      data-rhyme-editor
    >
      {/* Header */}
      <div 
        className={`p-4 flex items-center justify-between cursor-pointer ${
          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Edit3 className="w-5 h-5" />
          <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Manual Rhyme Editor
          </h4>
        </div>
        {isExpanded ? <ChevronUp /> : <ChevronDown />}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {/* Disclaimer */}
          <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${
            darkMode ? 'bg-gray-700' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
              darkMode ? 'text-yellow-400' : 'text-yellow-600'
            }`} />
            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <p className="font-medium mb-1">Rhyme detection is not always 100% accurate</p>
              <p>Use this tool to manually adjust rhyme groups. Click any word in edit mode to change its rhyme group or remove it from rhyming.</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isEditMode
                  ? darkMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-600 text-white'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
            </button>

            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className={`px-3 py-2 rounded-lg transition-colors ${
                historyIndex <= 0
                  ? darkMode
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Undo
            </button>

            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className={`px-3 py-2 rounded-lg transition-colors ${
                historyIndex >= history.length - 1
                  ? darkMode
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Redo
            </button>

            <button
              onClick={handleReset}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Original
            </button>

            <button
              onClick={handleExportPDF}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>
      )}

      {/* Rhyme Group Selection Menu */}
      {showGroupMenu && selectedWord && (
        <div
          className={`fixed z-50 rounded-lg shadow-lg border rhyme-group-menu ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
          style={{
            left: menuPosition.x,
            top: menuPosition.y,
            maxHeight: '400px',
            width: '320px',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`p-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              "{selectedWord.word.clean}"
            </div>
            {selectedWord.word.rhymeGroup && (
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Current group: {selectedWord.word.rhymeGroup}
              </div>
            )}
          </div>
          
          <div className="p-2">
            <button
              onClick={() => updateRhymeGroup(null)}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${
                darkMode ? 'hover:bg-gray-700' : ''
              }`}
            >
              Remove from rhyme group
            </button>
            
            <div className={`my-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`} />
            
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {rhymeGroups.map(group => {
                const preview = getGroupPreview(group);
                const isActive = rhymeGroupWords[group] && rhymeGroupWords[group].length > 0;
                const isCurrentGroup = selectedWord.word.rhymeGroup === group;
                
                return (
                  <button
                    key={group}
                    onClick={() => updateRhymeGroup(group)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between group ${
                      isCurrentGroup
                        ? darkMode
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-500 text-white'
                        : darkMode
                          ? 'hover:bg-gray-700'
                          : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span 
                        className={`inline-block w-6 h-6 rounded text-center leading-6 font-medium ${getManualRhymeClass(group)}`}
                        style={{
                          fontSize: '12px',
                          lineHeight: '24px'
                        }}
                      >
                        {group}
                      </span>
                      <span className={isCurrentGroup ? 'text-white' : ''}>
                        Group {group}
                      </span>
                    </div>
                    {isActive && (
                      <span className={`text-xs truncate max-w-[180px] ${
                        isCurrentGroup 
                          ? 'text-white opacity-80' 
                          : darkMode 
                            ? 'text-gray-400' 
                            : 'text-gray-500'
                      }`}>
                        {preview}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RhymeEditor;