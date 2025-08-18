#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create a simple test file
const testFilePath = path.join(__dirname, 'test-audio.mp3');
const testContent = Buffer.from('fake audio content for testing');

// Write test file
fs.writeFileSync(testFilePath, testContent);

console.log('🎵 Testing Audio Upload with Node.js');
console.log('📁 Created test file:', testFilePath);

async function testUpload() {
    try {
        const FormData = require('form-data');
        const fetch = require('node-fetch');
        
        const form = new FormData();
        form.append('file', fs.createReadStream(testFilePath), {
            filename: 'test-audio.mp3',
            contentType: 'audio/mpeg'
        });
        form.append('userId', 'test-user-node');
        
        console.log('📤 Sending POST request...');
        
        const response = await fetch('http://localhost:8888/.netlify/functions/test-audio-minimal', {
            method: 'POST',
            body: form
        });
        
        console.log('📋 Response status:', response.status);
        console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('📋 Raw response text:', responseText);
        
        try {
            const data = JSON.parse(responseText);
            console.log('✅ Parsed JSON response:');
            console.log(JSON.stringify(data, null, 2));
        } catch (parseError) {
            console.error('❌ Failed to parse JSON response:', parseError.message);
            console.log('📋 Response was not valid JSON');
        }
        
    } catch (error) {
        console.error('🔴 Upload test failed:', error.message);
        console.error('🔴 Error stack:', error.stack);
    } finally {
        // Clean up test file
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
            console.log('🗑️ Cleaned up test file');
        }
    }
}

testUpload();