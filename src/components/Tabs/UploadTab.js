import React from 'react';
import { Upload, Plus, FileText, Trash2, Music } from 'lucide-react';
import ExportDropdown from '../Shared/ExportDropdown';
import AudioUpload from '../Audio/AudioUpload';
import AudioPlayer from '../Audio/AudioPlayer';

const UploadTab = ({ 
  songs,
  onFileUpload,
  onDeleteSong,
  onDeleteAllSongs,
  onSongSelect,
  onEditSong,
  onExportTxt,
  onExportPdf,
  isDragging,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  darkMode,
  // Audio-related props
  onAudioUpload = null,
  onAudioDownload = null,
  onAudioRemove = null,
  selectedSongForAudio = null,
  setSelectedSongForAudio = null,
  userId = null  // Add userId prop
}) => {
  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging 
            ? darkMode 
              ? 'border-gray-500 bg-gray-800' 
              : 'border-gray-400 bg-gray-50'
            : darkMode
              ? 'border-gray-600 hover:border-gray-500'
              : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
        <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Upload your lyrics
        </h3>
        <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Drag and drop your .txt files here, or click to browse
        </p>
        
        <input
          type="file"
          multiple
          accept=".txt"
          onChange={(e) => onFileUpload(Array.from(e.target.files))}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className={`inline-flex items-center px-4 py-2 rounded-lg cursor-pointer transition-colors ${
            darkMode 
              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
              : 'bg-gray-900 hover:bg-gray-800 text-white'
          }`}
        >
          <Plus className="w-4 h-4 mr-2" />
          Choose Files
        </label>
        
        <p className={`text-xs mt-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Supports up to 50 .txt files
        </p>
      </div>

      {/* Audio Upload Section */}
      {songs.length > 0 && onAudioUpload && (
        <div className="mt-8">
          <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Add Audio Files
          </h3>
          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Select a song below to upload an audio file, or upload audio files that will be linked to songs.
          </p>
          
          {/* Audio Upload Component */}
          {selectedSongForAudio && (
            <div className={`p-4 rounded-lg border mb-4 ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Uploading audio for: {selectedSongForAudio.title}
                  </h4>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Add an audio file to accompany this song
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSongForAudio && setSelectedSongForAudio(null)}
                  className={`text-sm px-3 py-1 rounded transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
              </div>
              
              <AudioUpload
                onUploadSuccess={(audioData) => onAudioUpload(selectedSongForAudio.id, audioData)}
                onUploadError={(error) => console.error('Audio upload error:', error)}
                darkMode={darkMode}
                currentAudio={selectedSongForAudio.audioFileUrl ? {
                  filename: selectedSongForAudio.audioFileName,
                  size: selectedSongForAudio.audioFileSize,
                  duration: selectedSongForAudio.audioDuration
                } : null}
                allowReplace={!!selectedSongForAudio.audioFileUrl}
                userId={userId}
              />
            </div>
          )}
        </div>
      )}

      {/* Uploaded Songs List */}
      {songs.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Your Songs ({songs.length})
            </h3>
            <button
              onClick={onDeleteAllSongs}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              <Trash2 className="w-4 h-4 inline mr-1" />
              Delete All
            </button>
          </div>
          <div className="grid gap-3">
            {songs.map((song) => (
              <div key={song.id} className={`rounded-lg border p-4 transition-colors ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className={`w-5 h-5 mr-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {song.title}
                        </h4>
                        {song.isExample && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            darkMode 
                              ? 'bg-blue-900 text-blue-200 border border-blue-700' 
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            Example
                          </span>
                        )}
                        {song.audioFileUrl && (
                          <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                            darkMode 
                              ? 'bg-green-900 text-green-200 border border-green-700' 
                              : 'bg-green-100 text-green-800 border border-green-200'
                          }`}>
                            <Music className="w-3 h-3" />
                            Audio
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {song.wordCount} words • Added {new Date(song.dateAdded).toLocaleDateString()}
                        {song.audioFileUrl && song.audioDuration && ` • ${Math.floor(song.audioDuration / 60)}:${(song.audioDuration % 60).toFixed(0).padStart(2, '0')} audio`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    {/* Audio button - only show if audio functions are available */}
                    {onAudioUpload && (
                      <button
                        onClick={() => setSelectedSongForAudio && setSelectedSongForAudio(song)}
                        className={`text-xs md:text-sm px-2 md:px-3 py-1 rounded transition-colors ${
                          song.audioFileUrl
                            ? darkMode 
                              ? 'bg-green-700 hover:bg-green-600 text-green-200' 
                              : 'bg-green-200 hover:bg-green-300 text-green-700'
                            : darkMode 
                              ? 'bg-purple-700 hover:bg-purple-600 text-purple-200' 
                              : 'bg-purple-200 hover:bg-purple-300 text-purple-700'
                        }`}
                        title={song.audioFileUrl ? "Manage audio" : "Add audio"}
                      >
                        <Music className="w-3 h-3 md:w-4 md:h-4" style={{ width: '12px', height: '12px' }} />
                      </button>
                    )}
                    <button
                      onClick={() => onSongSelect(song)}
                      className={`text-xs md:text-sm px-2 md:px-3 py-1 rounded transition-colors ${
                        darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                    >
                      View
                    </button>
                    <button
                      onClick={() => onEditSong(song)}
                      className={`text-xs md:text-sm px-2 md:px-3 py-1 rounded transition-colors ${
                        darkMode ? 'bg-blue-700 hover:bg-blue-600 text-blue-200' : 'bg-blue-200 hover:bg-blue-300 text-blue-700'
                      }`}
                    >
                      Edit
                    </button>
                    <ExportDropdown 
                      song={song}
                      onExportTxt={onExportTxt}
                      onExportPdf={onExportPdf}
                      darkMode={darkMode}
                    />
                    <button
                      onClick={() => onDeleteSong(song.id)}
                      className={`text-xs md:text-sm px-2 md:px-3 py-1 rounded transition-colors ${
                        darkMode 
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                          : 'bg-gray-200 hover:bg-gray-300 text-red-600'
                      }`}
                      title="Delete song"
                    >
                      <Trash2 className="w-3 h-3 md:w-4 md:h-4" style={{ width: '12px', height: '12px' }} />
                    </button>
                  </div>
                </div>

                {/* Audio Player - Show if song has audio and it's expanded */}
                {song.audioFileUrl && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <AudioPlayer
                      audioUrl={song.audioFileUrl}
                      audioFilename={song.audioFileName}
                      audioSize={song.audioFileSize}
                      audioDuration={song.audioDuration}
                      darkMode={darkMode}
                      onDownload={() => {
                        console.log('🎵 UploadTab onDownload wrapper called');
                        return onAudioDownload && onAudioDownload(song);
                      }}
                      onRemove={() => {
                        console.log('🎵 UploadTab onRemove wrapper called');
                        return onAudioRemove && onAudioRemove(song.id);
                      }}
                      onReplace={() => {
                        console.log('🎵 UploadTab onReplace wrapper called');
                        return setSelectedSongForAudio && setSelectedSongForAudio(song);
                      }}
                      showControls={true}
                      compact={false}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadTab;