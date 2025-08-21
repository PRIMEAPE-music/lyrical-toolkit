import React from 'react';
import { X } from 'lucide-react';
import { highlightText } from '../../utils/textAnalysis';

const SongModal = ({ selectedSong, onClose, highlightWord, darkMode }) => {
  if (!selectedSong) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden transition-colors ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className={`flex items-center justify-between p-6 border-b transition-colors ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {selectedSong.title}
          </h2>
          <button
            onClick={onClose}
            className={`transition-colors ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <pre className={`whitespace-pre-wrap leading-relaxed ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {highlightWord ? highlightText(selectedSong.lyrics, highlightWord) : selectedSong.lyrics}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default SongModal;