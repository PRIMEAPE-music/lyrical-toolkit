// Debug script to test example song loading
// Run this in the browser console to check what's happening

const debugExampleSong = async () => {
  console.log('🔍 Debugging Example Song Loading');
  
  // Test localStorage state
  const lyricsExampleDeleted = localStorage.getItem('lyricsExampleDeleted');
  console.log('📦 localStorage lyricsExampleDeleted:', lyricsExampleDeleted);
  
  // Test if we can fetch HUMAN.txt
  try {
    const response = await fetch('/HUMAN.txt');
    console.log('📄 HUMAN.txt response status:', response.status);
    if (response.ok) {
      const content = await response.text();
      console.log('📄 HUMAN.txt content length:', content.length);
      console.log('📄 First 100 chars:', content.substring(0, 100));
    }
  } catch (error) {
    console.error('❌ Failed to fetch HUMAN.txt:', error);
  }
  
  // Test the song loading functions
  if (window.loadAllSongs) {
    console.log('🔧 Testing loadAllSongs(false)...');
    try {
      const songs = await window.loadAllSongs(false);
      console.log('✅ loadAllSongs(false) result:', songs);
    } catch (error) {
      console.error('❌ loadAllSongs(false) failed:', error);
    }
  } else {
    console.log('⚠️ loadAllSongs function not available on window');
  }
  
  // Clear localStorage for testing
  console.log('🧹 Clearing localStorage example deletion state');
  localStorage.removeItem('lyricsExampleDeleted');
  
  // Test again
  if (window.loadAllSongs) {
    console.log('🔧 Testing loadAllSongs(false) after clearing localStorage...');
    try {
      const songs = await window.loadAllSongs(false);
      console.log('✅ loadAllSongs(false) after clear result:', songs);
    } catch (error) {
      console.error('❌ loadAllSongs(false) after clear failed:', error);
    }
  }
};

// Expose debugging function to window for easy access
window.debugExampleSong = debugExampleSong;

console.log('🔧 Debug function loaded. Run: debugExampleSong()');