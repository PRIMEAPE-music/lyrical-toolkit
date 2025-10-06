import { useState } from 'react';
import DOMPurify from 'dompurify';

export const useFileUpload = (songs, setSongs) => {
  const [isDragging, setIsDragging] = useState(false);

  // File upload handler
  const handleFileUpload = async (files) => {
    const existingFilenames = new Set(songs.map(song => song.filename));
    const availableSlots = 50 - songs.length;
    if (availableSlots <= 0) return;

    const selectedFiles = [];

    for (const file of files) {
      if (selectedFiles.length >= availableSlots) break;

      const sanitizedName = DOMPurify.sanitize(file.name);
      if (existingFilenames.has(sanitizedName)) continue;

      selectedFiles.push({ file, sanitizedName });
      existingFilenames.add(sanitizedName);
    }

    const newSongs = [];

    for (const { file, sanitizedName } of selectedFiles) {
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        try {
          const content = await file.text();
          const songTitle = file.name.replace('.txt', '').replace(/[-_]/g, ' ');

          const song = {
            id: Date.now() + Math.random(),
            title: DOMPurify.sanitize(songTitle),
            lyrics: DOMPurify.sanitize(content),
            content: DOMPurify.sanitize(content), // Add content field for backend
            wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
            dateAdded: new Date().toISOString(),
            filename: sanitizedName
          };

          newSongs.push(song);
        } catch (error) {
          console.error(`Error reading file ${file.name}:`, error);
        }
      }
    }

    if (newSongs.length > 0) {
      setSongs(prev => [...prev, ...newSongs]);
      // Return the new songs so caller can save if needed
      return newSongs;
    }
    
    return [];
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
    handleDrop
  };
};
