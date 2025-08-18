// Test current upload function to see if changes are deployed
async function testCurrentUpload() {
  console.log('🔍 Testing current upload function...');
  
  try {
    // Test with GET request (should return 405 Method Not Allowed)
    const response = await fetch('https://lyrical-toolkit.com/.netlify/functions/upload-audio', {
      method: 'GET'
    });
    
    console.log('📡 GET Response status:', response.status, response.statusText);
    
    if (response.status === 405) {
      console.log('✅ Upload function is reachable');
    }
    
    // Test with POST but no data (should fail with parsing error)
    const response2 = await fetch('https://lyrical-toolkit.com/.netlify/functions/upload-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'data' })
    });
    
    console.log('📡 POST Response status:', response2.status, response2.statusText);
    const errorText = await response2.text();
    console.log('📄 Response body:', errorText);
    
    // Check if error mentions busboy (new) or lambda-multipart-parser (old)
    if (errorText.includes('busboy')) {
      console.log('✅ NEW CODE DEPLOYED - busboy detected');
    } else if (errorText.includes('lambda-multipart-parser')) {
      console.log('❌ OLD CODE STILL ACTIVE - lambda-multipart-parser detected');
    } else if (errorText.includes('multipart/form-data')) {
      console.log('✅ NEW CODE LIKELY DEPLOYED - multipart validation active');
    } else {
      console.log('❓ UNKNOWN STATE - error doesn\'t match expected patterns');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCurrentUpload();