import React from 'react';
import RhymeGroupsDisplay from '../Shared/RhymeGroupsDisplay';

const StatsTab = ({ 
  songs,
  stats,
  selectedStatsFilter,
  setSelectedStatsFilter,
  onSearchInLyrics,
  darkMode 
}) => {
  return (
    <div className="space-y-6">
      {/* Song Selection Dropdown */}
      <div className={`rounded-lg border p-4 transition-colors ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Analyze Statistics For:
        </label>
        <select
          value={selectedStatsFilter}
          onChange={(e) => setSelectedStatsFilter(e.target.value)}
          className={`w-full max-w-md p-2 rounded border ${
            darkMode 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="all">All Songs ({songs.length} songs)</option>
          {songs.map(song => (
            <option key={song.id} value={song.id.toString()}>
              {song.title}
            </option>
          ))}
        </select>
      </div>

      {/* Basic Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`rounded-lg border p-4 text-center transition-colors ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {stats.totalSongs}
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {selectedStatsFilter === 'all' ? 'Total Songs' : 'Selected Song'}
          </div>
        </div>
        <div className={`rounded-lg border p-4 text-center transition-colors ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {stats.totalWords.toLocaleString()}
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Total Words
          </div>
        </div>
        <div className={`rounded-lg border p-4 text-center transition-colors ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {stats.uniqueWords.toLocaleString()}
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Unique Words
          </div>
        </div>
        <div className={`rounded-lg border p-4 text-center transition-colors ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {stats.totalWords > 0 ? ((stats.uniqueWords / stats.totalWords) * 100).toFixed(1) : 0}%
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Vocabulary Richness
          </div>
        </div>
      </div>

      {/* Structure & Composition Stats */}
      <div className={`rounded-lg border p-6 transition-colors ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Structure & Composition
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.averageLinesPerSong}
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Avg Lines Per Song
            </div>
          </div>
          <div className="text-center">
            <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.averageWordsPerSong}
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Avg Words Per Song
            </div>
          </div>
          <div className="text-center">
            <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.averageWordLength}
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Avg Word Length
            </div>
          </div>
          <div className="text-center">
            <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.averageSyllablesPerWord}
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Avg Syllables Per Word
            </div>
          </div>
        </div>
      </div>

      {/* Syllable Distribution */}
      <div className={`rounded-lg border p-6 transition-colors ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Syllable Distribution
        </h3>
        <div className="space-y-3">
          {Object.entries(stats.syllableDistribution)
            .sort(([a], [b]) => {
              if (a === '5+') return 1;
              if (b === '5+') return -1;
              return parseInt(a) - parseInt(b);
            })
            .map(([syllables, count]) => {
              const percentage = stats.totalWords > 0 ? (count / stats.totalWords * 100).toFixed(1) : 0;
              return (
                <div key={syllables} className="flex items-center justify-between">
                  <div className="flex items-center w-1/3">
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {syllables} syllable{syllables !== '1' ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className={`h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div 
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${Math.min(100, percentage * 2)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className={`text-sm w-20 text-right ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {count} ({percentage}%)
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Word Length Distribution */}
      <div className={`rounded-lg border p-6 transition-colors ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Word Length Distribution
        </h3>
        <div className="space-y-3">
          {Object.entries(stats.wordLengthDistribution)
            .sort(([a], [b]) => {
              if (a === '11+') return 1;
              if (b === '11+') return -1;
              return parseInt(a) - parseInt(b);
            })
            .map(([length, count]) => {
              const percentage = stats.totalWords > 0 ? (count / stats.totalWords * 100).toFixed(1) : 0;
              return (
                <div key={length} className="flex items-center justify-between">
                  <div className="flex items-center w-1/3">
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {length} character{length !== '1' ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className={`h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div 
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: `${Math.min(100, percentage * 2)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className={`text-sm w-20 text-right ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {count} ({percentage}%)
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Reading Level & Complexity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`rounded-lg border p-6 transition-colors ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Reading Level
          </h3>
          <div className="text-center">
            <div className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.readingLevel.toFixed(1)}
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Flesch-Kincaid Grade Level
            </div>
            <div className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {stats.readingLevel < 6 ? 'Elementary' :
               stats.readingLevel < 9 ? 'Middle School' :
               stats.readingLevel < 13 ? 'High School' :
               stats.readingLevel < 16 ? 'College' : 'Graduate'}
            </div>
          </div>
        </div>

        <div className={`rounded-lg border p-6 transition-colors ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Vocabulary Complexity
          </h3>
          <div className="text-center">
            <div className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.vocabularyComplexity.toFixed(1)}
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Complexity Score
            </div>
            <div className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {stats.vocabularyComplexity < 2 ? 'Simple' :
               stats.vocabularyComplexity < 3 ? 'Moderate' :
               stats.vocabularyComplexity < 4 ? 'Complex' : 'Very Complex'}
            </div>
          </div>
        </div>
      </div>

      {/* Rhyme Analysis */}
      <div className={`rounded-lg border p-6 transition-colors ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Rhyme Analysis
        </h3>
        
        {/* Rhyme Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="text-center">
            <div className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {stats.rhymeStats.perfectRhymes}
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Perfect Rhymes
            </div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
              {stats.rhymeStats.nearRhymes}
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Near Rhymes
            </div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
              {stats.rhymeStats.soundsLike}
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Sounds Like
            </div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
              {stats.rhymeStats.internalRhymes}
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Internal Rhymes
            </div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
              {stats.rhymeStats.rhymeDensity.toFixed(1)}%
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Rhyme Density
            </div>
          </div>
        </div>

        {/* Top Rhyme Groups */}
        {stats.rhymeStats.allRhymeGroups.length > 0 && (
          <div>
            <h4 className={`text-md font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Top Rhyme Groups
            </h4>
            <RhymeGroupsDisplay 
              rhymeGroups={stats.rhymeStats.allRhymeGroups}
              darkMode={darkMode}
              onWordClick={(word) => {
                onSearchInLyrics(word);
              }}
            />
          </div>
        )}
      </div>

      {/* Most Used Words - Enhanced */}
      {stats.mostUsedWords.length > 0 && (
        <div className={`rounded-lg border p-6 transition-colors ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Most Used Words
          </h3>
          <div className="space-y-2">
            {stats.mostUsedWords.map(([word, count], index) => {
              const percentage = stats.totalWords > 0 ? (count / stats.totalWords * 100).toFixed(2) : 0;
              return (
                <div key={word} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`text-sm w-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {index + 1}.
                    </span>
                    <button
                      onClick={() => onSearchInLyrics(word)}
                      className={`px-2 py-1 rounded transition-colors ${
                        darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                    >
                      {word}
                    </button>
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {count} times ({percentage}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsTab;