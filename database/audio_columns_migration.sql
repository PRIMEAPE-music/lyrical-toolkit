-- Add audio file columns to songs table
-- Run this in your Supabase SQL editor

ALTER TABLE songs 
ADD COLUMN IF NOT EXISTS audio_file_url TEXT,
ADD COLUMN IF NOT EXISTS audio_file_name TEXT,
ADD COLUMN IF NOT EXISTS audio_file_size BIGINT,
ADD COLUMN IF NOT EXISTS audio_duration REAL;

-- Add index for efficient queries on audio files
CREATE INDEX IF NOT EXISTS idx_songs_audio_file_url ON songs(audio_file_url);

-- Add comments for documentation
COMMENT ON COLUMN songs.audio_file_url IS 'Supabase Storage URL for linked audio file';
COMMENT ON COLUMN songs.audio_file_name IS 'Original filename of uploaded audio file';
COMMENT ON COLUMN songs.audio_file_size IS 'File size in bytes';
COMMENT ON COLUMN songs.audio_duration IS 'Audio duration in seconds';

-- Create storage bucket for audio files (if not exists)
-- Note: This needs to be run separately or via Supabase dashboard
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('audio-files', 'audio-files', false)
-- ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for audio-files bucket
-- Note: These may need to be created via Supabase dashboard
-- Enable RLS on storage.objects if not already enabled

-- Policy: Users can view their own audio files
-- CREATE POLICY "Users can view own audio files" ON storage.objects
-- FOR SELECT USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Users can upload audio files to their folder
-- CREATE POLICY "Users can upload audio files" ON storage.objects
-- FOR INSERT WITH CHECK (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Users can delete their own audio files  
-- CREATE POLICY "Users can delete own audio files" ON storage.objects
-- FOR DELETE USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);