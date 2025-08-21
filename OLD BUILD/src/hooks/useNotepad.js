import { useState, useEffect, useCallback, useRef } from 'react';

export const useNotepad = () => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Untitled');
  const [isMinimized, setIsMinimized] = useState(true);
  const [position, setPositionState] = useState({ bottom: 20, right: 20 });
  const [currentEditingSongId, setCurrentEditingSongId] = useState(null);

  const [dimensions, setDimensions] = useState(() => {
    // Responsive default dimensions
    const isMobile = window.innerWidth <= 768;
    return isMobile 
      ? { width: Math.min(400, window.innerWidth - 40), height: 300 }
      : { width: 480, height: 350 };
  });

  

  // Load saved state on mount
  useEffect(() => {
    try {
      const savedNotepad = localStorage.getItem('lyricsNotepad');
      if (savedNotepad) {
        const parsed = JSON.parse(savedNotepad);

        // Restore minimized state and position
        setIsMinimized(parsed.isMinimized ?? true);
        setPositionState(parsed.position || { bottom: 20, right: 20 });

        // Restore dimensions
        setDimensions(parsed.dimensions || (() => {
          const isMobile = window.innerWidth <= 768;
          return isMobile
            ? { width: Math.min(400, window.innerWidth - 40), height: 300 }
            : { width: 480, height: 350 };
        })());

        if (parsed.currentEditingSongId) {
          // Continue editing the existing song
          setContent(parsed.content || '');
          setTitle(parsed.title || 'Untitled');
          setCurrentEditingSongId(parsed.currentEditingSongId);
        } else {
          // Clear content to avoid treating previous edits as a new song
          setContent('');
          setTitle('Untitled');
          setCurrentEditingSongId(null);
        }
      }
    } catch (error) {
      console.error('Error loading notepad state:', error);
    }
  }, []);

  // Save state to localStorage
  const saveToStorage = useCallback((updates = {}) => {
    try {
      const notepadState = {
        content,
        title,
        isMinimized,
        dimensions,
        position,
        currentEditingSongId,
        ...updates
      };
      localStorage.setItem('lyricsNotepad', JSON.stringify(notepadState));
    } catch (error) {
      console.error('Error saving notepad state:', error);
    }
  }, [content, title, isMinimized, dimensions, position, currentEditingSongId]);

  // Debounced save handler to reduce storage writes
  const saveTimeoutRef = useRef(null);
  const pendingUpdatesRef = useRef({});
  const debouncedSave = useCallback((updates) => {
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToStorage(pendingUpdatesRef.current);
      pendingUpdatesRef.current = {};
    }, 400);
  }, [saveToStorage]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        saveToStorage(pendingUpdatesRef.current);
        pendingUpdatesRef.current = {};
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [saveToStorage]);

  // Update content with auto-save
  const updateContent = useCallback((newContent) => {
    setContent(newContent);
    debouncedSave({ content: newContent });
  }, [debouncedSave]);

  // Update title with auto-save
  const updateTitle = useCallback((newTitle) => {
    setTitle(newTitle);
    debouncedSave({ title: newTitle });
  }, [debouncedSave]);

  // Toggle minimized state
  const toggleMinimized = useCallback(() => {
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    saveToStorage({ isMinimized: newMinimized });
  }, [isMinimized, saveToStorage]);

  // Update dimensions
  const updateDimensions = useCallback((newDimensions) => {
    setDimensions(newDimensions);
    saveToStorage({ dimensions: newDimensions });
  }, [saveToStorage]);

  // Update position
  const updatePosition = useCallback((newPosition) => {
    setPositionState(newPosition);
    saveToStorage({ position: newPosition });
  }, [saveToStorage]);

  // Update current editing song ID
  const updateCurrentEditingSongId = useCallback((songId) => {
    setCurrentEditingSongId(songId);
    saveToStorage({ currentEditingSongId: songId });
  }, [saveToStorage]);

  return {
    content,
    title,
    isMinimized,
    dimensions,
    position,
    currentEditingSongId,
    updateContent,
    updateTitle,
    toggleMinimized,
    updateDimensions,
    setPosition: updatePosition,
    setCurrentEditingSongId: updateCurrentEditingSongId
  };
};