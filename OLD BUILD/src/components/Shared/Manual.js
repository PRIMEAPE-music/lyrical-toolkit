import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

const Manual = ({ showManual, onClose, darkMode }) => {
  const [manualContent, setManualContent] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // Load manual content - wrapped in useCallback to prevent dependency issues
  const loadManual = useCallback(async () => {
    if (manualContent) return; // Already loaded
    
    setManualLoading(true);
    try {
      const response = await fetch('/MANUAL.txt');
      if (response.ok) {
        const content = await response.text();
        setManualContent(content);
      } else {
        setManualContent('Manual content could not be loaded.');
      }
    } catch (error) {
      console.error('Failed to load manual:', error);
      setManualContent('Error loading manual content.');
    }
    setManualLoading(false);
  }, [manualContent]);

  useEffect(() => {
    if (showManual && !manualContent) {
      loadManual();
    }
  }, [showManual, manualContent, loadManual]);

  if (!showManual) return null;

  return (
    <div className={`rounded-lg border p-6 mb-6 transition-colors ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          User Manual
        </h2>
        <button
          onClick={onClose}
          className={`transition-colors ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {manualLoading ? (
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Loading manual...
        </div>
      ) : (
        <div className={`whitespace-pre-line leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {manualContent.split('\n').map((line, index) => {
            // Make section headers bold (lines that are all caps or start with caps and don't have lowercase)
            const isHeader = line.match(/^[A-Z][A-Z\s-]*$/) && line.trim().length > 0;
            const isSubHeader = line.match(/^[A-Z][a-z\s]*:$/) && line.trim().length > 0;
            
            if (isHeader) {
              return (
                <div key={index} className={`font-bold text-lg mt-6 mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {line}
                </div>
              );
            } else if (isSubHeader) {
              return (
                <div key={index} className={`font-semibold mt-4 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {line}
                </div>
              );
            } else {
              return <div key={index}>{line}</div>;
            }
          })}
        </div>
      )}
    </div>
  );
};

export default Manual;