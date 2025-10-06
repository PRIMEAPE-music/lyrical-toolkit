const { verifyJWT, getCorsHeaders, JWT_SECRET } = require('./shared-storage');
const { getSupabaseClient } = require('./supabase-client');

// ID format detection functions
function isTimestampId(id) {
    return id && /^\d+(\.\d+)?$/.test(String(id));
}

function isUUID(id) {
    return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
}

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
    const lines = content.split('\n').filter(function(line) { return line.trim(); });
    const words = content.split(/\s+/).filter(function(word) { return word.trim(); });
    
    return {
        wordCount: words.length,
        lineCount: lines.length,
        title: filename.replace(/\.(txt|lyrics)$/i, '') || 'Untitled Song'
    };
}

// Song database operations
const SongOperations = {
    // Get a specific song by ID
    getById: async function(userId, songId) {
        const supabase = getSupabaseClient();
        
        const { data, error } = await supabase
            .from('songs')
            .select('*')
            .eq('id', songId)
            .eq('user_id', userId)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            throw new Error('Failed to get song: ' + error.message);
        }
        
        return data;
    },

    // Create a new song
    create: async function(userId, songId, songData) {
        const supabase = getSupabaseClient();
        const parsed = parseSongContent(songData.content, songData.filename || songData.title);
        
        // Only use custom ID if it's a valid UUID format
        const songRecord = {
            user_id: userId,
            title: songData.title || parsed.title,
            content: songData.content,
            filename: songData.filename || `${parsed.title}.txt`,
            word_count: parsed.wordCount,
            line_count: parsed.lineCount,
            // Audio file metadata
            audio_file_url: songData.audioFileUrl || null,
            audio_file_name: songData.audioFileName || null,
            audio_file_size: songData.audioFileSize || null,
            audio_duration: songData.audioDuration || null
        };

        // Only set custom ID if it's a valid UUID (not timestamp or other format)
        if (songId && isUUID(songId)) {
            songRecord.id = songId;
        }
        // For timestamp IDs or other formats, let Supabase generate UUID

        const { data, error } = await supabase
            .from('songs')
            .insert([songRecord])
            .select()
            .single();
        
        if (error) {
            if (error.code === '23505') {
                throw new Error('Song with this ID already exists');
            }
            throw new Error('Failed to create song: ' + error.message);
        }
        
        return data;
    },

    // Update an existing song
    update: async function(userId, songId, songData) {
        const supabase = getSupabaseClient();
        const parsed = parseSongContent(songData.content, songData.filename || songData.title);
        
        const updateRecord = {
            title: songData.title || parsed.title,
            content: songData.content,
            filename: songData.filename || `${parsed.title}.txt`,
            word_count: parsed.wordCount,
            line_count: parsed.lineCount,
            date_modified: new Date().toISOString(),
            // Audio file metadata (only update if provided)
            ...(songData.audioFileUrl !== undefined && { audio_file_url: songData.audioFileUrl }),
            ...(songData.audioFileName !== undefined && { audio_file_name: songData.audioFileName }),
            ...(songData.audioFileSize !== undefined && { audio_file_size: songData.audioFileSize }),
            ...(songData.audioDuration !== undefined && { audio_duration: songData.audioDuration })
        };

        const { data, error } = await supabase
            .from('songs')
            .update(updateRecord)
            .eq('id', songId)
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                throw new Error('Song not found');
            }
            throw new Error('Failed to update song: ' + error.message);
        }
        
        return data;
    },

    // Delete a song
    delete: async function(userId, songId) {
        const supabase = getSupabaseClient();
        
        console.log('🗑️ Attempting database delete');
        console.log('User ID:', userId);
        console.log('Song ID:', songId);
        
        const { data, error } = await supabase
            .from('songs')
            .delete()
            .eq('id', songId)
            .eq('user_id', userId)
            .select(); // Return deleted rows to confirm
        
        if (error) {
            console.error('❌ Database delete failed:', error);
            throw new Error('Failed to delete song: ' + error.message);
        }
        
        if (!data || data.length === 0) {
            console.error('❌ Delete query succeeded but no rows affected');
            console.error('This usually means the song ID or user ID did not match');
            throw new Error('Song not found or already deleted');
        }
        
        console.log('✅ Successfully deleted song:', data[0].title);
        return true;
    },
};

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

        switch (event.httpMethod) {
            case 'GET':
                // Get specific song content and metadata
                try {
                    const song = await SongOperations.getById(userId, songId);
                    
                    if (!song) {
                        return {
                            statusCode: 404,
                            headers,
                            body: JSON.stringify({ error: 'Song not found' })
                        };
                    }
                    
                    // Transform database format to API format for backward compatibility
                    const response = {
                        id: song.id,
                        content: song.content,
                        lyrics: song.content, // Include lyrics field for frontend compatibility
                        title: song.title,
                        filename: song.filename,
                        wordCount: song.word_count,
                        lineCount: song.line_count,
                        dateAdded: song.date_added,
                        dateModified: song.date_modified,
                        userId: song.user_id,
                        // Audio file metadata
                        audioFileUrl: song.audio_file_url,
                        audioFileName: song.audio_file_name,
                        audioFileSize: song.audio_file_size,
                        audioDuration: song.audio_duration
                    };
                    
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify(response)
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
                    const { 
                        title, content, lyrics, filename,
                        audioFileUrl, audioFileName, audioFileSize, audioDuration 
                    } = JSON.parse(event.body);
                    
                    // Handle both content and lyrics fields
                    const songContent = content || lyrics || '';
                    
                    if (!songContent) {
                        return {
                            statusCode: 400,
                            headers,
                            body: JSON.stringify({ error: 'Content is required' })
                        };
                    }
                    
                    const updatedSong = await SongOperations.update(userId, songId, { 
                        title, 
                        content: songContent, 
                        filename,
                        audioFileUrl,
                        audioFileName,
                        audioFileSize,
                        audioDuration
                    });
                    
                    // Transform database format to API format for backward compatibility
                    const response = {
                        message: 'Song updated successfully',
                        song: {
                            id: updatedSong.id,
                            content: updatedSong.content,
                            lyrics: updatedSong.content, // Include lyrics field for frontend compatibility
                            title: updatedSong.title,
                            filename: updatedSong.filename,
                            wordCount: updatedSong.word_count,
                            lineCount: updatedSong.line_count,
                            dateAdded: updatedSong.date_added,
                            dateModified: updatedSong.date_modified,
                            userId: updatedSong.user_id,
                            // Audio file metadata
                            audioFileUrl: updatedSong.audio_file_url,
                            audioFileName: updatedSong.audio_file_name,
                            audioFileSize: updatedSong.audio_file_size,
                            audioDuration: updatedSong.audio_duration
                        }
                    };
                    
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify(response)
                    };
                } catch (error) {
                    console.error('Error updating song:', error);
                    if (error.message.includes('not found')) {
                        return {
                            statusCode: 404,
                            headers,
                            body: JSON.stringify({ error: 'Song not found' })
                        };
                    }
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ error: 'Failed to update song' })
                    };
                }

            case 'POST':
                // Create new song with specific ID
                try {
                    const { 
                        title, content, lyrics, filename,
                        audioFileUrl, audioFileName, audioFileSize, audioDuration 
                    } = JSON.parse(event.body);
                    
                    // Handle both content and lyrics fields
                    const songContent = content || lyrics || '';
                    
                    if (!songContent) {
                        return {
                            statusCode: 400,
                            headers,
                            body: JSON.stringify({ error: 'Content is required' })
                        };
                    }
                    
                    // Determine if we should use the songId or let database generate UUID
                    let actualSongId = null;
                    if (songId && isUUID(songId)) {
                        actualSongId = songId; // Use UUID ID
                    }
                    // For timestamp IDs or other formats, pass null to generate new UUID
                    
                    const newSong = await SongOperations.create(userId, actualSongId, { 
                        title, 
                        content: songContent, 
                        filename,
                        audioFileUrl,
                        audioFileName,
                        audioFileSize,
                        audioDuration
                    });
                    
                    // Transform database format to API format for backward compatibility
                    const response = {
                        message: 'Song created successfully',
                        song: {
                            id: newSong.id,
                            content: newSong.content,
                            lyrics: newSong.content, // Include lyrics field for frontend compatibility
                            title: newSong.title,
                            filename: newSong.filename,
                            wordCount: newSong.word_count,
                            lineCount: newSong.line_count,
                            dateAdded: newSong.date_added,
                            dateModified: newSong.date_modified,
                            userId: newSong.user_id,
                            // Audio file metadata
                            audioFileUrl: newSong.audio_file_url,
                            audioFileName: newSong.audio_file_name,
                            audioFileSize: newSong.audio_file_size,
                            audioDuration: newSong.audio_duration
                        }
                    };
                    
                    return {
                        statusCode: 201,
                        headers,
                        body: JSON.stringify(response)
                    };
                } catch (error) {
                    console.error('Error creating song:', error);
                    if (error.message.includes('already exists')) {
                        return {
                            statusCode: 409,
                            headers,
                            body: JSON.stringify({ error: 'Song with this ID already exists' })
                        };
                    }
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ error: 'Failed to create song' })
                    };
                }

            case 'DELETE':
                // Delete specific song and associated audio file
                try {
                    console.log('🗑️ DELETE request received');
                    console.log('User ID:', userId);
                    console.log('Song ID:', songId);
                    console.log('Song ID type:', isUUID(songId) ? 'UUID' : isTimestampId(songId) ? 'Timestamp' : 'Other');
                    
                    // Check if song exists first
                    const existingSong = await SongOperations.getById(userId, songId);
                    
                    if (!existingSong) {
                        console.error('❌ Song not found for deletion');
                        console.error('Attempted userId:', userId);
                        console.error('Attempted songId:', songId);
                        
                        // If timestamp ID, try to find and delete any song with matching content
                        if (isTimestampId(songId)) {
                            console.log('⚠️ Timestamp ID detected - attempting flexible delete');
                            
                            // Get all user songs and try to find by old ID reference
                            const supabase = getSupabaseClient();
                            const { data: allUserSongs } = await supabase
                                .from('songs')
                                .select('id, title, filename')
                                .eq('user_id', userId);
                            
                            console.log(`Found ${allUserSongs?.length || 0} total songs for user`);
                            
                            if (!allUserSongs || allUserSongs.length === 0) {
                                return {
                                    statusCode: 404,
                                    headers,
                                    body: JSON.stringify({ 
                                        error: 'Song not found',
                                        details: 'No songs exist for this user',
                                        userId: userId,
                                        attemptedSongId: songId
                                    })
                                };
                            }
                        }
                        
                        return {
                            statusCode: 404,
                            headers,
                            body: JSON.stringify({ 
                                error: 'Song not found',
                                details: 'Song may have been already deleted or ID mismatch',
                                userId: userId,
                                songId: songId
                            })
                        };
                    }
                    
                    console.log('✅ Song found:', existingSong.title);
                    
                    // Delete from database first
                    await SongOperations.delete(userId, songId);
                    console.log('✅ Song deleted from database');
                    
                    // If song had an audio file, delete it from storage
                    if (existingSong.audio_file_url) {
                        try {
                            // Extract file path from URL
                            const urlParts = existingSong.audio_file_url.split('/');
                            const bucketIndex = urlParts.findIndex(part => part === 'audio-files');
                            if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
                                const filePath = urlParts.slice(bucketIndex + 1).join('/');
                                
                                // Delete from Supabase Storage
                                const supabase = getSupabaseClient();
                                const { error: deleteError } = await supabase.storage
                                    .from('audio-files')
                                    .remove([filePath]);
                                
                                if (deleteError) {
                                    console.warn('Failed to delete audio file:', deleteError.message);
                                    // Don't fail the song deletion if audio cleanup fails
                                }
                            }
                        } catch (audioError) {
                            console.warn('Error during audio file cleanup:', audioError);
                            // Don't fail the song deletion if audio cleanup fails
                        }
                    }
                    
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