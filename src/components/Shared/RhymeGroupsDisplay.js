import React, { useState } from 'react';

const RhymeGroupsDisplay = ({ rhymeGroups, darkMode, onWordClick }) => {
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // Helper function to convert phonetic code to readable rhyme pattern
  const formatRhymeSound = (phoneticCode, wordsInGroup) => {
    if (!phoneticCode || !wordsInGroup || wordsInGroup.length === 0) return 'Unknown';
    
    // Group words by actual rhyming sound rather than just spelling
    const soundGroups = new Map();
    
    wordsInGroup.forEach(word => {
      const lowerWord = word.toLowerCase();
      let soundGroup = null;
      
      // Group by rhyming sound families (how they actually sound, not just spelling)
      if (['ake', 'ape', 'ate', 'ain', 'aint', 'ane'].some(ending => lowerWord.endsWith(ending))) {
        soundGroup = 'ay-sound'; // make, take, shape, paint, chain, dates
      }
      else if (['ine', 'ime', 'ike', 'ight', 'ite', 'ide'].some(ending => lowerWord.endsWith(ending))) {
        soundGroup = 'i-sound'; // time, line, mind, kind, live, trite, unite, alike
      }
      else if (['oom', 'ew', 'ue', 'oo'].some(ending => lowerWord.endsWith(ending))) {
        soundGroup = 'oo-sound'; // boom, grew, food
      }
      else if (['ort', 'orse', 'orce', 'ourt'].some(ending => lowerWord.endsWith(ending))) {
        soundGroup = 'or-sound'; // short, force, court
      }
      else if (['ed', 'est', 'et', 'ess'].some(ending => lowerWord.endsWith(ending))) {
        soundGroup = 'e-sound'; // best, stress, created, emitted
      }
      else if (['ly', 'y'].some(ending => lowerWord.endsWith(ending))) {
        soundGroup = 'y-sound'; // collectively, endlessly
      }
      else if (['tion', 'sion', 'ous', 'us'].some(ending => lowerWord.endsWith(ending))) {
        soundGroup = 'shun-sound'; // conditions, relations
      }
      else if (['ing', 'ling', 'ning', 'ting'].some(ending => lowerWord.endsWith(ending))) {
        soundGroup = 'ing-sound';
      }
      else {
        // Fallback to simple ending
        const ending = lowerWord.slice(-1);
        soundGroup = `${ending}-sound`;
      }
      
      if (soundGroup) {
        soundGroups.set(soundGroup, (soundGroups.get(soundGroup) || 0) + 1);
      }
    });

    // Get the most common sound groups
    const significantSounds = Array.from(soundGroups.entries())
      .filter(([, count]) => count >= 2 || wordsInGroup.length <= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([sound]) => sound);

    if (significantSounds.length === 0) {
      return 'similar sound';
    }

    // Create readable labels
    const readableLabels = significantSounds.map(sound => {
      if (sound === 'ay-sound') return '-ape, -ake, -ain';
      if (sound === 'i-sound') return '-ine, -ime, -ike';
      if (sound === 'oo-sound') return '-oom, -ew';
      if (sound === 'or-sound') return '-ort, -orce';
      if (sound === 'e-sound') return '-ed, -est';
      if (sound === 'y-sound') return '-ly';
      if (sound === 'shun-sound') return '-tion, -sion';
      if (sound === 'ing-sound') return '-ing';
      return sound.replace('-sound', '');
    });

    if (readableLabels.length === 1) {
      return `${readableLabels[0]} sounds`;
    } else {
      return `${readableLabels.join(', ')} sounds`;
    }
  };

  const toggleGroupExpansion = (groupIndex) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupIndex)) {
      newExpanded.delete(groupIndex);
    } else {
      newExpanded.add(groupIndex);
    }
    setExpandedGroups(newExpanded);
  };

  const displayedGroups = showAllGroups ? rhymeGroups : rhymeGroups.slice(0, 6);

  return (
    <div className="space-y-3">
      {displayedGroups.map((group, index) => {
        const isExpanded = expandedGroups.has(index);
        const wordsToShow = isExpanded ? group.words : group.words.slice(0, 8);
        const hasMoreWords = group.words.length > 8;
        
        return (
          <div key={index} className={`p-3 rounded border ${
            darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {group.count} words with {formatRhymeSound(group.rhymeSound, group.words)}
            </div>
            <div className="flex flex-wrap gap-1 items-center">
              {wordsToShow.map((word, wordIndex) => (
                <button
                  key={wordIndex}
                  onClick={() => onWordClick(word)}
                  className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-white hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {word}
                </button>
              ))}
              {hasMoreWords && !isExpanded && (
                <button
                  onClick={() => toggleGroupExpansion(index)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-200 hover:bg-gray-300 text-blue-600'
                  }`}
                >
                  +{group.words.length - 8} more
                </button>
              )}
              {hasMoreWords && isExpanded && (
                <button
                  onClick={() => toggleGroupExpansion(index)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    darkMode 
                      ? 'bg-gray-600 hover:bg-gray-500 text-blue-300' 
                      : 'bg-gray-200 hover:bg-gray-300 text-blue-600'
                  }`}
                >
                  Show less
                </button>
              )}
            </div>
          </div>
        );
      })}
      
      {rhymeGroups.length > 6 && (
        <div className="text-center">
          <button
            onClick={() => setShowAllGroups(!showAllGroups)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            {showAllGroups 
              ? 'Show Less Groups' 
              : `Show ${rhymeGroups.length - 6} More Groups`
            }
          </button>
        </div>
      )}
    </div>
  );
};

export default RhymeGroupsDisplay;