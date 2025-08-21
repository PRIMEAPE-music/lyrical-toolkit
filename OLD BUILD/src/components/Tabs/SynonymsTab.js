import React from 'react';

const SynonymsTab = ({ 
  synonymResults, 
  synonymLoading, 
  synonymQuery,
  onSearchInLyrics,
  darkMode 
}) => {
  return (
    <div>
      {synonymLoading && (
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Finding synonyms and antonyms...
        </div>
      )}

      {synonymResults && (
        <div className="grid gap-6 md:grid-cols-2 mobile-grid">
          <div className={`rounded-lg border p-6 transition-colors ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Synonyms for "{synonymQuery}"  
            </h3>
            {synonymResults.synonyms.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {synonymResults.synonyms.map((word, index) => (
                  <button
                    key={index}
                    onClick={() => onSearchInLyrics(word.word, 'rhymes')}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      darkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {word.word}
                  </button>
                ))}
              </div>
            ) : (
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No synonyms found
              </p>
            )}
          </div>

          <div className={`rounded-lg border p-6 transition-colors ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Antonyms for "{synonymQuery}"
            </h3>
            {synonymResults.antonyms.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {synonymResults.antonyms.map((word, index) => (
                  <button
                    key={index}
                    onClick={() => onSearchInLyrics(word.word, 'rhymes')}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      darkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {word.word}
                  </button>
                ))}
              </div>
            ) : (
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No antonyms found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SynonymsTab;