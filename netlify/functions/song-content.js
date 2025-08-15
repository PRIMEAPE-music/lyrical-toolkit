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

// Create song key for user
function createSongKey(userId, songId) {
    return `${userId}-${songId}`;
}

// Extract song ID from path or query parameters
function extractSongId(event) {
    // First try path parameters (for /.netlify/functions/song-content/123)
    const pathParts = event.path.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    
    if (lastPart && lastPart !== 'song-content') {
        return lastPart;
    }
    
    // Try query parameters as fallback
    if (event.queryStringParameters && event.queryStringParameters.id) {
        return event.queryStringParameters.id;
    }
    
    // Try to extract from rawPath if available
    if (event.rawPath) {
        const rawParts = event.rawPath.split('/');
        const rawLast = rawParts[rawParts.length - 1];
        if (rawLast && rawLast !== 'song-content') {
            return rawLast;
        }
    }
    
    return null;
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
        
        // Extract song ID from path
        const songId = extractSongId(event);
        
        if (!songId || songId === 'song-content') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Song ID is required' })
            };
        }
        
        const songKey = createSongKey(userId, songId);

        switch (event.httpMethod) {
            case 'GET':
                // Get specific song content and metadata
                try {
                    const [content, metadataJson] = await Promise.all([
                        contentStore.get(songKey, { type: 'text' }),
                        metadataStore.get(songKey, { type: 'text' })
                    ]);
                    
                    if (!content) {
                        return {
                            statusCode: 404,
                            headers,
                            body: JSON.stringify({ error: 'Song not found' })
                        };
                    }
                    
                    let metadata = {};
                    if (metadataJson) {
                        try {
                            metadata = JSON.parse(metadataJson);
                        } catch (error) {
                            console.warn('Failed to parse metadata:', error);
                        }
                    }
                    
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            id: songId,
                            content: content,
                            ...metadata
                        })
                    };
                } catch (error) {
                    console.error('Error getting song:', error);
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ error: 'Failed to get song' })
                    };
                }

            case 'PUT':
                // Update specific song
                try {
                    const { title, content, filename } = JSON.parse(event.body);
                    
                    if (!content) {
                        return {
                            statusCode: 400,
                            headers,
                            body: JSON.stringify({ error: 'Content is required' })
                        };
                    }
                    
                    const parsed = parseSongContent(content, filename || title);
                    
                    const metadata = {
                        id: songId,
                        title: title || parsed.title,
                        wordCount: parsed.wordCount,
                        lineCount: parsed.lineCount,
                        dateAdded: new Date().toISOString(),
                        userId: userId,
                        filename: filename || `${parsed.title}.txt`
                    };
                    
                    // Save content and metadata
                    await Promise.all([
                        contentStore.set(songKey, content),
                        metadataStore.set(songKey, JSON.stringify(metadata))
                    ]);
                    
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            message: 'Song updated successfully',
                            song: { id: songId, content, ...metadata }
                        })
                    };
                } catch (error) {
                    console.error('Error updating song:', error);
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ error: 'Failed to update song' })
                    };
                }

            case 'POST':
                // Create new song with specific ID
                try {
                    const { title, content, filename } = JSON.parse(event.body);
                    
                    if (!content) {
                        return {
                            statusCode: 400,
                            headers,
                            body: JSON.stringify({ error: 'Content is required' })
                        };
                    }
                    
                    // Check if song already exists
                    const existingContent = await contentStore.get(songKey, { type: 'text' });
                    if (existingContent) {
                        return {
                            statusCode: 409,
                            headers,
                            body: JSON.stringify({ error: 'Song with this ID already exists' })
                        };
                    }
                    
                    const parsed = parseSongContent(content, filename || title);
                    
                    const metadata = {
                        id: songId,
                        title: title || parsed.title,
                        wordCount: parsed.wordCount,
                        lineCount: parsed.lineCount,
                        dateAdded: new Date().toISOString(),
                        userId: userId,
                        filename: filename || `${parsed.title}.txt`
                    };
                    
                    // Save content and metadata
                    await Promise.all([
                        contentStore.set(songKey, content),
                        metadataStore.set(songKey, JSON.stringify(metadata))
                    ]);
                    
                    return {
                        statusCode: 201,
                        headers,
                        body: JSON.stringify({
                            message: 'Song created successfully',
                            song: { id: songId, content, ...metadata }
                        })
                    };
                } catch (error) {
                    console.error('Error creating song:', error);
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ error: 'Failed to create song' })
                    };
                }

            case 'DELETE':
                // Delete specific song
                try {
                    // Check if song exists
                    const existingContent = await contentStore.get(songKey, { type: 'text' });
                    if (!existingContent) {
                        return {
                            statusCode: 404,
                            headers,
                            body: JSON.stringify({ error: 'Song not found' })
                        };
                    }
                    
                    // Delete from both stores
                    await Promise.all([
                        contentStore.delete(songKey),
                        metadataStore.delete(songKey)
                    ]);
                    
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({ 
                            message: 'Song deleted successfully',
                            id: songId
                        })
                    };
                } catch (error) {
                    console.error('Error deleting song:', error);
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ error: 'Failed to delete song' })
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