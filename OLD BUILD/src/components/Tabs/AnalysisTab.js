import React, { useState } from 'react';
import { generateRhymingDictionary, analyzeMeter, performWritingQualityAnalysis } from '../../utils/textAnalysis';
import { analyzeFullTextRhymes } from '../../utils/phoneticUtils';
import { songVocabularyPhoneticMap } from '../../data/songVocabularyPhoneticMap';
import geminiService from '../../services/geminiService';
import RhymeEditor from '../Analysis/RhymeEditor';
import EditableHighlightedLyrics from '../Analysis/EditableHighlightedLyrics';

const AnalysisTab = ({ 
  songs,
  selectedSongForAnalysis,
  setSelectedSongForAnalysis,
  analysisResults,
  setAnalysisResults,
  analysisType,
  setAnalysisType,
  onSearchInLyrics,
  stats,
  darkMode 
}) => {
  // State for edited lyrics
  const [editedStructuredLyrics, setEditedStructuredLyrics] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Add coherence analysis state
  const [coherenceResults, setCoherenceResults] = useState(null);
  const [coherenceLoading, setCoherenceLoading] = useState(false);
  
  // Add performance analysis state
  const [performanceResults, setPerformanceResults] = useState(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);

  const handleRhymingDictionary = () => {
    if (songs.length === 0) {
      alert('Please upload some songs first!');
      return;
    }
    const rhymeDict = generateRhymingDictionary(songs);
    setAnalysisResults(rhymeDict);
    setAnalysisType('rhyming-dictionary');
  };


  const handleWritingQuality = () => {
  if (!selectedSongForAnalysis) return;
  const song = songs.find(s => s.id.toString() === selectedSongForAnalysis.toString());
  if (!song) return;

  // Clear performance results when running writing quality
  setPerformanceResults(null);

  setAnalysisResults(null); 
  setAnalysisType('writing-quality-loading');
    
    try {
      const qualityAnalysis = performWritingQualityAnalysis(song.lyrics);
      
      setAnalysisResults({
        song,
        ...qualityAnalysis
      });
      setAnalysisType('writing-quality');
    } catch (error) {
      console.error('Error in writing quality analysis:', error);
      alert('An error occurred during writing quality analysis.');
      setAnalysisType(null);
    }
  };

  const handleCoherenceAnalysis = async () => {
    if (!selectedSongForAnalysis) return;
    const song = songs.find(s => s.id.toString() === selectedSongForAnalysis.toString());
    if (!song) return;

    setCoherenceLoading(true);
    setCoherenceResults(null);
    
    try {
      const result = await geminiService.analyzeLyricalCoherence(song.lyrics, song.title);
      setCoherenceResults(result);
    } catch (error) {
      console.error('Error in coherence analysis:', error);
      setCoherenceResults({
        success: false,
        error: error.message
      });
    }
    
    setCoherenceLoading(false);
  };

  const handlePerformanceAnalysis = async (forceFresh = false) => {
    if (!selectedSongForAnalysis) return;
    const song = songs.find(s => s.id.toString() === selectedSongForAnalysis.toString());
    if (!song) return;

    console.log(`Performance analysis started. Force fresh: ${forceFresh}`);

    // Clear writing quality results when running performance analysis
    setAnalysisResults(null);
    setAnalysisType(null);

    setPerformanceLoading(true);
    setPerformanceResults(null);
    
    try {
      const result = await geminiService.analyzePerformanceAndStyle(song.lyrics, song.title, forceFresh);
      setPerformanceResults(result);
      console.log('Performance analysis completed:', result.success ? 'Success' : 'Failed');
    } catch (error) {
      console.error('Error in performance analysis:', error);
      setPerformanceResults({
        success: false,
        error: error.message,
        retryable: true
      });
    }
    
    setPerformanceLoading(false);
  };

  const handleRhymeScheme = () => {
    if (!selectedSongForAnalysis) return;
    const song = songs.find(s => s.id.toString() === selectedSongForAnalysis.toString());
    if (!song) return;

    setAnalysisResults(null); 
    setAnalysisType('rhyme-scheme-loading');
    
    try {
      const structuredLyrics = analyzeFullTextRhymes(song.lyrics, songVocabularyPhoneticMap); 
      setAnalysisResults({ song, structuredLyrics });
      setAnalysisType('rhyme-scheme');
    } catch (error) {
      console.error('Error in phonetic rhyme analysis:', error);
      alert('An error occurred during rhyme analysis.');
      setAnalysisType(null);
    }
  };

  const handleMeterAnalysis = () => {
    if (!selectedSongForAnalysis) return;
    const song = songs.find(s => s.id.toString() === selectedSongForAnalysis.toString());
    if (!song) {
      console.error('Song not found:', selectedSongForAnalysis);
      return;
    }
    try {
      const meterAnalysis = analyzeMeter(song.lyrics);
      setAnalysisResults({song, meterAnalysis});
      setAnalysisType('meter-analysis');
    } catch (error) {
      console.error('Error in meter analysis:', error);
      alert('Error analyzing syllables. Please try again.');
    }
  };

  return (
    <div>
      {/* Song Selection - Moved to Top */}
      <div className={`p-4 rounded-lg border mb-6 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h3 className="font-medium mb-2">Select Song to Analyze</h3>
        <select
          value={selectedSongForAnalysis || ''}
          onChange={(e) => setSelectedSongForAnalysis(e.target.value)}
          className={`w-full max-w-md p-3 rounded border ${
            darkMode 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="">Choose a song...</option>
          {songs.map(song => (
            <option key={song.id} value={song.id.toString()}>{song.title}</option>
          ))}
        </select>
      </div>

      {/* Analysis Buttons Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        <button
          onClick={handleRhymingDictionary}
          className={`p-4 rounded-lg border transition-colors ${
            darkMode 
              ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-white' 
              : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'
          }`}
        >
          <h3 className="font-medium mb-2">Rhyming Dictionary</h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Generate from your lyrics
          </p>
        </button>

        <button
          onClick={handleRhymeScheme}
          disabled={!selectedSongForAnalysis}
          className={`p-4 rounded-lg border transition-colors ${
            selectedSongForAnalysis
              ? darkMode 
                ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-white' 
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'
              : darkMode
                ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <h3 className="font-medium mb-2">Rhyme Scheme</h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Visualize rhyming patterns
          </p>
        </button>

        <button
          onClick={handleMeterAnalysis}
          disabled={!selectedSongForAnalysis}
          className={`p-4 rounded-lg border transition-colors ${
            selectedSongForAnalysis
              ? darkMode 
                ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-white' 
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'
              : darkMode
                ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <h3 className="font-medium mb-2">Syllables</h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Count syllables & analyze meter
          </p>
        </button>
        
        <button
          onClick={() => handlePerformanceAnalysis(true)}
          disabled={performanceLoading}
          className={`p-4 rounded-lg border transition-colors ${
            selectedSongForAnalysis
              ? darkMode 
                ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-white' 
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'
              : darkMode
                ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <h3 className="font-medium mb-2">Performance & Style</h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            AI analysis of vocal flow and style
          </p>
        </button>

        <button
          onClick={handleWritingQuality}
          disabled={!selectedSongForAnalysis}
          className={`p-4 rounded-lg border transition-colors ${
            selectedSongForAnalysis
              ? darkMode 
                ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-white' 
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'
              : darkMode
                ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <h3 className="font-medium mb-2">Writing Quality</h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Technical and AI Writing Analysis
          </p>
        </button>
      </div>

      {/* Quick Stats - Moved to Bottom */}
      <div className={`p-4 rounded-lg border mb-6 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h3 className="font-medium mb-2">Quick Stats</h3>
        <div className={`text-sm space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div>{songs.length} songs loaded</div>
          <div>{stats.totalWords.toLocaleString()} total words</div>
          <div>{stats.uniqueWords.toLocaleString()} unique words</div>
        </div>
      </div>
      
      {/* Analysis Results */}
      {analysisResults && (
        <div className={`rounded-lg border p-6 transition-colors ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {analysisType === 'rhyming-dictionary' && (
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Your Personal Rhyming Dictionary
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(analysisResults).slice(0, 20).map(([rhymeKey, words]) => (
                  <div key={rhymeKey} className={`p-3 rounded border ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`font-medium text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Words ending in "-{rhymeKey}"
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {words.map((word, index) => (
                        <span key={word}>
                          <span
                            onClick={() => onSearchInLyrics(word, 'search')}
                            className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
                              darkMode 
                                ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' 
                                : 'bg-white hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            {word}
                          </span>
                          {index < words.length - 1 && (
                            <span className={`text-xs mx-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              ,&nbsp;&nbsp;
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {Object.keys(analysisResults).length > 20 && (
                <p className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Showing first 20 rhyme groups. Total: {Object.keys(analysisResults).length}
                </p>
              )}
            </div>
          )}           

          {analysisType === 'rhyme-scheme-loading' && (
             <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Analyzing Rhymes...</div>
          )}

          {analysisType === 'rhyme-scheme' && analysisResults && (
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Rhyme Analysis: "{analysisResults.song?.title || 'Unknown Song'}"
              </h3>
              
              {/* Rhyme Editor */}
              <RhymeEditor
                structuredLyrics={analysisResults.structuredLyrics}
                editedLyrics={editedStructuredLyrics || analysisResults.structuredLyrics}
                onLyricsUpdate={setEditedStructuredLyrics}
                songId={analysisResults.song?.id}
                songTitle={analysisResults.song?.title}
                darkMode={darkMode}
                isEditMode={isEditMode}
                setIsEditMode={setIsEditMode}
              />
              
              {/* Rhyme Visualization */}
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <h4 className={`text-md font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Rhyme Detection
                </h4>
                <EditableHighlightedLyrics
                  structuredLyrics={editedStructuredLyrics || analysisResults.structuredLyrics}
                  darkMode={darkMode}
                  isEditMode={isEditMode}
                  onWordClick={(word, lineIndex, wordIndex, event) => {
                    // This will be handled by RhymeEditor through props
                    const rhymeEditor = document.querySelector('[data-rhyme-editor]');
                    if (rhymeEditor) {
                      rhymeEditor.dispatchEvent(new CustomEvent('wordClick', {
                        detail: { word, lineIndex, wordIndex, event }
                      }));
                    }
                  }}
                />
              </div>
            </div>
          )}

          {analysisType === 'writing-quality-loading' && (
             <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Analyzing Writing Quality...</div>
          )}

          {analysisType === 'writing-quality' && (
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Writing Quality Analysis: "{analysisResults.song.title}"
              </h3>
              
              {/* Basic Quality Metrics */}
              <div className="grid gap-4 md:grid-cols-4 mb-6 justify-items-center">
                <div className={`p-4 rounded border text-center ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className={`text-3xl font-bold ${
                    analysisResults.summary.qualityScore >= 80 ? 'text-green-500' :
                    analysisResults.summary.qualityScore >= 60 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {analysisResults.summary.qualityScore}
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Quality Score
                  </div>
                </div>
                <div className={`p-4 rounded border text-center ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {analysisResults.summary.totalLines}
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Total Lines
                  </div>
                </div>
                <div className={`p-4 rounded border text-center ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {analysisResults.summary.totalWords}
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Total Words
                  </div>
                </div>
                <div className={`p-4 rounded border text-center ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {analysisResults.summary.avgWordsPerLine}
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Avg Words/Line
                  </div>
                </div>
              </div>

              {/* Improvement Suggestion */}
              <div className={`p-4 rounded border mb-6 ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-200'
              }`} style={{ textAlign: 'center' }}>
                <h4 className={`font-medium mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                  💡 Basic Assessment
                </h4>
                <p className={`${darkMode ? 'text-gray-300' : 'text-blue-700'}`}>
                  {analysisResults.summary.improvement}
                </p>
              </div>

              {/* AI Coherence Analysis Section */}
              <div className={`p-4 rounded border mb-4 ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    🤖 AI Writing Analysis
                  </h4>
                  <button
                    onClick={handleCoherenceAnalysis}
                    disabled={coherenceLoading}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      coherenceLoading
                        ? darkMode
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {coherenceLoading ? 'Analyzing...' : 'Analyze Writing'}
                  </button>
                </div>

                {/* Coherence Results */}
                {coherenceResults && (
                  <div>
                    {coherenceResults.success ? (
                      <div>
                        {/* Cache indicator */}
                        {coherenceResults.fromCache && (
                          <div className={`text-xs mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            📋 Results from cache
                          </div>
                        )}
                        
                        {/* Coherence Score */}
                        <div className="grid gap-4 md:grid-cols-5 mb-4">
                          <div className={`p-3 rounded border text-center ${
                            darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                          }`}>
                            <div className={`text-2xl font-bold ${
                              coherenceResults.coherenceScore >= 80 ? 'text-green-500' :
                              coherenceResults.coherenceScore >= 60 ? 'text-yellow-500' : 'text-red-500'
                            }`}>
                              {coherenceResults.coherenceScore}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Coherence Score
                            </div>
                          </div>
                          <div className={`p-3 rounded border text-center ${
                            darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                          }`}>
                            <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {coherenceResults.storyFlow.charAt(0).toUpperCase() + coherenceResults.storyFlow.slice(1)}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Story Flow
                            </div>
                          </div>
                          <div className={`p-3 rounded border text-center ${
                            darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                          }`}>
                            <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {coherenceResults.thematicUnity.charAt(0).toUpperCase() + coherenceResults.thematicUnity.slice(1)}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Theme Unity
                            </div>
                          </div>
                          <div className={`p-3 rounded border text-center ${
                            darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                          }`}>
                            <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {coherenceResults.narrativeConsistency.charAt(0).toUpperCase() + coherenceResults.narrativeConsistency.slice(1)}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Consistency
                            </div>
                          </div>
                          <div className={`p-3 rounded border text-center ${
                            darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                          }`}>
                            <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {coherenceResults.sectionConnections.charAt(0).toUpperCase() + coherenceResults.sectionConnections.slice(1)}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Connections
                            </div>
                          </div>
                        </div>

                        {/* Overall Assessment */}
                        <div className={`p-3 rounded border mb-4 ${
                          darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                        }`}>
                          <h5 className={`font-medium mb-2 ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
                            📋 Overall Assessment
                          </h5>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {coherenceResults.overallAssessment}
                          </p>
                        </div>

                        {/* Observations */}
                        {coherenceResults.observations.length > 0 && (
                          <div className={`p-3 rounded border mb-4 ${
                            darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                          }`}>
                            <h5 className={`font-medium mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                              🔍 Analysis Observations
                            </h5>
                            <ul className={`text-sm space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {coherenceResults.observations.map((observation, index) => (
                                <li key={index}>• {observation}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* References */}
                        {coherenceResults.references && coherenceResults.references.length > 0 && (
                          <div className={`rounded border mt-4 overflow-hidden ${
                            darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                          }`}>
                            <div className={`p-3 border-b ${
                              darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                            }`}>
                              <h5 className={`font-medium ${darkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                                📚 Cultural References & Allusions
                              </h5>
                            </div>
                            
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                              <table className="w-full">
                                <thead className={`${
                                  darkMode ? 'bg-gray-750' : 'bg-gray-100'
                                }`}>
                                  <tr>
                                    <th className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider border-b ${
                                      darkMode ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-200'
                                    }`}>
                                      Type
                                    </th>
                                    <th className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider border-b ${
                                      darkMode ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-200'
                                    }`}>
                                      Reference
                                    </th>
                                    <th className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider border-b ${
                                      darkMode ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-200'
                                    }`}>
                                      Context
                                    </th>
                                    <th className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider border-b ${
                                      darkMode ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-200'
                                    }`}>
                                      Explanation
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {coherenceResults.references.map((ref, index) => (
                                    <tr key={index} className={`border-b ${
                                      darkMode ? 'border-gray-600' : 'border-gray-200'
                                    } ${
                                      index % 2 === 0 
                                        ? darkMode ? 'bg-gray-800' : 'bg-white'
                                        : darkMode ? 'bg-gray-750' : 'bg-gray-50'
                                    }`}>
                                      <td className="px-3 py-3 align-top">
                                        <span className={`inline-block text-xs px-2 py-1 rounded uppercase font-semibold ${
                                          darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800'
                                        }`}>
                                          {ref.type.charAt(0).toUpperCase() + ref.type.slice(1)}
                                        </span>
                                      </td>
                                      <td className={`px-3 py-3 align-top font-medium text-sm ${
                                        darkMode ? 'text-white' : 'text-gray-900'
                                      }`}>
                                        {ref.reference}
                                      </td>
                                      <td className={`px-3 py-3 align-top text-sm ${
                                        darkMode ? 'text-gray-300' : 'text-gray-700'
                                      }`}>
                                        {ref.context || '—'}
                                      </td>
                                      <td className={`px-3 py-3 align-top text-sm ${
                                        darkMode ? 'text-gray-300' : 'text-gray-700'
                                      }`}>
                                        {ref.explanation}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3 p-3">
                              {coherenceResults.references.map((ref, index) => (
                                <div key={index} className={`p-3 rounded border ${
                                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                                }`}>
                                  {/* Reference Header */}
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h6 className={`font-medium text-sm ${
                                        darkMode ? 'text-white' : 'text-gray-900'
                                      }`}>
                                        {ref.reference}
                                      </h6>
                                    </div>
                                    <span className={`ml-2 inline-block text-xs px-2 py-1 rounded uppercase font-semibold flex-shrink-0 ${
                                      darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800'
                                    }`}>
                                      {ref.type.charAt(0).toUpperCase() + ref.type.slice(1)}
                                    </span>
                                  </div>
                                  
                                  {/* Context (if available) */}
                                  {ref.context && ref.context !== '—' && (
                                    <div className="mb-2">
                                      <span className={`text-xs font-medium ${
                                        darkMode ? 'text-gray-400' : 'text-gray-600'
                                      }`}>
                                        Context: 
                                      </span>
                                      <span className={`text-sm ml-1 ${
                                        darkMode ? 'text-gray-300' : 'text-gray-700'
                                      }`}>
                                        {ref.context}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Explanation */}
                                  <div>
                                    <span className={`text-xs font-medium ${
                                      darkMode ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                      Explanation: 
                                    </span>
                                    <p className={`text-sm mt-1 ${
                                      darkMode ? 'text-gray-300' : 'text-gray-700'
                                    }`}>
                                      {ref.explanation}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`p-3 rounded border ${
                        darkMode ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-200'
                      }`}>
                        <p className={`text-sm ${darkMode ? 'text-red-200' : 'text-red-700'}`}>
                          ❌ Analysis failed: {coherenceResults.error}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {analysisType === 'meter-analysis' && (
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Syllable & Meter Analysis: "{analysisResults.song.title}"
              </h3>
              
              <div className="space-y-2">
                {analysisResults.meterAnalysis.map((lineData, index) => (
                  <div key={index} className="flex items-center gap-4 py-2">
                    <span className={`w-12 text-center font-mono text-sm font-bold flex-shrink-0 ${
                      darkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      {lineData.syllables}
                    </span>
                    <span className={`flex-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {lineData.line.trim() || '(empty line)'}
                    </span>
                    <span className={`text-xs flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {lineData.words} words
                    </span>
                  </div>
                ))}
              </div>
              
              <div className={`mt-4 p-4 rounded border ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className={`text-sm space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div>
                    <strong>Average syllables per line:</strong> {
                      (analysisResults.meterAnalysis.reduce((sum, line) => sum + line.syllables, 0) / 
                      Math.max(1, analysisResults.meterAnalysis.filter(line => line.line.trim()).length)).toFixed(1)
                    }
                  </div>
                  <div>
                    <strong>Total lines:</strong> {analysisResults.meterAnalysis.filter(line => line.line.trim()).length}
                  </div>
                  <div>
                    <strong>Syllable range:</strong> {
                      Math.min(...analysisResults.meterAnalysis.filter(line => line.line.trim()).map(line => line.syllables))
                    } - {
                      Math.max(...analysisResults.meterAnalysis.filter(line => line.line.trim()).map(line => line.syllables))
                    }
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>                     
      )}

      {/* Performance Analysis Loading */}
      {performanceLoading && (
        <div className={`p-4 rounded border mt-6 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            🎤 Analyzing Performance & Style...
          </div>
        </div>
      )}

      {/* Performance Analysis Results - COMPLETELY SEPARATE SECTION */}
      {performanceResults && (
        <div className={`rounded border mt-6 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className={`p-4 border-b ${
            darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                🎤 Performance & Style Analysis: "{songs.find(s => s.id.toString() === selectedSongForAnalysis)?.title}"
              </h3>
              <button
                onClick={() => handlePerformanceAnalysis(false)}
                disabled={performanceLoading}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  performanceLoading
                    ? darkMode
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {performanceLoading ? 'Analyzing...' : 'Re-analyze'}
              </button>
            </div>
            {performanceResults.fromCache && (
              <div className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                📋 Results from cache
              </div>
            )}
          </div>

          <div className="p-4">
            {performanceResults.success ? (
              <div className="space-y-6">
                {/* Vocal Flow Section */}
                <div className={`p-4 rounded border ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}>
                  <h4 className={`font-medium mb-3 flex items-center gap-2 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                    🌊 Vocal Flow
                    <span className={`text-sm px-2 py-1 rounded ${
                      performanceResults.vocalFlow.overallRating === 'smooth' ? 
                        darkMode ? 'bg-green-800 text-green-200' : 'bg-green-200 text-green-800' :
                      performanceResults.vocalFlow.overallRating === 'complex' ? 
                        darkMode ? 'bg-orange-800 text-orange-200' : 'bg-orange-200 text-orange-800' :
                      performanceResults.vocalFlow.overallRating === 'choppy' ? 
                        darkMode ? 'bg-red-800 text-red-200' : 'bg-red-200 text-red-800' :
                      performanceResults.vocalFlow.overallRating === 'varied' ? 
                        darkMode ? 'bg-blue-800 text-blue-200' : 'bg-blue-200 text-blue-800' :
                      darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800'
                    }`}>
                      {performanceResults.vocalFlow.overallRating}
                    </span>
                  </h4>
                  {performanceResults.vocalFlow.flowPatterns.length > 0 && (
                    <div className="mb-3">
                      <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Flow Patterns:
                      </h5>
                      <ul className={`text-sm space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {performanceResults.vocalFlow.flowPatterns.map((pattern, index) => (
                          <li key={index}>• {pattern}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {performanceResults.vocalFlow.difficultSections && performanceResults.vocalFlow.difficultSections.length > 0 && (
                    <div>
                      <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                        Challenging Sections:
                      </h5>
                      <ul className={`text-sm space-y-1 ${darkMode ? 'text-orange-200' : 'text-orange-600'}`}>
                        {performanceResults.vocalFlow.difficultSections.map((section, index) => (
                          <li key={index}>⚠️ {section}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Breath Control Section */}
                <div className={`p-4 rounded border ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}>
                  <h4 className={`font-medium mb-3 flex items-center gap-2 ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
                    💨 Breath Control
                    <span className={`text-sm px-2 py-1 rounded ${
                      performanceResults.breathControl.rating === 'excellent' ? 
                        darkMode ? 'bg-green-800 text-green-200' : 'bg-green-200 text-green-800' :
                      performanceResults.breathControl.rating === 'good' ? 
                        darkMode ? 'bg-blue-800 text-blue-200' : 'bg-blue-200 text-blue-800' :
                      performanceResults.breathControl.rating === 'fair' ? 
                        darkMode ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-200 text-yellow-800' :
                      darkMode ? 'bg-red-800 text-red-200' : 'bg-red-200 text-red-800'
                    }`}>
                      {performanceResults.breathControl.rating}
                    </span>
                  </h4>
                 <div className="grid gap-3 md:grid-cols-2">
                   {performanceResults.breathControl.naturalBreaks && performanceResults.breathControl.naturalBreaks.length > 0 && (
                     <div>
                       <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                         Natural Breaks:
                       </h5>
                       <ul className={`text-sm space-y-1 ${darkMode ? 'text-green-200' : 'text-green-600'}`}>
                         {performanceResults.breathControl.naturalBreaks.map((breakPoint, index) => (
                           <li key={index}>✅ {breakPoint}</li>
                         ))}
                       </ul>
                     </div>
                   )}
                   {performanceResults.breathControl.challengingSections && performanceResults.breathControl.challengingSections.length > 0 && (
                     <div>
                       <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                         Challenging Sections:
                       </h5>
                       <ul className={`text-sm space-y-1 ${darkMode ? 'text-red-200' : 'text-red-600'}`}>
                         {performanceResults.breathControl.challengingSections.map((section, index) => (
                           <li key={index}>⚠️ {section}</li>
                         ))}
                       </ul>
                     </div>
                   )}
                 </div>
               </div>

               {/* Energy & Mood Dynamics Section */}
               {performanceResults.performanceDynamics.energyMapping && performanceResults.performanceDynamics.energyMapping.length > 0 && (
                 <div className={`p-4 rounded border ${
                   darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                 }`}>
                   <h4 className={`font-medium mb-3 ${darkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                     ⚡ Energy & Mood Dynamics
                   </h4>
                   <div className="space-y-2">
                     {performanceResults.performanceDynamics.energyMapping.map((mapping, index) => (
                       <div key={index} className="flex items-center gap-3">
                         <span className={`text-sm font-medium min-w-20 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                           {mapping.section}:
                         </span>
                         <span className={`text-xs px-2 py-1 rounded font-medium ${
                           mapping.energy === 'high' ? 
                             darkMode ? 'bg-red-800 text-red-200' : 'bg-red-200 text-red-800' :
                           mapping.energy === 'medium' ? 
                             darkMode ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-200 text-yellow-800' :
                           darkMode ? 'bg-blue-800 text-blue-200' : 'bg-blue-200 text-blue-800'
                         }`}>
                           {mapping.energy}
                         </span>
                         <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                           {mapping.description}
                         </span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {/* Repetition Analysis Section */}
               <div className={`p-4 rounded border ${
                 darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
               }`}>
                 <h4 className={`font-medium mb-3 ${darkMode ? 'text-orange-300' : 'text-orange-800'}`}>
                   🔄 Repetition Analysis
                 </h4>
                 <div className="grid gap-3 md:grid-cols-3">
                   {performanceResults.repetitionAnalysis.effectiveRepeats && performanceResults.repetitionAnalysis.effectiveRepeats.length > 0 && (
                     <div>
                       <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                         Effective Repeats:
                       </h5>
                       <ul className={`text-sm space-y-1 ${darkMode ? 'text-green-200' : 'text-green-600'}`}>
                         {performanceResults.repetitionAnalysis.effectiveRepeats.map((repeat, index) => (
                           <li key={index}>✅ {repeat}</li>
                         ))}
                       </ul>
                     </div>
                   )}
                   {performanceResults.repetitionAnalysis.overusedPhrases && performanceResults.repetitionAnalysis.overusedPhrases.length > 0 && (
                     <div>
                       <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                         Overused:
                       </h5>
                       <ul className={`text-sm space-y-1 ${darkMode ? 'text-red-200' : 'text-red-600'}`}>
                         {performanceResults.repetitionAnalysis.overusedPhrases.map((phrase, index) => (
                           <li key={index}>⚠️ {phrase}</li>
                         ))}
                       </ul>
                     </div>
                   )}
                   {performanceResults.repetitionAnalysis.missedOpportunities && performanceResults.repetitionAnalysis.missedOpportunities.length > 0 && (
                     <div>
                       <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                         Opportunities:
                       </h5>
                       <ul className={`text-sm space-y-1 ${darkMode ? 'text-blue-200' : 'text-blue-600'}`}>
                         {performanceResults.repetitionAnalysis.missedOpportunities.map((opportunity, index) => (
                           <li key={index}>💡 {opportunity}</li>
                         ))}
                       </ul>
                     </div>
                   )}
                 </div>
               </div>

               {/* Emotional Progression Section */}
               <div className={`p-4 rounded border ${
                 darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
               }`}>
                 <h4 className={`font-medium mb-3 ${darkMode ? 'text-pink-300' : 'text-pink-800'}`}>
                   💭 Emotional Progression
                 </h4>
                 {performanceResults.emotionalProgression.arc && performanceResults.emotionalProgression.arc.length > 0 && (
                   <div className="mb-3">
                     <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                       Emotional Arc:
                     </h5>
                     <div className="flex items-center gap-2 flex-wrap">
                       {performanceResults.emotionalProgression.arc.map((emotion, index) => (
                         <React.Fragment key={index}>
                           <span className={`px-2 py-1 rounded text-sm ${
                             darkMode ? 'bg-pink-800 text-pink-200' : 'bg-pink-200 text-pink-800'
                           }`}>
                             {emotion}
                           </span>
                           {index < performanceResults.emotionalProgression.arc.length - 1 && (
                             <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>→</span>
                           )}
                         </React.Fragment>
                       ))}
                     </div>
                   </div>
                 )}
                 {performanceResults.emotionalProgression.keyMoments && performanceResults.emotionalProgression.keyMoments.length > 0 && (
                   <div>
                     <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                       Key Emotional Moments:
                     </h5>
                     <ul className={`text-sm space-y-1 ${darkMode ? 'text-pink-200' : 'text-pink-700'}`}>
                       {performanceResults.emotionalProgression.keyMoments.map((moment, index) => (
                         <li key={index}>🎯 {moment}</li>
                       ))}
                     </ul>
                   </div>
                 )}
               </div>

               {/* Era/Influence Section */}
               <div className={`p-4 rounded border ${
                 darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
               }`}>
                 <h4 className={`font-medium mb-3 ${darkMode ? 'text-indigo-300' : 'text-indigo-800'}`}>
                   🎵 Era & Influence Detection
                 </h4>
                 <div className="grid gap-3 md:grid-cols-3">
                   <div>
                     <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                       Primary Era:
                     </h5>
                     <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                       darkMode ? 'bg-indigo-800 text-indigo-200' : 'bg-indigo-200 text-indigo-800'
                     }`}>
                       {performanceResults.eraInfluence.primaryEra}
                     </span>
                   </div>
                   {performanceResults.eraInfluence.influences && performanceResults.eraInfluence.influences.length > 0 && (
                     <div>
                       <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                         Influences:
                       </h5>
                       <ul className={`text-sm space-y-1 ${darkMode ? 'text-indigo-200' : 'text-indigo-700'}`}>
                         {performanceResults.eraInfluence.influences.map((influence, index) => (
                           <li key={index}>🎸 {influence}</li>
                         ))}
                       </ul>
                     </div>
                   )}
                   {performanceResults.eraInfluence.modernElements && performanceResults.eraInfluence.modernElements.length > 0 && (
                     <div>
                       <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                         Modern Elements:
                       </h5>
                       <ul className={`text-sm space-y-1 ${darkMode ? 'text-indigo-200' : 'text-indigo-700'}`}>
                         {performanceResults.eraInfluence.modernElements.map((element, index) => (
                           <li key={index}>✨ {element}</li>
                         ))}
                       </ul>
                     </div>
                   )}
                 </div>
               </div>
             </div>
           ) : (
             <div className={`p-4 rounded border ${
                darkMode ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-sm mb-3 ${darkMode ? 'text-red-200' : 'text-red-700'}`}>
                  ❌ Analysis failed: {performanceResults.error}
                </p>
                {performanceResults.retryable && (
                  <button
                    onClick={() => handlePerformanceAnalysis(true)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      darkMode 
                        ? 'bg-red-800 hover:bg-red-700 text-red-200' 
                        : 'bg-red-200 hover:bg-red-300 text-red-800'
                    }`}
                  >
                    Try Again (Force Fresh)
                  </button>
                )}
              </div>
           )}
         </div>
       </div>
     )}
   </div>
  );
};

export default AnalysisTab;