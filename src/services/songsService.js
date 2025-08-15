// Songs service for interacting with Netlify Blobs storage
import { getAuthHeader } from './authService';

// Use different API endpoints based on environment
const SONGS_API = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }
  return response.json();
};

// Get all songs for the authenticated user
export const getSongs = async () => {
  const response = await fetch(`${SONGS_API}/songs`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    }
  });

  return handleResponse(response);
};

// Save/update multiple songs (bulk operation)
export const saveSongs = async (songs) => {
  const response = await fetch(`${SONGS_API}/songs`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ songs })
  });

  return handleResponse(response);
};

// Clear all songs for the authenticated user
export const clearAllSongs = async () => {
  const response = await fetch(`${SONGS_API}/songs`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    }
  });

  return handleResponse(response);
};

// Get a specific song by ID (includes content)
export const getSong = async (songId) => {
  const response = await fetch(`${SONGS_API}/song-content/${songId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    }
  });

  return handleResponse(response);
};

// Create a new song with specific ID
export const createSong = async (songId, songData) => {
  const response = await fetch(`${SONGS_API}/song-content/${songId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(songData)
  });

  return handleResponse(response);
};

// Update a specific song
export const updateSong = async (songId, songData) => {
  const response = await fetch(`${SONGS_API}/song-content/${songId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(songData)
  });

  return handleResponse(response);
};

// Delete a specific song
export const deleteSong = async (songId) => {
  const response = await fetch(`${SONGS_API}/song-content/${songId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    }
  });

  return handleResponse(response);
};

// Upload a single song file
export const uploadSong = async (file, title = null) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        const filename = file.name;
        const songTitle = title || filename.replace(/\.(txt|lyrics)$/i, '');
        
        // Generate a unique song ID
        const songId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        
        const songData = {
          title: songTitle,
          content: content,
          filename: filename
        };
        
        const result = await createSong(songId, songData);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

// Upload multiple song files
export const uploadSongs = async (files) => {
  const uploadPromises = Array.from(files).map(file => uploadSong(file));
  const results = await Promise.allSettled(uploadPromises);
  
  const successful = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);
    
  const failed = results
    .filter(result => result.status === 'rejected')
    .map(result => result.reason.message);
  
  return {
    successful,
    failed,
    totalCount: files.length,
    successCount: successful.length,
    failureCount: failed.length
  };
};

// Export song content as text file
export const exportSong = async (songId, filename = null) => {
  try {
    const songData = await getSong(songId);
    const content = songData.content;
    const exportFilename = filename || songData.filename || `${songData.title}.txt`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return { success: true, filename: exportFilename };
  } catch (error) {
    throw new Error(`Failed to export song: ${error.message}`);
  }
};

// Search songs by content or title
export const searchSongs = async (query) => {
  try {
    const { songs } = await getSongs();
    
    if (!query.trim()) {
      return songs;
    }
    
    const searchTerm = query.toLowerCase();
    const filteredSongs = [];
    
    // Search through metadata first (faster)
    for (const song of songs) {
      if (song.title.toLowerCase().includes(searchTerm)) {
        filteredSongs.push(song);
        continue;
      }
      
      // For content search, we'd need to fetch the actual content
      // This is more expensive, so only do it if title search fails
      try {
        const fullSong = await getSong(song.id);
        if (fullSong.content.toLowerCase().includes(searchTerm)) {
          filteredSongs.push(song);
        }
      } catch (error) {
        console.warn(`Failed to search content of song ${song.id}:`, error);
      }
    }
    
    return filteredSongs;
  } catch (error) {
    throw new Error(`Search failed: ${error.message}`);
  }
};

const songsService = {
  getSongs,
  saveSongs,
  clearAllSongs,
  getSong,
  createSong,
  updateSong,
  deleteSong,
  uploadSong,
  uploadSongs,
  exportSong,
  searchSongs
};

export default songsService;