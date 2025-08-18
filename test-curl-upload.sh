#!/bin/bash

# Create a small test MP3 file  
echo "fake audio content for testing" > test-audio.mp3

echo "🎵 Testing Audio Upload with curl"
echo "📁 Created test file: test-audio.mp3"
echo "📤 Uploading to function..."

# Test upload
curl -X POST \
  -F "file=@test-audio.mp3" \
  -F "userId=test-user-curl" \
  -F "filename=test-audio.mp3" \
  "http://localhost:8888/.netlify/functions/upload-audio" \
  -v

echo ""
echo "🗑️ Cleaning up test file..."
rm -f test-audio.mp3
echo "✅ Done"