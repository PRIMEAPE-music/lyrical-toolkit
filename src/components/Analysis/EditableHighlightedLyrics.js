import React from 'react';

const EditableHighlightedLyrics = ({ 
  structuredLyrics, 
  darkMode, 
  isEditMode, 
  onWordClick 
}) => {
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
    <pre 
      id="rhyme-visualization"
      className={`whitespace-pre-wrap leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
    >
      {structuredLyrics.map((line, lineIndex) => (
        <div key={lineIndex} style={{ minHeight: '1.5em' }}>
          {line.map((word, wordIndex) => {
            const hasRhyme = word.rhymeGroup;
            const isEditable = isEditMode && word.clean && word.clean.length > 0;
            
            return (
              <span
                key={word.id}
                className={`
                  ${hasRhyme ? `rhyme-word-highlight ${getManualRhymeClass(word.rhymeGroup)}` : ''}
                  ${isEditable ? 'editable-word' : ''}
                  ${word.manuallyEdited ? 'manually-edited' : ''}
                `}
                onClick={(e) => isEditable ? onWordClick(word, lineIndex, wordIndex, e) : null}
                title={hasRhyme ? `Group: ${word.rhymeGroup}${word.manuallyEdited ? ' (edited)' : ''}` : ''}
              >
                {word.text}
              </span>
            );
          })}
        </div>
      ))}
    </pre>
  );
};

export default EditableHighlightedLyrics;