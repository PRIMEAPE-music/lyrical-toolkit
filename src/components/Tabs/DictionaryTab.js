import React from 'react';

const DictionaryTab = ({ 
  definitionResults, 
  definitionLoading, 
  definitionQuery,
  onSearchInLyrics,
  darkMode 
}) => {
  return (
    <div>
      {definitionLoading && (
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Looking up definition...
        </div>
      )}

      {definitionResults && (
        <div className="space-y-4">
          {definitionResults.length > 0 ? (
            definitionResults.map((entry, entryIndex) => (
              <div key={entryIndex} className={`rounded-lg border p-6 transition-colors ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {entry.word}
                  </h2>
                  <button
                    onClick={() => onSearchInLyrics(entry.word)}
                    className={`text-sm px-3 py-1 rounded transition-colors ${
                      darkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    Search in lyrics
                  </button>
                </div>
                
                {entry.phonetics && entry.phonetics[0] && (
                  <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {entry.phonetics[0].text}
                  </p>
                )}

                {entry.meanings.map((meaning, meaningIndex) => (
                  <div key={meaningIndex} className="mb-4">
                    <h3 className={`font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {meaning.partOfSpeech}
                    </h3>
                    <div className="space-y-2">
                      {meaning.definitions.slice(0, 3).map((def, defIndex) => (
                        <div key={defIndex}>
                          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {defIndex + 1}. {def.definition}
                          </p>
                          {def.example && (
                            <p className={`text-sm italic mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Example: "{def.example}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No definition found for "{definitionQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DictionaryTab;