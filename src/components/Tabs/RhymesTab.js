import React from 'react';

const RhymesTab = ({ 
  rhymeResults, 
  rhymeLoading, 
  rhymeQuery,
  onSearchInLyrics,
  darkMode 
}) => {
  return (
    <div>
      {rhymeLoading && (
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Finding rhymes...
        </div>
      )}

      {rhymeResults && (
        <div className="space-y-6">
          <div className={`rounded-lg border p-6 transition-colors ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Perfect Rhymes for "{rhymeQuery}"
            </h3>
            {rhymeResults.perfect.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {rhymeResults.perfect.map((word, index) => (
                  <button
                    key={index}
                    onClick={() => onSearchInLyrics(word.word, 'dictionary')}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      darkMode 
                        ? 'bg-blue-900 hover:bg-blue-800 text-blue-200' 
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                    }`}
                  >
                    {word.word}
                  </button>
                ))}
              </div>
            ) : (
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No perfect rhymes found
              </p>
            )}
          </div>

          <div className={`rounded-lg border p-6 transition-colors ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Near Rhymes for "{rhymeQuery}"
            </h3>
            {rhymeResults.near.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {rhymeResults.near.map((word, index) => (
                  <button
                    key={index}
                    onClick={() => onSearchInLyrics(word.word, 'dictionary')}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      darkMode 
                        ? 'bg-green-900 hover:bg-green-800 text-green-200' 
                        : 'bg-green-100 hover:bg-green-200 text-green-800'
                    }`}
                  >
                    {word.word}
                  </button>
                ))}
              </div>
            ) : (
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No near rhymes found
              </p>
            )}
          </div>

          <div className={`rounded-lg border p-6 transition-colors ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Sounds Like "{rhymeQuery}"
            </h3>
            {rhymeResults.soundsLike.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {rhymeResults.soundsLike.map((word, index) => (
                  <button
                    key={index}
                    onClick={() => onSearchInLyrics(word.word, 'dictionary')}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      darkMode 
                        ? 'bg-purple-900 hover:bg-purple-800 text-purple-200' 
                        : 'bg-purple-100 hover:bg-purple-200 text-purple-800'
                    }`}
                  >
                    {word.word}
                  </button>
                ))}
              </div>
            ) : (
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No similar sounding words found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RhymesTab;