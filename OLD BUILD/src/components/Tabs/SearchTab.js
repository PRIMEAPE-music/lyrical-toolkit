import React from 'react';
import { Search } from 'lucide-react';
import { highlightText } from '../../utils/textAnalysis';

const SearchTab = ({ 
  searchQuery, 
  highlightWord, 
  searchResults, 
  songs, 
  stats, 
  onSongSelect, 
  darkMode 
}) => {
  return (
    <div>
      {(searchQuery || highlightWord) ? (
        <div>
          <div className={`mb-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Found {searchResults.reduce((total, result) => total + result.matchCount, 0)} matches 
            in {searchResults.length} verse{searchResults.length !== 1 ? 's' : ''}{' '}
            for "{searchQuery || highlightWord}"
            {highlightWord && !searchQuery && (
              <span className={`ml-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                (highlighted from other tabs)
              </span>
            )}
          </div>
          
          <div className="space-y-4">
            {searchResults.map((result, index) => (
              <div key={index} className={`rounded-lg border p-4 transition-colors ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {result.songTitle}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {result.matchCount} match{result.matchCount !== 1 ? 'es' : ''}
                    </span>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Verse {result.verseIndex} • Line {result.lineNumber}
                    </span>
                  </div>
                </div>
                
                <div className={`text-sm leading-relaxed whitespace-pre-line ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {highlightText(result.verseContent, searchQuery || highlightWord, result.isExactMatch)}
                </div>
                
                <button
                  onClick={() => onSongSelect(songs.find(s => s.id === result.songId))}
                  className={`mt-3 text-xs underline transition-colors ${
                    darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  View full song
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Search className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
          <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Start searching your lyrics
          </h3>
          <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Enter any word or phrase to find where you've used it before
          </p>
          
          {songs.length > 0 && (
            <div className={`rounded-lg border p-4 max-w-md mx-auto transition-colors ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className={`text-sm space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <div>{stats.totalSongs} songs loaded</div>
                <div>{stats.totalWords.toLocaleString()} total words</div>
                <div>{stats.uniqueWords.toLocaleString()} unique words</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchTab;