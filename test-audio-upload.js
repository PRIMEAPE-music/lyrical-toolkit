// Test script to verify audio upload system
// Run with: node test-audio-upload.js

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Create a simple test audio file (minimal MP3-like structure)
const createTestAudioFile = () => {
  // Create a minimal buffer that represents an audio file
  const buffer = Buffer.alloc(1024);
  // Write MP3 header-like bytes
  buffer.write('ID3', 0);
  return buffer;
};

const testAudioUpload = async () => {
  console.log('🧪 Testing Audio Upload System');
  console.log('================================');
  
  try {
    // Create test file
    const testAudioBuffer = createTestAudioFile();
    const testFilename = 'test-audio.mp3';
    
    console.log('📄 Created test file:', testFilename, '(', testAudioBuffer.length, 'bytes)');
    
    // Create FormData
    const formData = new FormData();
    formData.append('file', testAudioBuffer, {
      filename: testFilename,
      contentType: 'audio/mpeg'
    });
    formData.append('userId', 'test-user');
    formData.append('filename', testFilename);
    
    console.log('📤 Uploading to Netlify function...');
    
    // Test upload to local Netlify dev server
    const response = await fetch('http://localhost:8888/.netlify/functions/upload-audio', {
      method: 'POST',
      body: formData
    });
    
    console.log('📊 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Upload successful!');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
    
    // Test getting download URL
    console.log('🔗 Testing download URL...');
    const urlResponse = await fetch('http://localhost:8888/.netlify/functions/get-audio-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filePath: result.filePath
      })
    });
    
    if (urlResponse.ok) {
      const urlResult = await urlResponse.json();
      console.log('✅ Download URL generated:', urlResult.signedUrl);
    } else {
      console.error('❌ Failed to get download URL:', await urlResponse.text());
    }
    
    // Test file deletion
    console.log('🗑️ Testing file deletion...');
    const deleteResponse = await fetch('http://localhost:8888/.netlify/functions/delete-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filePath: result.filePath
      })
    });
    
    if (deleteResponse.ok) {
      console.log('✅ File deleted successfully');
    } else {
      console.error('❌ Failed to delete file:', await deleteResponse.text());
    }
    
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
if (require.main === module) {
  testAudioUpload();
}

module.exports = { testAudioUpload };