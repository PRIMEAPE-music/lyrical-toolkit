# Data Mapping Fixes - Song Persistence Issues

## Critical Issues Fixed

### 1. ✅ Field Name Standardization
**Problem**: Songs had either `lyrics` OR `content` field, causing undefined errors
**Solution**: All song objects now have BOTH fields with identical values

**Files Updated**:
- `src/utils/songStorage.js` - saveUserSongs() and loadUserSongs() mappings
- `src/utils/songStorage.js` - loadExampleSong() includes both fields
- `src/services/songsService.js` - getExampleSong() includes both fields

### 2. ✅ ID Format Compatibility  
**Problem**: Backend couldn't handle timestamp IDs (like 1755059648897.328)
**Solution**: Convert all IDs to strings for backend compatibility

**Changes**:
```javascript
// Frontend: Convert ID to string before sending to API
id: song.id ? String(song.id) : undefined

// Backend: Handle both timestamp and UUID formats
const songId = String(id); // Ensures string format
```

### 3. ✅ Backend Field Handling
**Problem**: Backend only expected `content` field, ignored `lyrics`
**Solution**: Backend now accepts both fields and prioritizes content for storage

**Files Updated**:
- `netlify/functions/songs.js` - PUT handler accepts both fields
- `netlify/functions/song-content.js` - POST/PUT handlers accept both fields

**Logic**:
```javascript
const songContent = content || lyrics || '';
```

### 4. ✅ Backend Response Mapping
**Problem**: Backend responses only included database fields, missing frontend compatibility
**Solution**: All responses now include both `content` and `lyrics` fields

**Response Format**:
```javascript
{
  id: song.id,
  title: song.title,
  content: song.content,        // Backend field
  lyrics: song.content,         // Frontend compatibility
  wordCount: song.word_count,
  lineCount: song.line_count,
  // ... other fields
}
```

### 5. ✅ useSearch.js Crash Fix
**Problem**: `song.lyrics.split()` crashed when lyrics was undefined
**Solution**: Added safe fallback to content field

**Fix**:
```javascript
// Before
const verses = song.lyrics.split(/\n\s*\n/)

// After  
const lyrics = song.lyrics || song.content || '';
const verses = lyrics.split(/\n\s*\n/)
```

### 6. ✅ Data Validation & Fallbacks
**Problem**: Missing fields caused crashes and data loss
**Solution**: Comprehensive fallback values for all fields

**Validation Added**:
- Title fallback: `song.title || 'Untitled Song'`
- Content fallback: `song.lyrics || song.content || ''`
- Count fallback: `song.wordCount || 0`
- Filename fallback: `song.filename || '${title}.txt'`

## Data Flow Transformation

### Frontend → Backend (Saving)
```javascript
// Input song object (various formats)
{
  id: "1755059648897.328" or "uuid-string",
  title: "My Song",
  lyrics: "content here" OR content: "content here",
  filename: "song.txt"
}

// Transformed for API
{
  id: "1755059648897.328", // Always string
  title: "My Song",
  content: "content here",  // Backend field
  lyrics: "content here",   // Compatibility field
  filename: "song.txt"
}
```

### Backend → Frontend (Loading)
```javascript
// Database response
{
  id: "uuid",
  title: "My Song", 
  content: "content here",
  word_count: 10,
  line_count: 3
}

// Transformed for frontend
{
  id: "uuid",
  title: "My Song",
  lyrics: "content here",    // Frontend expects this
  content: "content here",   // Backend uses this
  wordCount: 10,            // CamelCase for frontend
  lineCount: 3
}
```

## Updated Files

### Frontend
- `src/utils/songStorage.js` - Core data mapping logic
- `src/services/songsService.js` - Example song with both fields  
- `src/hooks/useSearch.js` - Safe lyrics field access

### Backend
- `netlify/functions/songs.js` - Bulk song operations
- `netlify/functions/song-content.js` - Individual song operations

## Testing

### Test Script
Use `test-song-persistence.js` to validate:
```javascript
// In browser console
testSongPersistence()
```

### Manual Validation
1. **Upload songs** - Should persist with both fields
2. **Login/logout** - Songs should remain with correct mapping
3. **Search functionality** - Should work without crashes
4. **Example song** - Should show with both fields

## Expected Behavior

### ✅ Fixed Issues
- Songs persist across login/logout sessions
- No more "Cannot read property 'split' of undefined" errors  
- Both timestamp and UUID IDs work correctly
- Search functionality works reliably
- Example song has proper field mapping

### 🔍 Data Validation
Every song object now guaranteed to have:
```javascript
{
  id: string,
  title: string (non-empty),
  lyrics: string,      // Frontend compatibility
  content: string,     // Backend storage
  filename: string,
  wordCount: number,
  lineCount: number,
  dateAdded: string (ISO)
}
```

## Migration Notes

- **No Breaking Changes**: Existing data works with new mapping
- **Backward Compatible**: Handles both old and new field formats
- **Auto-Fixing**: Missing fields are populated with sensible defaults
- **ID Agnostic**: Works with any ID format (timestamp, UUID, custom)

## Performance Impact

- **Minimal Overhead**: Field duplication is small (just string references)
- **Improved Reliability**: Prevents crashes and data loss
- **Better UX**: Consistent behavior across all features

## Error Handling

Added comprehensive error handling for:
- Missing or undefined fields
- Invalid ID formats  
- Network failures during save/load
- Malformed API responses

The system now gracefully handles edge cases and provides meaningful error messages instead of crashing.