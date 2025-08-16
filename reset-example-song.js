// Reset example song state for testing
// Run this in browser console and then refresh the page

const resetExampleSong = () => {
  console.log('🔄 Resetting example song state...');
  
  // Show current state
  const currentDeletion = localStorage.getItem('lyricsExampleDeleted');
  console.log('Current deletion state:', currentDeletion);
  
  // Clear the deletion state
  localStorage.removeItem('lyricsExampleDeleted');
  console.log('✅ Cleared example song deletion state');
  
  // Clear any other song-related localStorage (optional)
  const keys = Object.keys(localStorage);
  const songKeys = keys.filter(key => key.includes('lyric') || key.includes('song'));
  console.log('Other song-related localStorage keys:', songKeys);
  
  console.log('🎉 Example song state reset complete!');
  console.log('💡 Refresh the page to see the HUMAN example song');
  
  return 'Reset complete - refresh the page';
};

// Make it globally available
window.resetExampleSong = resetExampleSong;

// Also create a quick test function
window.testExampleSongLogic = async () => {
  console.log('🧪 Testing example song logic...');
  
  if (typeof loadAllSongs !== 'undefined') {
    try {
      const songs = await loadAllSongs(false);
      console.log('📊 loadAllSongs(false) result:', songs);
      return songs;
    } catch (error) {
      console.error('❌ loadAllSongs failed:', error);
      return [];
    }
  } else {
    console.log('⚠️ loadAllSongs not available - you may need to import it');
    return null;
  }
};

console.log('🔧 Functions available:');
console.log('- resetExampleSong() - Clear deletion state');
console.log('- testExampleSongLogic() - Test loading');
console.log('');
console.log('🚀 Quick start: Run resetExampleSong() then refresh page');