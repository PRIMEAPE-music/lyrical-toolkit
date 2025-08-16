-- Supabase Songs Database Schema
-- This file contains the SQL commands to create the songs tables and policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create songs table
CREATE TABLE IF NOT EXISTS songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    filename TEXT,
    word_count INTEGER DEFAULT 0,
    line_count INTEGER DEFAULT 0,
    date_added TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create song_metadata table for additional metadata if needed
CREATE TABLE IF NOT EXISTS song_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    metadata_key TEXT NOT NULL,
    metadata_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(song_id, metadata_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_date_added ON songs(date_added DESC);
CREATE INDEX IF NOT EXISTS idx_songs_date_modified ON songs(date_modified DESC);
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
CREATE INDEX IF NOT EXISTS idx_song_metadata_song_id ON song_metadata(song_id);
CREATE INDEX IF NOT EXISTS idx_song_metadata_key ON song_metadata(metadata_key);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_songs_updated_at ON songs;
CREATE TRIGGER update_songs_updated_at
    BEFORE UPDATE ON songs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_song_metadata_updated_at ON song_metadata;
CREATE TRIGGER update_song_metadata_updated_at
    BEFORE UPDATE ON song_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_metadata ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for songs table
-- Users can only access their own songs
DROP POLICY IF EXISTS "Users can view own songs" ON songs;
CREATE POLICY "Users can view own songs" ON songs
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own songs" ON songs;
CREATE POLICY "Users can insert own songs" ON songs
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own songs" ON songs;
CREATE POLICY "Users can update own songs" ON songs
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own songs" ON songs;
CREATE POLICY "Users can delete own songs" ON songs
    FOR DELETE USING (user_id = auth.uid());

-- Create RLS policies for song_metadata table
-- Users can only access metadata for their own songs
DROP POLICY IF EXISTS "Users can view own song metadata" ON song_metadata;
CREATE POLICY "Users can view own song metadata" ON song_metadata
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM songs 
            WHERE songs.id = song_metadata.song_id 
            AND songs.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own song metadata" ON song_metadata;
CREATE POLICY "Users can insert own song metadata" ON song_metadata
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM songs 
            WHERE songs.id = song_metadata.song_id 
            AND songs.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own song metadata" ON song_metadata;
CREATE POLICY "Users can update own song metadata" ON song_metadata
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM songs 
            WHERE songs.id = song_metadata.song_id 
            AND songs.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own song metadata" ON song_metadata;
CREATE POLICY "Users can delete own song metadata" ON song_metadata
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM songs 
            WHERE songs.id = song_metadata.song_id 
            AND songs.user_id = auth.uid()
        )
    );

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON songs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON song_metadata TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create function to calculate song statistics
CREATE OR REPLACE FUNCTION calculate_song_stats(song_content TEXT)
RETURNS TABLE(word_count INTEGER, line_count INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN song_content IS NULL OR trim(song_content) = '' THEN 0
            ELSE array_length(string_to_array(trim(regexp_replace(song_content, '\s+', ' ', 'g')), ' '), 1)
        END as word_count,
        CASE 
            WHEN song_content IS NULL THEN 0
            ELSE array_length(string_to_array(song_content, E'\n'), 1)
        END as line_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE songs IS 'Stores user songs with lyrics content and metadata';
COMMENT ON TABLE song_metadata IS 'Stores additional metadata for songs in key-value format';
COMMENT ON COLUMN songs.user_id IS 'Foreign key to users table, owner of the song';
COMMENT ON COLUMN songs.title IS 'Display title of the song';
COMMENT ON COLUMN songs.content IS 'Full lyrics content of the song';
COMMENT ON COLUMN songs.filename IS 'Original filename when uploaded';
COMMENT ON COLUMN songs.word_count IS 'Cached count of words in the song';
COMMENT ON COLUMN songs.line_count IS 'Cached count of lines in the song';
COMMENT ON COLUMN songs.date_added IS 'When the song was first created';
COMMENT ON COLUMN songs.date_modified IS 'When the song content was last modified';