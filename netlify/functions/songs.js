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
    // Get all songs for a user
    getByUserId: async function(userId) {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('songs')
            .select('*')
            .eq('user_id', userId)
            .order('date_added', { ascending: false });
        
        if (error) {
            throw new Error('Failed to retrieve songs: ' + error.message);
        }
        
        return data || [];
    },

    // Create a new song
    create: async function(userId, songData) {
        const supabase = getSupabaseClient();
        const parsed = parseSongContent(songData.content, songData.filename || songData.title);
        
        const songRecord = {
            user_id: userId,
            title: songData.title || parsed.title,
            content: songData.content,
            filename: songData.filename || `${parsed.title}.txt`,
            word_count: parsed.wordCount,
            line_count: parsed.lineCount,
            date_added: songData.dateAdded || new Date().toISOString(),
            // Audio file metadata
            audio_file_url: songData.audioFileUrl || null,
            audio_file_name: songData.audioFileName || null,
            audio_file_size: songData.audioFileSize || null,
            audio_duration: songData.audioDuration || null
        };

        const { data, error } = await supabase
            .from('songs')
            .insert([songRecord])
            .select()
            .single();
        
        if (error) {
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
            throw new Error('Failed to update song: ' + error.message);
        }
        
        return data;
    },

    // Delete a song
    delete: async function(userId, songId) {
        const supabase = getSupabaseClient();
        
        const { error } = await supabase
            .from('songs')
            .delete()
            .eq('id', songId)
            .eq('user_id', userId);
        
        if (error) {
            throw new Error('Failed to delete song: ' + error.message);
        }
        
        return true;
    },

    // Delete all songs for a user
    deleteAll: async function(userId) {
        const supabase = getSupabaseClient();
        
        const { error } = await supabase
            .from('songs')
            .delete()
            .eq('user_id', userId);
        
        if (error) {
            throw new Error('Failed to delete all songs: ' + error.message);
        }
        
        return true;
    },

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
    }
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

        switch (event.httpMethod) {
            case 'GET':
                // List user's songs (metadata only)
                try {
                    const songs = await SongOperations.getByUserId(userId);
                    
                    // Transform database format to API format for backward compatibility
                    const songsMetadata = songs.map(song => ({
                        id: song.id,
                        title: song.title,
                        content: song.content,
                        lyrics: song.content, // Include lyrics field for frontend compatibility
                        wordCount: song.word_count,
                        lineCount: song.line_count,
                        dateAdded: song.date_added,
                        dateModified: song.date_modified,
                        userId: song.user_id,
                        filename: song.filename,
                        // Audio file metadata
                        audioFileUrl: song.audio_file_url,
                        audioFileName: song.audio_file_name,
                        audioFileSize: song.audio_file_size,
                        audioDuration: song.audio_duration
                    }));
                    
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
                        const { id, title, content, lyrics, filename } = song;
                        
                        // Handle both content and lyrics fields
                        const songContent = content || lyrics || '';
                        
                        if (!songContent) {
                            console.warn('Skipping song without content:', title);
                            continue;
                        }
                        
                        try {
                            let savedSong;
                            const songData = { 
                                title, 
                                content: songContent, 
                                filename, 
                                dateAdded: song.dateAdded,
                                // Include audio metadata if present
                                audioFileUrl: song.audioFileUrl,
                                audioFileName: song.audioFileName,
                                audioFileSize: song.audioFileSize,
                                audioDuration: song.audioDuration
                            };
                            
                            // Determine action based on ID format
                            if (id && isUUID(id)) {
                                // UUID ID: Try to update existing song
                                console.log(`Updating existing song with UUID: ${id}`);
                                try {
                                    savedSong = await SongOperations.update(userId, id, songData);
                                } catch (updateError) {
                                    // If update fails, create new song
                                    console.warn(`Update failed for UUID ${id}, creating new song:`, updateError.message);
                                    savedSong = await SongOperations.create(userId, songData);
                                }
                            } else {
                                // No ID, timestamp ID, or other format: Create new song
                                if (id && isTimestampId(id)) {
                                    console.log(`Creating new song for timestamp ID: ${id}`);
                                } else if (id) {
                                    console.log(`Creating new song for unknown ID format: ${id}`);
                                } else {
                                    console.log('Creating new song without ID');
                                }
                                savedSong = await SongOperations.create(userId, songData);
                            }
                            
                            // Transform to API format with both content and lyrics fields
                            const metadata = {
                                id: savedSong.id,
                                title: savedSong.title,
                                content: savedSong.content,
                                lyrics: savedSong.content, // Include lyrics field for frontend compatibility
                                wordCount: savedSong.word_count,
                                lineCount: savedSong.line_count,
                                dateAdded: savedSong.date_added,
                                dateModified: savedSong.date_modified,
                                userId: savedSong.user_id,
                                filename: savedSong.filename,
                                // Audio file metadata
                                audioFileUrl: savedSong.audio_file_url,
                                audioFileName: savedSong.audio_file_name,
                                audioFileSize: savedSong.audio_file_size,
                                audioDuration: savedSong.audio_duration
                            };
                            
                            savedSongs.push(metadata);
                        } catch (songError) {
                            console.warn(`Failed to save song "${title}":`, songError.message);
                        }
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
                    const songs = await SongOperations.getByUserId(userId);
                    const deletedCount = songs.length;
                    
                    await SongOperations.deleteAll(userId);
                    
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