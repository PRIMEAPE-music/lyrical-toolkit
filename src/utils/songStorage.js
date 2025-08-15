import { getAccessToken, refreshTokens, getAuthHeader } from '../services/authService';

const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api/songs' 
  : 'http://localhost:3001/api/songs';

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

// Load user songs from the server
export const loadUserSongs = async () => {
  try {
    const response = await authFetch(API_URL);
    if (response.ok) {
      const data = await response.json();
      // Handle new Blobs API response format
      if (data.songs && Array.isArray(data.songs)) {
        return data.songs.filter(song => song && song.id && song.title);
      }
      // Fallback for old format
      if (Array.isArray(data)) {
        return data.filter(song => song && song.id && song.title && song.lyrics);
      }
    }
  } catch (error) {
    console.error('Error loading songs from server:', error);
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

