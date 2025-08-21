import React from 'react';

const HighlightedLyrics = ({ structuredLyrics, darkMode }) => {
  if (!structuredLyrics) return null;

  const getManualRhymeClass = (groupIdentifier) => {
    if (!groupIdentifier) return 'rhyme-group-default';
    
    // Handle letters (A-Z)
    if (/^[A-Z]$/.test(groupIdentifier)) {
      return `rhyme-group-${groupIdentifier.toLowerCase()}`;
    }
    
    // Handle numbers (1-9, 0)
    if (/^[0-9]$/.test(groupIdentifier)) {
      return `rhyme-group-${groupIdentifier}`;
    }
    
    return 'rhyme-group-default';
  };

  return (
    <pre className={`whitespace-pre-wrap leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
      {structuredLyrics.map((line, lineIndex) => (
        <div key={lineIndex} style={{ minHeight: '1.5em' }}>
          {line.map((word) => {
            return word.rhymeGroup ? (
              <span
                key={word.id}
                className={`rhyme-word-highlight ${getManualRhymeClass(word.rhymeGroup)}`}
                title={`ID: ${word.rhymeKey || 'N/A'}`}
              >
                {word.text}
              </span>
            ) : (
              <span key={word.id}>{word.text}</span>
            );
          })}
        </div>
      ))}
    </pre>
  );
};

export default HighlightedLyrics;