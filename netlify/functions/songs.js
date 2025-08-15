const { getStore } = require('@netlify/blobs');
const { verifyJWT, getCorsHeaders, JWT_SECRET } = require('./shared-storage');

// Initialize Blobs stores
const isProduction = process.env.NODE_ENV === 'production';
const metadataStore = getStore({
    name: 'song-metadata',
    deployId: isProduction ? undefined : process.env.DEPLOY_ID
});
const contentStore = getStore({
    name: 'song-content', 
    deployId: isProduction ? undefined : process.env.DEPLOY_ID
});

// Helper function to authenticate user from JWT
function authenticateRequest(event) {
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Authorization token required');
    }
    
    const token = authHeader.substring(7);
    const payload = verifyJWT(token, JWT_SECRET);
    return payload;
}

// Generate unique song ID
function generateSongId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Create song key for user
function createSongKey(userId, songId) {
    return `${userId}-${songId}`;
}

// Parse song content and extract metadata
function parseSongContent(content, filename) {
    const lines = content.split('\n').filter(line => line.trim());
    const words = content.split(/\s+/).filter(word => word.trim());
    
    return {
        wordCount: words.length,
        lineCount: lines.length,
        title: filename.replace(/\.(txt|lyrics)$/i, '') || 'Untitled Song'
    };
}

exports.handler = async (event, context) => {
    const headers = getCorsHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // Authenticate user
        const user = authenticateRequest(event);
        const userId = user.userId;

        switch (event.httpMethod) {
            case 'GET':
                // List user's songs (metadata only)
                try {
                    const metadataList = await metadataStore.list({ prefix: `${userId}-` });
                    const songsMetadata = [];
                    
                    for (const { key } of metadataList.blobs) {
                        try {
                            const metadata = await metadataStore.get(key, { type: 'json' });
                            if (metadata) {
                                songsMetadata.push(metadata);
                            }
                        } catch (error) {
                            console.warn(`Failed to load metadata for key ${key}:`, error);
                        }
                    }
                    
                    // Sort by dateAdded (newest first)
                    songsMetadata.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
                    
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({ songs: songsMetadata })
                    };
                } catch (error) {
                    console.error('Error listing songs:', error);
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ error: 'Failed to list songs' })
                    };
                }

            case 'PUT':
                // Save/update user's songs (bulk operation)
                try {
                    const { songs } = JSON.parse(event.body);
                    
                    if (!Array.isArray(songs)) {
                        return {
                            statusCode: 400,
                            headers,
                            body: JSON.stringify({ error: 'Songs must be an array' })
                        };
                    }

                    const savedSongs = [];
                    
                    for (const song of songs) {
                        const { id, title, content, filename } = song;
                        
                        if (!content) {
                            console.warn('Skipping song without content:', title);
                            continue;
                        }
                        
                        const songId = id || generateSongId();
                        const songKey = createSongKey(userId, songId);
                        const parsed = parseSongContent(content, filename || title);
                        
                        const metadata = {
                            id: songId,
                            title: parsed.title,
                            wordCount: parsed.wordCount,
                            lineCount: parsed.lineCount,
                            dateAdded: song.dateAdded || new Date().toISOString(),
                            userId: userId,
                            filename: filename || `${parsed.title}.txt`
                        };
                        
                        // Save content to content store
                        await contentStore.set(songKey, content);
                        
                        // Save metadata to metadata store
                        await metadataStore.set(songKey, JSON.stringify(metadata));
                        
                        savedSongs.push(metadata);
                    }
                    
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({ 
                            message: `Successfully saved ${savedSongs.length} songs`,
                            songs: savedSongs 
                        })
                    };
                } catch (error) {
                    console.error('Error saving songs:', error);
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ error: 'Failed to save songs' })
                    };
                }

            case 'DELETE':
                // Clear all user's songs
                try {
                    const metadataList = await metadataStore.list({ prefix: `${userId}-` });
                    let deletedCount = 0;
                    
                    for (const { key } of metadataList.blobs) {
                        try {
                            // Delete from both stores
                            await Promise.all([
                                metadataStore.delete(key),
                                contentStore.delete(key)
                            ]);
                            deletedCount++;
                        } catch (error) {
                            console.warn(`Failed to delete song with key ${key}:`, error);
                        }
                    }
                    
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({ 
                            message: `Successfully deleted ${deletedCount} songs` 
                        })
                    };
                } catch (error) {
                    console.error('Error deleting songs:', error);
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ error: 'Failed to delete songs' })
                    };
                }

            default:
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({ error: 'Method not allowed' })
                };
        }
    } catch (error) {
        console.error('Authentication or request error:', error);
        return {
            statusCode: error.message.includes('token') ? 401 : 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Internal server error' })
        };
    }
};