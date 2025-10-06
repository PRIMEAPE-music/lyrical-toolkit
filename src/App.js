import React, { useState, useEffect, useMemo } from 'react';
import { Search, Book, Shuffle, Music } from 'lucide-react';
import DOMPurify from 'dompurify';
import jsPDF from 'jspdf';

// Import utilities
import { 
  countSyllables, 
  calculateReadingLevel, 
  calculateVocabularyComplexity
} from './utils/textAnalysis';
import { analyzeRhymeStatistics } from './utils/phoneticUtils';
import { songVocabularyPhoneticMap } from './data/songVocabularyPhoneticMap';
import { saveUserSongs, clearUserSongs, saveExampleSongDeleted, loadAllSongs } from './utils/songStorage';
import audioStorageService from './services/audioStorageService';
import { deleteSong as deleteSongFromServer } from './services/songsService';
import * as authService from './services/authService';
// Import hooks
import { useSearchHistory, useDarkMode, useHighlightWord } from './hooks/useLocalStorage';
import { useFileUpload } from './hooks/useFileUpload';
import { useSearch } from './hooks/useSearch';
import { useNotepad } from './hooks/useNotepad';
import { AuthProvider, useAuth } from './hooks/useAuth';

// Import components
import Header from './components/Header/Header';
import Manual from './components/Shared/Manual';
import MusicBanner from './components/Shared/MusicBanner';
import SongModal from './components/Shared/SongModal';
import SearchTab from './components/Tabs/SearchTab';
import DictionaryTab from './components/Tabs/DictionaryTab';
import SynonymsTab from './components/Tabs/SynonymsTab';
import RhymesTab from './components/Tabs/RhymesTab';
import AnalysisTab from './components/Tabs/AnalysisTab';
import UploadTab from './components/Tabs/UploadTab';
import StatsTab from './components/Tabs/StatsTab';
import FloatingNotepad from './components/Notepad/FloatingNotepad';
import AuthModal from './components/AuthModal';

/* eslint-disable react-hooks/exhaustive-deps */

const LyricsSearchAppContent = () => {
  const { user, isAuthenticated, logout } = useAuth();
  
  // Basic state
  const [songs, setSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedSong, setSelectedSong] = useState(null);
  
  // Audio-related state
  const [selectedSongForAudio, setSelectedSongForAudio] = useState(null);
  
  // Use custom hooks for localStorage
  const [searchHistory, setSearchHistory] = useSearchHistory();
  const [darkMode, setDarkMode] = useDarkMode();
  const [highlightWord, setHighlightWord] = useHighlightWord();
  
  // Dictionary API states
  const [definitionQuery, setDefinitionQuery] = useState('');
  const [definitionResults, setDefinitionResults] = useState(null);
  const [definitionLoading, setDefinitionLoading] = useState(false);
  
  // Synonyms API states
  const [synonymQuery, setSynonymQuery] = useState('');
  const [synonymResults, setSynonymResults] = useState(null);
  const [synonymLoading, setSynonymLoading] = useState(false);
  
  // Rhymes API states
  const [rhymeQuery, setRhymeQuery] = useState('');
  const [rhymeResults, setRhymeResults] = useState(null);
  const [rhymeLoading, setRhymeLoading] = useState(false);

  // Analysis states
  const [analysisResults, setAnalysisResults] = useState(null);
  const [analysisType, setAnalysisType] = useState(null);
  const [selectedSongForAnalysis, setSelectedSongForAnalysis] = useState(null);

  // Manual states
  const [showManual, setShowManual] = useState(false);
  // Stats filter
  const [selectedStatsFilter, setSelectedStatsFilter] = useState('all');

  // Helper function to save and reload songs
  const saveAndReloadSongs = async (songsToSave = null) => {
    if (!isAuthenticated) return;
    
    try {
      const actualSongs = songsToSave || songs;
      console.log('💾 Saving', actualSongs.length, 'songs to server...');
      await saveUserSongs(actualSongs);
      console.log('✅ Songs saved, reloading...');
      
      // Reload from server to get UUIDs
      const allSongs = await loadAllSongs(isAuthenticated);
      setSongs(allSongs);
      console.log('✅ Reloaded', allSongs.length, 'songs with server IDs');
    } catch (error) {
      console.error('❌ Failed to save/reload songs:', error);
    }
  };

  // File upload hook - don't pass callback, we'll handle it differently
  const fileUploadHook = useFileUpload(songs, setSongs);  
  // Search hook
  const { searchResults } = useSearch(songs, searchQuery, highlightWord);

  //Notepad hook
  const notepadState = useNotepad();
  const [originalSongContent, setOriginalSongContent] = useState('');

  // Calculate if there are unsaved changes - moved to top to avoid initialization issues
  const hasUnsavedChanges = notepadState.currentEditingSongId && 
    originalSongContent !== '' &&
    (notepadState.content !== originalSongContent);

  // Load example song only when needed
  const [userSongsLoaded, setUserSongsLoaded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    setSongs([]);
    setUserSongsLoaded(false);
    setShowAuthModal(false);
  };
  
  // Load songs when authentication state changes or on initial load
  useEffect(() => {
    const loadSongs = async () => {
      try {
        console.log('🔄 Loading songs, authenticated:', isAuthenticated);
        const allSongs = await loadAllSongs(isAuthenticated);
        setSongs(allSongs);
        console.log('✅ Loaded', allSongs.length, 'songs');
      } catch (error) {
        console.error('Failed to load songs:', error);
      }
    };

    loadSongs();
  }, [isAuthenticated]); // Reload whenever auth state changes

  // Reset stats filter when songs change
  useEffect(() => {
    if (songs.length === 0) {
      setSelectedStatsFilter('all');
    } else if (selectedStatsFilter !== 'all') {
      const selectedSongExists = songs.some(song => song.id.toString() === selectedStatsFilter);
      if (!selectedSongExists) {
        setSelectedStatsFilter('all');
      }
    }
  }, [songs, selectedStatsFilter]);

  // Track if we need to reload after save
  const [needsReload, setNeedsReload] = useState(false);

  // Save songs to server when they change (authenticated users only)
  useEffect(() => {
    if (!isAuthenticated || songs.length === 0) return;
    
    const timeoutId = setTimeout(async () => {
      try {
        console.log('💾 Auto-saving songs...');
        await saveUserSongs(songs);
        console.log('✅ Auto-save complete');
        setNeedsReload(true); // Mark that we need to reload
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      }
    }, 2000); // 2 second debounce
    
    return () => clearTimeout(timeoutId);
  }, [songs, isAuthenticated]);

  // Reload once after save to get UUIDs
  useEffect(() => {
    if (!needsReload || !isAuthenticated) return;
    
    const reloadSongs = async () => {
      try {
        console.log('🔄 Reloading songs to sync IDs...');
        const allSongs = await loadAllSongs(isAuthenticated);
        setSongs(allSongs);
        setNeedsReload(false); // Reset flag
      } catch (error) {
        console.error('❌ Reload failed:', error);
      }
    };
    
    // Small delay to ensure save completed
    const timeoutId = setTimeout(reloadSongs, 500);
    return () => clearTimeout(timeoutId);
  }, [needsReload, isAuthenticated]);

  // Debug token expiration issues
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const checkTokenHealth = () => {
      const token = authService.getAccessToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const now = Date.now() / 1000;
          const timeUntilExpiry = payload.exp - now;
          
          if (timeUntilExpiry < 300) { // Less than 5 minutes
            console.log(`⚠️ Token expires in ${Math.floor(timeUntilExpiry)} seconds`);
          }
        } catch (error) {
          console.error('Failed to parse token:', error);
        }
      }
    };
    
    // Check token health every minute
    const interval = setInterval(checkTokenHealth, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Enhanced statistics with song filtering
  const stats = useMemo(() => {
    const filteredSongs = selectedStatsFilter === 'all' 
      ? songs 
      : songs.filter(song => song.id.toString() === selectedStatsFilter);
    
    if (filteredSongs.length === 0) {
      return {
        totalSongs: 0,
        totalWords: 0,
        uniqueWords: 0,
        mostUsedWords: [],
        syllableDistribution: {},
        wordLengthDistribution: {},
        averageWordsPerSong: 0,
        averageLinesPerSong: 0,
        averageWordLength: 0,
        averageSyllablesPerWord: 0,
        totalLines: 0,
        readingLevel: 0,
        vocabularyComplexity: 0,
        rhymeStats: {
          totalRhymableWords: 0,
          perfectRhymes: 0,
          nearRhymes: 0,
          soundsLike: 0,
          internalRhymes: 0,
          rhymeDensity: 0,
          allRhymeGroups: []
        }
      };
    }

    // Calculate basic metrics first
    const totalWords = filteredSongs.reduce((sum, song) => sum + song.wordCount, 0);
    const allWords = filteredSongs.flatMap(song => 
      song.lyrics.toLowerCase().split(/\s+/).filter(word => word.match(/[a-zA-Z]/))
    );
    
    const wordFreq = {};
    const syllableCount = {};
    const wordLengthCount = {};
    let totalSyllables = 0;
    let totalCharacters = 0;
    let validWordCount = 0;

    allWords.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 0) {
        validWordCount++;
        totalCharacters += cleanWord.length;
        
        if (cleanWord.length > 2) {
          wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
        }
        
        const syllables = countSyllables(cleanWord);
        totalSyllables += syllables;
        const syllableKey = syllables > 4 ? '5+' : syllables.toString();
        syllableCount[syllableKey] = (syllableCount[syllableKey] || 0) + 1;
        
        const lengthKey = cleanWord.length > 10 ? '11+' : cleanWord.length.toString();
        wordLengthCount[lengthKey] = (wordLengthCount[lengthKey] || 0) + 1;
      }
    });

    const mostUsedWords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const allLines = filteredSongs.flatMap(song => 
      song.lyrics.split('\n').filter(line => line.trim().length > 0)
    );
    const totalLines = allLines.length;

    const avgReadingLevel = filteredSongs.length > 0 ? 
      filteredSongs.reduce((sum, song) => sum + calculateReadingLevel(song.lyrics), 0) / filteredSongs.length : 0;
    
    const avgVocabularyComplexity = filteredSongs.length > 0 ? 
      filteredSongs.reduce((sum, song) => sum + calculateVocabularyComplexity(song.lyrics, wordFreq), 0) / filteredSongs.length : 0;
    
    // Calculate rhyme statistics
    const combinedRhymeStats = filteredSongs.length > 0 ? 
      filteredSongs.reduce((acc, song) => {
        const songRhymes = analyzeRhymeStatistics(song.lyrics, songVocabularyPhoneticMap);
        return {
          totalRhymableWords: acc.totalRhymableWords + songRhymes.totalRhymableWords,
          perfectRhymes: acc.perfectRhymes + songRhymes.perfectRhymes,
          nearRhymes: acc.nearRhymes + songRhymes.nearRhymes,
          soundsLike: acc.soundsLike + songRhymes.soundsLike,
          internalRhymes: acc.internalRhymes + songRhymes.internalRhymes,
          rhymeDensity: acc.rhymeDensity + songRhymes.rhymeDensity,
          allRhymeGroups: [...acc.allRhymeGroups, ...songRhymes.rhymeGroups]
        };
      }, {
        totalRhymableWords: 0,
        perfectRhymes: 0,
        nearRhymes: 0,
        soundsLike: 0,
        internalRhymes: 0,
        rhymeDensity: 0,
        allRhymeGroups: []
      }) : {
        totalRhymableWords: 0,
        perfectRhymes: 0,
        nearRhymes: 0,
        soundsLike: 0,
        internalRhymes: 0,
        rhymeDensity: 0,
        allRhymeGroups: []
      };

    if (filteredSongs.length > 1) {
      combinedRhymeStats.rhymeDensity = combinedRhymeStats.rhymeDensity / filteredSongs.length;
    }

    return {
      totalSongs: filteredSongs.length,
      totalWords,
      uniqueWords: Object.keys(wordFreq).length,
      mostUsedWords,
      syllableDistribution: syllableCount,
      wordLengthDistribution: wordLengthCount,
      averageWordsPerSong: filteredSongs.length > 0 ? Math.round(totalWords / filteredSongs.length) : 0,
      averageLinesPerSong: filteredSongs.length > 0 ? Math.round(totalLines / filteredSongs.length) : 0,
      averageWordLength: validWordCount > 0 ? (totalCharacters / validWordCount).toFixed(1) : 0,
      averageSyllablesPerWord: validWordCount > 0 ? (totalSyllables / validWordCount).toFixed(1) : 0,
      totalLines,
      readingLevel: avgReadingLevel,
      vocabularyComplexity: avgVocabularyComplexity,
      rhymeStats: combinedRhymeStats
    };
  }, [songs, selectedStatsFilter]);

  // Add to search history
  const addToSearchHistory = (query) => {
    if (query.trim() && !searchHistory.includes(query)) {
      const newHistory = [query, ...searchHistory.slice(0, 9)];
      setSearchHistory(newHistory);
    }
  };

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      addToSearchHistory(query);
      setHighlightWord(query);
    }
  };

  // Delete individual song
  const deleteSong = async (songId) => {
    // Add confirmation dialog
    const confirmDelete = window.confirm('Are you sure you want to delete this song? This cannot be undone.');
    if (!confirmDelete) return;

    // Store original songs for rollback if needed
    const originalSongs = [...songs];
    
    try {
      // Optimistically remove from UI first
      const songToDelete = songs.find(song => song.id === songId);
      if (songToDelete && songToDelete.isExample) {
        saveExampleSongDeleted(true);
      }
      
      setSongs(prev => prev.filter(song => song.id !== songId));

      // If user is authenticated, delete from server too
      if (isAuthenticated) {
        console.log('🗑️ Deleting song from server with ID:', songId);
        await deleteSongFromServer(songId);
        console.log('✅ Song deleted from server');
      }
    } catch (error) {
      console.error('❌ Error deleting song:', error);
      
      // Show specific error message
      const errorMessage = error.message || 'Unknown error occurred';
      alert(`Failed to delete song: ${errorMessage}\n\nThe song has been restored.`);
      
      // Rollback - restore the song
      setSongs(originalSongs);
      
      // Optionally reload from server to ensure sync
      if (isAuthenticated) {
        try {
          const allSongs = await loadAllSongs(isAuthenticated);
          setSongs(allSongs);
        } catch (reloadError) {
          console.error('Failed to reload songs after delete error:', reloadError);
        }
      }
    }
  };

  // Delete all songs
  const deleteAllSongs = () => {
    if (window.confirm('Are you sure you want to delete ALL songs? This cannot be undone.')) {
      setSongs([]);
      setSearchQuery('');
      setHighlightWord('');
      setSearchHistory([]);
      clearUserSongs(); // Clear from localStorage as well
      saveExampleSongDeleted(false); // Reset so example can load again
    }
  };

  // Dictionary API functions
  const searchDefinition = async (word) => {
    if (!word.trim()) return;
    
    setDefinitionLoading(true);
    setHighlightWord(word);
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
      if (response.ok) {
        const data = await response.json();
        setDefinitionResults(data);
      } else {
        setDefinitionResults([]);
      }
    } catch (error) {
      console.error('Definition API error:', error);
      setDefinitionResults([]);
    }
    setDefinitionLoading(false);
  };

  // Enhanced DataMuse API for synonyms with multiple antonym sources
  const searchSynonyms = async (word) => {
    if (!word.trim()) return;
    
    setSynonymLoading(true);
    setHighlightWord(word);
    try {
      const [synonymsResponse, antonymsResponse, relatedResponse] = await Promise.all([
        fetch(`https://api.datamuse.com/words?rel_syn=${word.toLowerCase()}&max=20`),
        fetch(`https://api.datamuse.com/words?rel_ant=${word.toLowerCase()}&max=20`),
        fetch(`https://api.datamuse.com/words?ml=${word.toLowerCase()}&max=30`)
      ]);
      
      const synonyms = synonymsResponse.ok ? await synonymsResponse.json() : [];
      let antonyms = antonymsResponse.ok ? await antonymsResponse.json() : [];
      const related = relatedResponse.ok ? await relatedResponse.json() : [];
      
      if (antonyms.length < 5) {
        const antonymPatterns = ['un', 'non', 'dis', 'in', 'im', 'ir', 'anti'];
        const moreAntonyms = related.filter(relatedWord => {
          const wordLower = relatedWord.word.toLowerCase();
          const searchLower = word.toLowerCase();
          
          return antonymPatterns.some(prefix => 
            wordLower.startsWith(prefix + searchLower) || 
            searchLower.startsWith(prefix + wordLower)
          );
        });
        
        const allAntonyms = [...antonyms, ...moreAntonyms];
        antonyms = allAntonyms.filter((item, index, self) => 
          index === self.findIndex(t => t.word === item.word)
        ).slice(0, 15);
      }
      
      setSynonymResults({ synonyms, antonyms });
    } catch (error) {
      console.error('Synonyms API error:', error);
      setSynonymResults({ synonyms: [], antonyms: [] });
    }
    setSynonymLoading(false);
  };

  // DataMuse API for rhymes
  const searchRhymes = async (word) => {
    if (!word.trim()) return;
    
    setRhymeLoading(true);
    setHighlightWord(word);
    try {
      const [perfectResponse, nearResponse, soundsLikeResponse] = await Promise.all([
        fetch(`https://api.datamuse.com/words?rel_rhy=${word.toLowerCase()}&max=30`),
        fetch(`https://api.datamuse.com/words?rel_nry=${word.toLowerCase()}&max=20`),
        fetch(`https://api.datamuse.com/words?sl=${word.toLowerCase()}&max=20`)
      ]);
      
      const perfect = perfectResponse.ok ? await perfectResponse.json() : [];
      const near = nearResponse.ok ? await nearResponse.json() : [];
      const soundsLike = soundsLikeResponse.ok ? await soundsLikeResponse.json() : [];
      
      setRhymeResults({ perfect, near, soundsLike });
    } catch (error) {
      console.error('Rhymes API error:', error);
      setRhymeResults({ perfect: [], near: [], soundsLike: [] });
    }
    setRhymeLoading(false);
  };

  // Enhanced search function with custom routing and auto-search
  const searchInLyrics = (word, targetTab = 'search') => {
    setSearchQuery(word);
    setHighlightWord(word);
    setActiveTab(targetTab);
    addToSearchHistory(word);
    
    if (targetTab === 'dictionary') {
      setDefinitionQuery(word);
      setTimeout(() => searchDefinition(word), 100);
    } else if (targetTab === 'synonyms') {
      setSynonymQuery(word);
      setTimeout(() => searchSynonyms(word), 100);
    } else if (targetTab === 'rhymes') {
      setRhymeQuery(word);
      setTimeout(() => searchRhymes(word), 100);
    }
  };

  // Add these new functions here
  const handleExportTxt = () => {
    if (!notepadState.content.trim()) return;
    
    const blob = new Blob([notepadState.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${notepadState.title || 'Untitled'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadToSongs = async () => {
    if (!notepadState.content.trim()) return;

    // Should only create new song when NOT editing
    if (notepadState.currentEditingSongId) {
      console.error('handleUploadToSongs called while editing - this should not happen');
      return;
    }

    const sanitizedTitle = DOMPurify.sanitize(notepadState.title || 'Untitled');
    const sanitizedContent = DOMPurify.sanitize(notepadState.content);

    const newSong = {
      id: Date.now() + Math.random(),
      title: sanitizedTitle,
      lyrics: sanitizedContent,
      content: sanitizedContent, // Add content field for backend
      wordCount: sanitizedContent.split(/\s+/).filter(word => word.length > 0).length,
      dateAdded: new Date().toISOString(),
      filename: `${sanitizedTitle}.txt`,
      fromNotepad: true
    };
    
    setSongs(prev => [newSong, ...prev]);
    
    // Save and reload to get UUID from server
    if (isAuthenticated) {
      await saveAndReloadSongs();
    }
    
    // Optionally clear notepad after upload
    notepadState.updateContent('');
    notepadState.updateTitle('Untitled');
  };

  const handleSaveChanges = async () => {
    if (!notepadState.currentEditingSongId || !notepadState.content.trim()) return;
    
    try {
      const sanitizedTitle = DOMPurify.sanitize(notepadState.title);
      const sanitizedContent = DOMPurify.sanitize(notepadState.content);
      const originalSong = songs.find(song => song.id === notepadState.currentEditingSongId);

      // Update local state
      setSongs(prev => prev.map(song => {
        if (song.id === notepadState.currentEditingSongId) {
          const finalTitle = sanitizedTitle || song.title;
          return {
            ...song,
            title: finalTitle,
            lyrics: sanitizedContent,
            wordCount: sanitizedContent.split(/\s+/).filter(word => word.length > 0).length,
            dateModified: new Date().toISOString()
          };
        }
        return song;
      }));

      const finalTitle = sanitizedTitle || (originalSong ? originalSong.title : '');

      // Update notepad and original content with sanitized values
      notepadState.updateTitle(finalTitle);
      notepadState.updateContent(sanitizedContent);
      setOriginalSongContent(sanitizedContent);

      console.log('💾 Song saved successfully to local state');
      alert('Song saved successfully!');
    } catch (error) {
      console.error('❌ Failed to save changes:', error);
      alert(`Failed to save changes: ${error.message}`);
    }
  };

  const handleRevertChanges = () => {
    if (!notepadState.currentEditingSongId || !originalSongContent) return;
    
    const confirmRevert = window.confirm('Are you sure you want to revert to the original content? All changes will be lost.');
    if (!confirmRevert) return;
    
    notepadState.updateContent(originalSongContent);
    
    // Find original song title
    const originalSong = songs.find(song => song.id === notepadState.currentEditingSongId);
    if (originalSong) {
      notepadState.updateTitle(originalSong.title);
    }
  };

  const handleStartNewContent = () => {
    if (hasUnsavedChanges) {
      const confirmNew = window.confirm('You have unsaved changes. Reset Notepad?');
      if (!confirmNew) return;
    }
    
    notepadState.updateContent('');
    notepadState.updateTitle('Untitled');
    notepadState.setCurrentEditingSongId(null);
    setOriginalSongContent('');
  };

  const handleExportSongTxt = (song) => {
    const blob = new Blob([song.lyrics], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${song.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportSongPdf = async (song) => {
    try {
      const pdf = new jsPDF();
      
      // Add title
      pdf.setFontSize(16);
      pdf.text(song.title, 20, 20);
      
      // Add lyrics
      pdf.setFontSize(12);
      const splitText = pdf.splitTextToSize(song.lyrics, 170);
      pdf.text(splitText, 20, 40);
      
      pdf.save(`${song.title}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handleEditSong = (song) => {
    // Check if there are unsaved changes
    if (notepadState.currentEditingSongId && hasUnsavedChanges) {
      const confirmSwitch = window.confirm('You have unsaved changes. Switch to editing a different song?');
      if (!confirmSwitch) return;
    }
    
    // Load song into notepad
    notepadState.updateContent(song.lyrics);
    notepadState.updateTitle(song.title);
    notepadState.setCurrentEditingSongId(song.id);
    setOriginalSongContent(song.lyrics);
    
    // Expand notepad if minimized
    if (notepadState.isMinimized) {
      notepadState.toggleMinimized();
    }
    
    // Auto-expand to show all buttons on desktop
    const isMobile = window.innerWidth <= 768;
    if (!isMobile && notepadState.dimensions.width < 520) {
      notepadState.updateDimensions({
        width: 520,
        height: Math.max(notepadState.dimensions.height, 350)
      });
    }
  };

  // ====================================
  // AUDIO HANDLERS
  // ====================================

  const handleAudioUpload = async (songId, audioData) => {
    console.log('🎵 === AUDIO UPLOAD HANDLER START ===');
    console.log('📄 Song ID:', songId);
    console.log('📊 Audio data received:', audioData);
    
    try {
      // CRITICAL: Validate that the upload actually succeeded
      if (!audioData || !audioData.url) {
        throw new Error('Invalid audio data - no URL provided');
      }
      
      // Test if the uploaded file actually exists and is accessible
      console.log('🔍 Verifying uploaded file exists...');
      try {
        const testResponse = await fetch(audioData.url, { method: 'HEAD' });
        if (!testResponse.ok) {
          throw new Error(`Uploaded file not accessible: ${testResponse.status}`);
        }
        console.log('✅ File verified as accessible');
      } catch (error) {
        console.error('❌ File verification failed:', error);
        throw new Error(`Upload verification failed: ${error.message}`);
      }
      
      // Only update local state AFTER verifying the upload succeeded
      console.log('🔄 Updating local song state...');
      const updatedSongs = songs.map(song => {
        if (song.id === songId) {
          return {
            ...song,
            audioFileUrl: audioData.url,
            audioFileName: audioData.filename,
            audioFileSize: audioData.size,
            audioDuration: audioData.duration
          };
        }
        return song;
      });
      
      setSongs(updatedSongs);
      console.log('✅ Local state updated');
      
      // Save to backend database if authenticated
      if (isAuthenticated) {
        console.log('🔄 Saving to backend database...');
        try {
          await saveUserSongs(updatedSongs);
          console.log('✅ Successfully saved to database');
        } catch (dbError) {
          console.error('❌ Database save failed:', dbError);
          
          // Revert local state if database save fails
          console.log('🔄 Reverting local state due to database error...');
          setSongs(songs); // Revert to original songs
          
          throw new Error(`Failed to save to database: ${dbError.message}`);
        }
      } else {
        console.warn('⚠️ User not authenticated - audio metadata not saved to database');
      }
      
      // Clear selection only after everything succeeds
      setSelectedSongForAudio(null);
      
      console.log('🎉 === AUDIO UPLOAD COMPLETE ===');
      
      // Show success message
      alert(`Successfully uploaded and saved audio for "${songs.find(s => s.id === songId)?.title}"`);
      
    } catch (error) {
      console.error('❌ === AUDIO UPLOAD FAILED ===');
      console.error('Error details:', error);
      
      // Show user-friendly error message
      alert(`Failed to upload audio: ${error.message}\n\nPlease check:\n1. Your internet connection\n2. File size (max 50MB)\n3. File format (MP3, WAV, M4A)\n\nThen try again.`);
      
      // Don't update UI state if upload failed
      console.log('🚫 Not updating UI state due to upload failure');
      
      // Re-throw the error so calling code knows it failed
      throw error;
    }
  };

  const handleAudioDownload = async (song) => {
    console.log('🎵 === AUDIO DOWNLOAD START ===');
    console.log('📄 Song:', song.title);
    console.log('🔗 Audio URL:', song.audioFileUrl);
    console.log('📁 Audio filename:', song.audioFileName);
    
    try {
      if (!song.audioFileUrl) {
        console.error('❌ No audio URL found for song');
        alert('No audio file found for this song.');
        return;
      }
      
      const filePath = audioStorageService.extractFilePathFromUrl(song.audioFileUrl);
      console.log('📍 Extracted file path:', filePath);
      
      if (filePath) {
        console.log('🚀 Starting download...');
        await audioStorageService.downloadAudioFile(filePath, song.audioFileName);
        console.log('✅ Download completed');
      } else {
        console.error('❌ Could not extract file path from URL');
        alert('Could not determine file path for download.');
      }
    } catch (error) {
      console.error('❌ Error downloading audio:', error);
      alert(`Failed to download audio file: ${error.message}`);
    }
  };

  const handleAudioRemove = async (songId) => {
    console.log('🗑️ === AUDIO REMOVE START ===');
    console.log('📄 Song ID:', songId);
    
    try {
      const song = songs.find(s => s.id === songId);
      console.log('📄 Found song:', song?.title);
      console.log('🔗 Audio URL:', song?.audioFileUrl);
      
      if (!song || !song.audioFileUrl) {
        console.error('❌ No song or audio URL found');
        alert('No audio file found for this song.');
        return;
      }
      
      const confirmDelete = window.confirm('Are you sure you want to remove this audio file?');
      if (!confirmDelete) {
        console.log('❌ User cancelled removal');
        return;
      }
      
      // Delete from storage
      const filePath = audioStorageService.extractFilePathFromUrl(song.audioFileUrl);
      console.log('📍 Extracted file path:', filePath);
      
      if (filePath) {
        console.log('🚀 Starting deletion...');
        await audioStorageService.deleteAudioFile(filePath);
        console.log('✅ File deleted from storage');
      }
      
      // Update the song to remove audio metadata
      const updatedSongs = songs.map(s => {
        if (s.id === songId) {
          return {
            ...s,
            audioFileUrl: null,
            audioFileName: null,
            audioFileSize: null,
            audioDuration: null
          };
        }
        return s;
      });
      
      setSongs(updatedSongs);
      console.log('✅ Song metadata updated');
      
      // Save to localStorage/backend if authenticated
      if (isAuthenticated) {
        console.log('🔄 Saving to backend...');
        await saveUserSongs(updatedSongs);
        console.log('✅ Backend updated');
      }
      
      console.log('🎉 === AUDIO REMOVE COMPLETE ===');
    } catch (error) {
      console.error('❌ Error removing audio:', error);
      alert(`Failed to remove audio file: ${error.message}`);
    }
  };
  
  const themeClasses = darkMode 
    ? 'dark bg-gray-900 text-white' 
    : 'bg-gray-50 text-gray-900';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses}`}>
      {/* Music Banner */}
      <MusicBanner />

      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showManual={showManual}
        setShowManual={setShowManual}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogin={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        darkMode={darkMode}
      />

      {/* Universal Search Bar */}
      {!['upload', 'stats', 'analysis'].includes(activeTab) && !showManual && (
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="relative mobile-search">
            {activeTab === 'search' && <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-400'} w-5 h-5`} />}
            {activeTab === 'dictionary' && <Book className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-400'} w-5 h-5`} />}
            {activeTab === 'synonyms' && <Shuffle className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-400'} w-5 h-5`} />}
            {activeTab === 'rhymes' && <Music className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-400'} w-5 h-5`} />}
            
            <input
              type="text"
              placeholder={
                activeTab === 'search' ? 'Search lyrics... (use "quotes" for exact)' :
                activeTab === 'dictionary' ? "Enter a word to get its definition..." :
                activeTab === 'synonyms' ? "Find synonyms and antonyms..." :
                activeTab === 'rhymes' ? "Find words that rhyme..." : ""
              }
              value={
                activeTab === 'search' ? searchQuery :
                activeTab === 'dictionary' ? definitionQuery :
                activeTab === 'synonyms' ? synonymQuery :
                activeTab === 'rhymes' ? rhymeQuery : ""
              }
              onChange={(e) => {
                if (activeTab === 'search') handleSearch(e.target.value);
                else if (activeTab === 'dictionary') setDefinitionQuery(e.target.value);
                else if (activeTab === 'synonyms') setSynonymQuery(e.target.value);
                else if (activeTab === 'rhymes') setRhymeQuery(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (activeTab === 'dictionary') searchDefinition(definitionQuery);
                  else if (activeTab === 'synonyms') searchSynonyms(synonymQuery);
                  else if (activeTab === 'rhymes') searchRhymes(rhymeQuery);
                }
              }}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-colors ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>

          {/* Dynamic search button */}
          {activeTab !== 'search' && (
            <div className="flex justify-center mt-2">
              <button
                onClick={() => {
                  if (activeTab === 'dictionary') searchDefinition(definitionQuery);
                  else if (activeTab === 'synonyms') searchSynonyms(synonymQuery);
                  else if (activeTab === 'rhymes') searchRhymes(rhymeQuery);
                }}
                disabled={
                  (activeTab === 'dictionary' && definitionLoading) ||
                  (activeTab === 'synonyms' && synonymLoading) ||
                  (activeTab === 'rhymes' && rhymeLoading)
                }
                className={`px-6 py-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 disabled:bg-gray-800' 
                    : 'bg-gray-900 hover:bg-gray-800 text-white disabled:bg-gray-400'
                }`}
              >
                {(activeTab === 'dictionary' && definitionLoading) || 
                (activeTab === 'synonyms' && synonymLoading) || 
                (activeTab === 'rhymes' && rhymeLoading) ? '...' : 
                activeTab === 'dictionary' ? 'Define' :
                activeTab === 'synonyms' ? 'Search' :
                activeTab === 'rhymes' ? 'Find' : 'Search'}
              </button>
            </div>
          )}
        
          {/* Search History - only show for main search tab */}
          {activeTab === 'search' && searchHistory.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Recent:</span>
              {searchHistory.slice(0, 5).map((term, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(term)}
                  className={`text-sm px-3 py-1 rounded-full transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 mobile-content">
        {/* Manual Content */}
        <Manual 
          showManual={showManual}
          onClose={() => setShowManual(false)}
          darkMode={darkMode}
        />

        {/* Tab Content - Only show when manual is closed */}
        {!showManual && (
          <>
            {activeTab === 'search' && (
              <SearchTab 
                searchQuery={searchQuery}
                highlightWord={highlightWord}
                searchResults={searchResults}
                songs={songs}
                stats={stats}
                onSongSelect={setSelectedSong}
                darkMode={darkMode}
              />
            )}

            {activeTab === 'dictionary' && (
              <DictionaryTab 
                definitionResults={definitionResults}
                definitionLoading={definitionLoading}
                definitionQuery={definitionQuery}
                onSearchInLyrics={searchInLyrics}
                darkMode={darkMode}
              />
            )}

            {activeTab === 'synonyms' && (
              <SynonymsTab 
                synonymResults={synonymResults}
                synonymLoading={synonymLoading}
                synonymQuery={synonymQuery}
                onSearchInLyrics={searchInLyrics}
                darkMode={darkMode}
              />
            )}

            {activeTab === 'rhymes' && (
              <RhymesTab 
                rhymeResults={rhymeResults}
                rhymeLoading={rhymeLoading}
                rhymeQuery={rhymeQuery}
                onSearchInLyrics={searchInLyrics}
                darkMode={darkMode}
              />
            )}

            {activeTab === 'analysis' && (
              <AnalysisTab 
                songs={songs}
                selectedSongForAnalysis={selectedSongForAnalysis}
                setSelectedSongForAnalysis={setSelectedSongForAnalysis}
                analysisResults={analysisResults}
                setAnalysisResults={setAnalysisResults}
                analysisType={analysisType}
                setAnalysisType={setAnalysisType}
                onSearchInLyrics={searchInLyrics}
                stats={stats}
                darkMode={darkMode}
              />
            )}

            {activeTab === 'upload' && (
              <UploadTab 
                songs={songs}
                onFileUpload={fileUploadHook.handleFileUpload}
                onDeleteSong={deleteSong}
                onDeleteAllSongs={deleteAllSongs}
                onSongSelect={setSelectedSong}
                onEditSong={handleEditSong}
                onExportTxt={handleExportSongTxt}
                onExportPdf={handleExportSongPdf}
                isDragging={fileUploadHook.isDragging}
                handleDragOver={fileUploadHook.handleDragOver}
                handleDragLeave={fileUploadHook.handleDragLeave}
                handleDrop={fileUploadHook.handleDrop}
                darkMode={darkMode}
                // Audio-related props
                onAudioUpload={handleAudioUpload}
                onAudioDownload={handleAudioDownload}
                onAudioRemove={handleAudioRemove}
                onAudioReplace={(song) => setSelectedSongForAudio(song)}
                selectedSongForAudio={selectedSongForAudio}
                setSelectedSongForAudio={setSelectedSongForAudio}
                userId={user?.userId || 'anonymous'}
              />
            )}

            {activeTab === 'stats' && (
              <StatsTab 
                songs={songs}
                stats={stats}
                selectedStatsFilter={selectedStatsFilter}
                setSelectedStatsFilter={setSelectedStatsFilter}
                onSearchInLyrics={(word) => {
                  handleSearch(word);
                  setActiveTab('search');
                }}
                darkMode={darkMode}
              />
            )}
          </>
        )}
      </div>

      {/* Song Modal */}
      <SongModal 
        selectedSong={selectedSong}
        onClose={() => setSelectedSong(null)}
        highlightWord={highlightWord}
        darkMode={darkMode}
      />

      {/* Add the FloatingNotepad here */}
      <FloatingNotepad
        notepadState={notepadState}
        darkMode={darkMode}
        onExportTxt={handleExportTxt}
        onUploadToSongs={handleUploadToSongs}
        onSaveChanges={handleSaveChanges}
        onRevertChanges={handleRevertChanges}
        onStartNewContent={handleStartNewContent}
        hasUnsavedChanges={hasUnsavedChanges}
        originalSongContent={originalSongContent}
        // Audio-related props
        currentSongAudio={(() => {
          const currentSong = songs.find(s => s.id === notepadState.currentEditingSongId);
          return currentSong && currentSong.audioFileUrl ? {
            url: currentSong.audioFileUrl,
            filename: currentSong.audioFileName,
            size: currentSong.audioFileSize,
            duration: currentSong.audioDuration
          } : null;
        })()}
        onAudioDownload={() => {
          const currentSong = songs.find(s => s.id === notepadState.currentEditingSongId);
          if (currentSong) handleAudioDownload(currentSong);
        }}
        onAudioRemove={() => {
          if (notepadState.currentEditingSongId) handleAudioRemove(notepadState.currentEditingSongId);
        }}
        onAudioReplace={() => {
          const currentSong = songs.find(s => s.id === notepadState.currentEditingSongId);
          if (currentSong) setSelectedSongForAudio(currentSong);
        }}
      />
    </div>
  );
};

// Wrapper component with AuthProvider
const LyricsSearchApp = () => {
  return (
    <AuthProvider>
      <LyricsSearchAppContent />
    </AuthProvider>
  );
};

export default LyricsSearchApp;