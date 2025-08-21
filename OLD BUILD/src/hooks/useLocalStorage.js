import { useState } from 'react';

export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setStoredValue = (newValue) => {
    try {
      setValue(newValue);
      window.localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [value, setStoredValue];
};

// Specific hooks for different data types
export const useSearchHistory = () => {
  return useLocalStorage('lyricsSearchHistory', []);
};

export const useDarkMode = () => {
  return useLocalStorage('lyricsSearchDarkMode', false);
};

export const useHighlightWord = () => {
  return useLocalStorage('lyricsSearchHighlight', '');
};