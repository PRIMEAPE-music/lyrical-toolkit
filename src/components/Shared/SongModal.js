import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import AudioPlayer from './AudioPlayer';

const SongModal = ({ selectedSong, onClose, highlightWord, darkMode }) => {
  if (!selectedSong) return null;

  const [highlightIndex, setHighlightIndex] = useState(0);
  const words = useMemo(
    () => selectedSong.lyrics.split(/\s+/),
    [selectedSong.lyrics]
  );

  const handleTimeUpdate = (currentTime, duration) => {
    if (!duration) return;
    const index = Math.floor((currentTime / duration) * words.length);
    setHighlightIndex(index);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className={`rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden transition-colors ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <div
          className={`flex items-center justify-between p-6 border-b transition-colors ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <h2
            className={`text-xl font-semibold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {selectedSong.title}
          </h2>
          <button
            onClick={onClose}
            className={`transition-colors ${
              darkMode
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        {selectedSong.audioUrl && (
          <div className="p-6 pt-4">
            <AudioPlayer src={selectedSong.audioUrl} onTimeUpdate={handleTimeUpdate} />
          </div>
        )}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <pre
            className={`whitespace-pre-wrap leading-relaxed ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            {words.map((word, idx) => {
              const isPast = idx < highlightIndex;
              const matchesSearch =
                highlightWord &&
                word.toLowerCase().includes(highlightWord.toLowerCase());
              const classes = [
                isPast ? 'bg-blue-200' : '',
                matchesSearch ? 'text-red-600' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <span key={idx} className={classes}>
                  {word + ' '}
                </span>
              );
            })}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default SongModal;
