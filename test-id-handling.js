// Test script to verify ID format handling in backend
// Run this in browser console to test timestamp → UUID conversion

const testIdHandling = async () => {
  console.log('🧪 Testing ID Format Handling');
  
  // Test ID detection functions (client-side versions)
  const isTimestampId = (id) => id && /^\d+(\.\d+)?$/.test(String(id));
  const isUUID = (id) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
  
  // Test various ID formats
  const testIds = [
    '1755059648897.328',           // Timestamp with decimal
    '1755059648897',               // Timestamp integer
    '550e8400-e29b-41d4-a716-446655440000', // UUID
    'custom-id-123',               // Custom string
    '',                            // Empty
    null,                          // Null
    undefined                      // Undefined
  ];
  
  console.log('\n📋 ID Format Detection:');
  testIds.forEach(id => {
    const isTs = isTimestampId(id);
    const isUu = isUUID(id);
    const action = isUu ? 'UPDATE' : 'CREATE';
    console.log(`ID: "${id}" → Timestamp: ${isTs ? '✅' : '❌'}, UUID: ${isUu ? '✅' : '❌'}, Action: ${action}`);
  });
  
  // Test songs with different ID formats
  const testSongs = [
    {
      id: '1755059648897.328',
      title: 'Timestamp ID Song',
      lyrics: 'This song has a timestamp ID\nShould create new UUID entry',
      filename: 'timestamp.txt'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'UUID Song',
      lyrics: 'This song has a UUID\nShould try to update existing',
      filename: 'uuid.txt'
    },
    {
      title: 'No ID Song',
      lyrics: 'This song has no ID\nShould create new UUID entry',
      filename: 'no-id.txt'
    }
  ];
  
  console.log('\n📤 Test Songs for Backend Processing:');
  testSongs.forEach((song, index) => {
    const hasId = !!song.id;
    const idType = hasId ? (isUUID(song.id) ? 'UUID' : isTimestampId(song.id) ? 'Timestamp' : 'Other') : 'None';
    const expectedAction = (!hasId || !isUUID(song.id)) ? 'CREATE' : 'UPDATE';
    
    console.log(`${index + 1}. "${song.title}"`);
    console.log(`   ID: ${song.id || 'none'} (${idType})`);
    console.log(`   Expected Action: ${expectedAction}`);
    console.log(`   Should Generate New UUID: ${expectedAction === 'CREATE' ? '✅' : '❌'}`);
  });
  
  // Test save operation if function is available
  if (typeof saveUserSongs !== 'undefined') {
    console.log('\n🔧 Testing saveUserSongs with mixed ID formats...');
    try {
      await saveUserSongs(testSongs);
      console.log('✅ saveUserSongs completed - check server logs for ID processing');
    } catch (error) {
      console.error('❌ saveUserSongs failed:', error);
    }
    
    // Load songs to see the results
    if (typeof loadUserSongs !== 'undefined') {
      console.log('\n📥 Loading songs to verify UUID assignment...');
      try {
        const loadedSongs = await loadUserSongs(false);
        console.log('✅ Loaded songs:', loadedSongs.length);
        
        loadedSongs.forEach((song, index) => {
          const hasUUID = isUUID(song.id);
          console.log(`${index + 1}. "${song.title}" → ID: ${song.id} (${hasUUID ? 'Valid UUID ✅' : 'Invalid ❌'})`);
        });
      } catch (error) {
        console.error('❌ loadUserSongs failed:', error);
      }
    }
  } else {
    console.log('⚠️ saveUserSongs function not available for testing');
  }
  
  console.log('\n🎉 ID handling test complete!');
  console.log('💡 Check Netlify function logs for backend processing details');
};

// Expected behavior summary
const logExpectedBehavior = () => {
  console.log(`
📋 Expected ID Handling Behavior:

1. 🆔 Timestamp IDs (1755059648897.328):
   → Backend Action: CREATE new song with UUID
   → Database: New entry with Supabase-generated UUID
   → Frontend: Receives new UUID in response

2. 🆔 UUID IDs (550e8400-e29b-41d4-a716-446655440000):
   → Backend Action: UPDATE existing song (if found)
   → Database: Updates existing entry OR creates new if not found
   → Frontend: Receives same or new UUID

3. 🆔 No ID or Other Formats:
   → Backend Action: CREATE new song with UUID
   → Database: New entry with Supabase-generated UUID
   → Frontend: Receives new UUID

4. 🔄 End Result:
   → All songs in database have valid UUIDs
   → No timestamp IDs in database
   → Frontend gets consistent UUID responses
   → No more UUID validation errors
`);
};

// Make functions available globally
window.testIdHandling = testIdHandling;
window.logExpectedBehavior = logExpectedBehavior;

console.log('🔧 ID Handling Test Functions:');
console.log('- testIdHandling() - Run complete test');
console.log('- logExpectedBehavior() - Show expected behavior');
console.log('');
console.log('🚀 Quick start: Run testIdHandling()');