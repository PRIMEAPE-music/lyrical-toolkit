import { getAccessToken, refreshTokens, getAuthHeader } from '../services/authService';

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
    // Transform songs to match new Blobs API format
    const transformedSongs = userSongs.map(song => ({
      id: song.id,
      title: song.title,
      content: song.lyrics || song.content,
      filename: song.filename || `${song.title}.txt`,
      dateAdded: song.dateAdded || new Date().toISOString()
    }));
    
    await authFetch(API_URL, {
      method: 'PUT',
      body: JSON.stringify({ songs: transformedSongs })
    });
  } catch (error) {
    console.error('Error saving songs to server:', error);
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
      title: 'HUMAN (Example Song)',
      lyrics: content,
      content: content,
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

// Load user songs from the server
export const loadUserSongs = async () => {
  try {
    const response = await authFetch(API_URL);
    if (response.ok) {
      const data = await response.json();
      // Handle Supabase API response format
      if (data.songs && Array.isArray(data.songs)) {
        const songs = data.songs
          .filter(song => song && song.id && song.title)
          .map(song => ({
            id: song.id,
            title: song.title,
            lyrics: song.content || song.lyrics,
            content: song.content || song.lyrics,
            filename: song.filename,
            wordCount: song.wordCount,
            lineCount: song.lineCount,
            dateAdded: song.dateAdded,
            dateModified: song.dateModified,
            userId: song.userId
          }));
        
        // If user has no songs, include the example song
        if (songs.length === 0) {
          const exampleSong = await loadExampleSong();
          if (exampleSong) {
            return [exampleSong];
          }
        }
        
        return songs;
      }
    }
  } catch (error) {
    console.error('Error loading songs from server:', error);
    // If there's an auth error or service unavailable, try to show example
    if (error.message.includes('token') || error.message.includes('Service temporarily unavailable')) {
      const exampleSong = await loadExampleSong();
      if (exampleSong) {
        return [exampleSong];
      }
    }
  }
  return [];
};

// Clear all user songs from the server
export const clearUserSongs = async () => {
  try {
    await authFetch(API_URL, { method: 'DELETE' });
  } catch (error) {
    console.error('Error clearing songs from server:', error);
  }
};

