import { refreshTokens, getAuthHeader } from '../services/authService';

const API_URL = process.env.NODE_ENV === 'production' 
  ? '/.netlify/functions/songs' 
  : 'http://localhost:8888/.netlify/functions/songs';

const authFetch = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    try {
      await refreshTokens();
      return fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
          ...(options.headers || {})
        }
      });
    } catch (err) {
      console.error('Authentication failed:', err);
      throw err;
    }
  }

  return response;
};

// Save user songs to the server (excluding example songs)
export const saveUserSongs = async (songs) => {
  try {
    const userSongs = songs.filter(song => !song.isExample);
    // Transform songs with proper field mapping
    const transformedSongs = userSongs.map(song => {
      const songContent = song.lyrics || song.content || '';
      const songTitle = song.title || 'Untitled Song';
      
      return {
        id: song.id ? String(song.id) : undefined, // Convert ID to string for backend compatibility
        title: songTitle,
        content: songContent,    // Backend saves to content field
        lyrics: songContent,     // Include for compatibility
        filename: song.filename || `${songTitle}.txt`,
        dateAdded: song.dateAdded || new Date().toISOString(),
        // Audio metadata
        audioFileUrl: song.audioFileUrl || null,
        audioFileName: song.audioFileName || null,
        audioFileSize: song.audioFileSize || null,
        audioDuration: song.audioDuration || null
      };
    });
    
    console.log('Saving songs to server:', transformedSongs.length, 'songs');
    
    await authFetch(API_URL, {
      method: 'PUT',
      body: JSON.stringify({ songs: transformedSongs })
    });
  } catch (error) {
    console.error('Error saving songs to server:', error);
    throw error; // Re-throw to handle in calling code
  }
};

// Save example song deletion state (local storage)
export const saveExampleSongDeleted = (deleted) => {
  try {
    localStorage.setItem('lyricsExampleDeleted', JSON.stringify(deleted));
  } catch (error) {
    console.error('Error saving example deletion state:', error);
  }
};

// Load example song deletion state (local storage)
export const loadExampleSongDeleted = () => {
  try {
    const stored = localStorage.getItem('lyricsExampleDeleted');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading example deletion state:', error);
  }
  return false;
};

// Load example song for users with no songs
export const loadExampleSong = async () => {
  try {
    const response = await fetch('/HUMAN.txt');
    if (!response.ok) {
      throw new Error('Failed to load example song');
    }
    const content = await response.text();
    
    return {
      id: 'example-human',
      title: 'HUMAN',
      lyrics: content,          // Frontend expects lyrics field
      content: content,         // Backend uses content field
      filename: 'HUMAN.txt',
      wordCount: content.split(/\s+/).filter(word => word.trim()).length,
      lineCount: content.split('\n').filter(line => line.trim()).length,
      dateAdded: new Date().toISOString(),
      isExample: true
    };
  } catch (error) {
    console.error('Failed to load example song:', error);
    return null;
  }
};

// Check if user should see example song
const shouldShowExampleSong = (userSongsCount = 0) => {
  const isDeleted = loadExampleSongDeleted();
  
  // If user has no songs, always show example regardless of deletion state
  // (deletion only matters when user has uploaded their own songs)
  if (userSongsCount === 0) {
    return true;
  }
  
  // If user has songs, respect their deletion preference
  return !isDeleted;
};

// Load user songs from the server
export const loadUserSongs = async (includeExample = true) => {
  let userSongs = [];
  
  try {
    const response = await authFetch(API_URL);
    if (response.ok) {
      const data = await response.json();
      // Handle Supabase API response format
      if (data.songs && Array.isArray(data.songs)) {
        userSongs = data.songs
          .filter(song => song && song.id && song.title)
          .map(song => {
            // Ensure both lyrics and content fields are always present
            const songContent = song.content || song.lyrics || '';
            
            return {
              id: song.id,
              title: song.title || 'Untitled Song',
              lyrics: songContent,     // Frontend expects lyrics field
              content: songContent,    // Backend uses content field
              filename: song.filename || `${song.title || 'Untitled Song'}.txt`,
              wordCount: song.wordCount || song.word_count || 0,
              lineCount: song.lineCount || song.line_count || 0,
              dateAdded: song.dateAdded || song.date_added || new Date().toISOString(),
              dateModified: song.dateModified || song.date_modified,
              userId: song.userId || song.user_id,
              // Audio metadata
              audioFileUrl: song.audioFileUrl || null,
              audioFileName: song.audioFileName || null,
              audioFileSize: song.audioFileSize || null,
              audioDuration: song.audioDuration || null
            };
          });
      }
    }
  } catch (error) {
    console.error('Error loading songs from server:', error);
    // On auth errors, don't return early - fall through to example logic
  }
  
  
  // If user has their own songs, return them without example
  if (userSongs.length > 0) {
    return userSongs;
  }
  
  // If no user songs and example is requested, check if we should show example
  if (includeExample && shouldShowExampleSong(userSongs.length)) {
    const exampleSong = await loadExampleSong();
    if (exampleSong) {
      return [exampleSong];
    }
  }
  
  return [];
};

// Load songs for unauthenticated users (example song only)
export const loadSongsForUnauthenticated = async () => {
  // For unauthenticated users, always show example song
  const exampleSong = await loadExampleSong();
  return exampleSong ? [exampleSong] : [];
};

// Universal song loading function that handles both authenticated and unauthenticated states
export const loadAllSongs = async (isAuthenticated = false) => {
  if (!isAuthenticated) {
    // For unauthenticated users, always show example
    return await loadSongsForUnauthenticated();
  }
  
  // For authenticated users, load their songs with example fallback
  return await loadUserSongs(true);
};

// Clear all user songs from the server
export const clearUserSongs = async () => {
  try {
    await authFetch(API_URL, { method: 'DELETE' });
  } catch (error) {
    console.error('Error clearing songs from server:', error);
  }
};

