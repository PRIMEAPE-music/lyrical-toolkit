// Test script to verify example song logic
// Run this in browser console to test different scenarios

const testExampleSongLogic = async () => {
  console.log('🧪 Testing Example Song Logic');
  
  // Import functions (adjust if needed for your setup)
  const { loadAllSongs, loadExampleSongDeleted, saveExampleSongDeleted } = window;
  
  // Test 1: Unauthenticated user should see example song
  console.log('\n📝 Test 1: Unauthenticated user');
  try {
    const songs = await loadAllSongs(false);
    console.log('✅ Unauthenticated songs:', songs.length > 0 ? songs[0].title : 'No songs');
    console.log('   Expected: "HUMAN" if not deleted, empty if deleted');
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }
  
  // Test 2: Delete example song
  console.log('\n📝 Test 2: Delete example song');
  saveExampleSongDeleted(true);
  try {
    const songs = await loadAllSongs(false);
    console.log('✅ After deletion:', songs.length);
    console.log('   Expected: 0 songs');
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }
  
  // Test 3: Restore example song
  console.log('\n📝 Test 3: Restore example song');
  saveExampleSongDeleted(false);
  try {
    const songs = await loadAllSongs(false);
    console.log('✅ After restore:', songs.length > 0 ? songs[0].title : 'No songs');
    console.log('   Expected: "HUMAN"');
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }
  
  // Test 4: Authenticated user with no songs should see example
  console.log('\n📝 Test 4: Authenticated user with no songs');
  try {
    // This will try to fetch from API and fall back to example
    const songs = await loadAllSongs(true);
    console.log('✅ Authenticated (no songs):', songs.length > 0 ? songs[0].title : 'No songs');
    console.log('   Expected: "HUMAN" if no user songs, or user songs if they exist');
  } catch (error) {
    console.error('❌ Test 4 failed:', error);
  }
  
  console.log('\n🎉 Example song logic test complete!');
  console.log('💡 Check above results against expected values');
};

// Usage instructions
console.log('To test example song logic, run: testExampleSongLogic()');

// Scenario descriptions
console.log(`
📋 Test Scenarios:

1. 🚫 Logged out user → Should see HUMAN example (unless deleted)
2. 👤 Logged in user with 0 songs → Should see HUMAN example (unless deleted)  
3. 👤 Logged in user with songs → Should see only their songs
4. 🗑️ User deletes example → Should remember preference
5. 🔄 User logs out/in → Example state should persist
6. ⚠️ API errors → Should fallback to example song

Expected Behaviors:
- Title should be "HUMAN" (not "HUMAN (Example Song)")
- Example badge should show on the song card
- Example song persists across login/logout until user uploads songs
- Example deletion preference is remembered via localStorage
- Auth errors gracefully fall back to showing example song
`);

// Export for testing
if (typeof module !== 'undefined') {
  module.exports = { testExampleSongLogic };
}