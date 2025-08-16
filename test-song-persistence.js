// Test script to verify song persistence and data mapping
// Run this in browser console to test the fixed implementation

const testSongPersistence = async () => {
  console.log('🧪 Testing Song Persistence and Data Mapping');
  
  // Test data with various formats
  const testSongs = [
    {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Timestamp-based ID
      title: 'Test Song 1',
      lyrics: 'This is a test song\nWith multiple lines\nTo verify lyrics field',
      filename: 'test1.txt',
      dateAdded: new Date().toISOString()
    },
    {
      id: 'test-uuid-' + Date.now(), // String ID
      title: 'Test Song 2',
      content: 'This song uses content field\nInstead of lyrics\nShould still work',
      filename: 'test2.txt',
      dateAdded: new Date().toISOString()
    },
    {
      // No ID - should be auto-generated
      title: 'Test Song 3',
      lyrics: 'Auto-generated ID test\nBoth lyrics and content\nShould be present',
      content: 'This should be overridden by lyrics',
      filename: 'test3.txt'
    }
  ];
  
  console.log('📤 Test songs to save:', testSongs);
  
  // Test 1: Save songs
  try {
    console.log('\n🔧 Testing saveUserSongs...');
    if (typeof saveUserSongs !== 'undefined') {
      await saveUserSongs(testSongs);
      console.log('✅ saveUserSongs completed successfully');
    } else {
      console.log('⚠️ saveUserSongs function not available');
    }
  } catch (error) {
    console.error('❌ saveUserSongs failed:', error);
  }
  
  // Test 2: Load songs
  try {
    console.log('\n🔧 Testing loadUserSongs...');
    if (typeof loadUserSongs !== 'undefined') {
      const loadedSongs = await loadUserSongs(false); // Don't include example
      console.log('✅ loadUserSongs result:', loadedSongs);
      
      // Validate data mapping
      if (loadedSongs.length > 0) {
        const song = loadedSongs[0];
        console.log('\n📊 Data mapping validation:');
        console.log('- Has lyrics field:', 'lyrics' in song, song.lyrics ? '✅' : '❌');
        console.log('- Has content field:', 'content' in song, song.content ? '✅' : '❌');
        console.log('- Fields match:', song.lyrics === song.content ? '✅' : '❌');
        console.log('- Has title:', 'title' in song, song.title ? '✅' : '❌');
        console.log('- Has wordCount:', 'wordCount' in song, typeof song.wordCount === 'number' ? '✅' : '❌');
      }
    } else {
      console.log('⚠️ loadUserSongs function not available');
    }
  } catch (error) {
    console.error('❌ loadUserSongs failed:', error);
  }
  
  // Test 3: Search functionality
  try {
    console.log('\n🔧 Testing search functionality...');
    if (typeof useSearch !== 'undefined' && typeof loadUserSongs !== 'undefined') {
      const songs = await loadUserSongs(false);
      if (songs.length > 0) {
        // Simulate search
        songs.forEach((song, index) => {
          const hasLyrics = song.lyrics && typeof song.lyrics === 'string';
          const hasContent = song.content && typeof song.content === 'string';
          console.log(`Song ${index + 1}: lyrics=${hasLyrics ? '✅' : '❌'}, content=${hasContent ? '✅' : '❌'}`);
        });
      }
    } else {
      console.log('⚠️ Search test functions not available');
    }
  } catch (error) {
    console.error('❌ Search test failed:', error);
  }
  
  // Test 4: Example song validation
  try {
    console.log('\n🔧 Testing example song...');
    if (typeof loadAllSongs !== 'undefined') {
      const songsWithExample = await loadAllSongs(false);
      const exampleSong = songsWithExample.find(s => s.isExample);
      if (exampleSong) {
        console.log('✅ Example song found');
        console.log('- Has lyrics field:', 'lyrics' in exampleSong ? '✅' : '❌');
        console.log('- Has content field:', 'content' in exampleSong ? '✅' : '❌');
        console.log('- Title is "HUMAN":', exampleSong.title === 'HUMAN' ? '✅' : '❌');
      } else {
        console.log('⚠️ No example song found');
      }
    }
  } catch (error) {
    console.error('❌ Example song test failed:', error);
  }
  
  console.log('\n🎉 Song persistence test complete!');
};

// Validation helper
const validateSongObject = (song, label = 'Song') => {
  console.log(`\n📋 Validating ${label}:`);
  const checks = [
    ['id', song.id, typeof song.id === 'string'],
    ['title', song.title, typeof song.title === 'string' && song.title.length > 0],
    ['lyrics', song.lyrics, typeof song.lyrics === 'string'],
    ['content', song.content, typeof song.content === 'string'],
    ['filename', song.filename, typeof song.filename === 'string'],
    ['wordCount', song.wordCount, typeof song.wordCount === 'number'],
    ['lineCount', song.lineCount, typeof song.lineCount === 'number'],
    ['dateAdded', song.dateAdded, typeof song.dateAdded === 'string']
  ];
  
  checks.forEach(([field, value, isValid]) => {
    const status = isValid ? '✅' : '❌';
    console.log(`  ${field}: ${status} (${typeof value})`);
    if (!isValid && value !== undefined) {
      console.log(`    Value: ${JSON.stringify(value)}`);
    }
  });
  
  return checks.every(([,, isValid]) => isValid);
};

// Make functions available globally
window.testSongPersistence = testSongPersistence;
window.validateSongObject = validateSongObject;

console.log('🔧 Test functions loaded:');
console.log('- testSongPersistence() - Full test suite');
console.log('- validateSongObject(song) - Validate individual song');
console.log('');
console.log('🚀 Quick start: Run testSongPersistence()');