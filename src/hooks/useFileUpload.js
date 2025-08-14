import { useState } from 'react';
import DOMPurify from 'dompurify';

export const useFileUpload = (songs, setSongs) => {
  const [isDragging, setIsDragging] = useState(false);

  // File upload handler supporting lyrics and audio files
  const handleFileUpload = async (files) => {
    const availableSlots = 50 - songs.length;
    if (availableSlots <= 0) return;

    // Group files by base filename (without extension)
    const fileGroups = new Map();
    files.forEach((file) => {
      const sanitizedName = DOMPurify.sanitize(file.name);
      const baseName = sanitizedName.replace(/\.[^/.]+$/, '');
      const group = fileGroups.get(baseName) || {};

      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        group.textFile = file;
        group.textName = sanitizedName;
      } else if (file.type.startsWith('audio/')) {
        group.audioFile = file;
      }

      fileGroups.set(baseName, group);
    });

    const existingBaseNames = new Set(
      songs.map((song) => song.filename?.replace(/\.[^/.]+$/, ''))
    );

    const newSongs = [];
    let hasUpdates = false;

    // Attach audio to existing songs
    const songsWithUpdates = songs.map((song) => {
      const baseName = song.filename?.replace(/\.[^/.]+$/, '');
      const group = fileGroups.get(baseName);

      if (group && group.audioFile) {
        hasUpdates = true;
        return {
          ...song,
          audioUrl: URL.createObjectURL(group.audioFile),
          audioFilename: DOMPurify.sanitize(group.audioFile.name),
        };
      }

      return song;
    });

    // Create new songs from provided files
    for (const [baseName, group] of fileGroups.entries()) {
      if (existingBaseNames.has(baseName)) continue;
      if (newSongs.length >= availableSlots) break;
      if (!group.textFile) continue; // Require lyrics to create a song

      try {
        const content = await group.textFile.text();
        const songTitle = group.textFile.name
          .replace('.txt', '')
          .replace(/[-_]/g, ' ');

        const song = {
          id: Date.now() + Math.random(),
          title: DOMPurify.sanitize(songTitle),
          lyrics: DOMPurify.sanitize(content),
          wordCount: content.split(/\s+/).filter((word) => word.length > 0).length,
          dateAdded: new Date().toISOString(),
          filename: group.textName,
        };

        if (group.audioFile) {
          song.audioUrl = URL.createObjectURL(group.audioFile);
          song.audioFilename = DOMPurify.sanitize(group.audioFile.name);
        }

        newSongs.push(song);
      } catch (error) {
        console.error(`Error reading file ${group.textFile.name}:`, error);
      }
    }

    if (newSongs.length > 0 || hasUpdates) {
      setSongs([...songsWithUpdates, ...newSongs]);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  return {
    isDragging,
    handleFileUpload,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};
