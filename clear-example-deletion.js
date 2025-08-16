// Script to clear example song deletion state for testing
// Run this in browser console: clearExampleDeletion()

const clearExampleDeletion = () => {
  console.log('🧹 Clearing example song deletion state...');
  
  // Check current state
  const currentState = localStorage.getItem('lyricsExampleDeleted');
  console.log('Current deletion state:', currentState);
  
  // Clear the deletion state
  localStorage.removeItem('lyricsExampleDeleted');
  
  // Verify it's cleared
  const newState = localStorage.getItem('lyricsExampleDeleted');
  console.log('New deletion state:', newState);
  
  console.log('✅ Example song deletion state cleared. Refresh the page to see the example song.');
};

// Make it available globally
window.clearExampleDeletion = clearExampleDeletion;

console.log('🔧 Run: clearExampleDeletion() to clear example song deletion state');