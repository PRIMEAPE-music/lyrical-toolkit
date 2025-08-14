import React, { useRef, useState } from 'react';

const AudioPlayer = ({ src, onTimeUpdate }) => {
  const audioRef = useRef(null);
  const [progress, setProgress] = useState(0);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const { currentTime, duration } = audio;
    const percentage = (currentTime / duration) * 100;
    setProgress(isNaN(percentage) ? 0 : percentage);
    if (onTimeUpdate) {
      onTimeUpdate(currentTime, duration);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = percent * audioRef.current.duration;
    }
  };

  return (
    <div className="w-full">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        controls
        className="w-full mb-2"
      />
      <div
        className="w-full h-2 bg-gray-300 rounded cursor-pointer"
        onClick={handleSeek}
      >
        <div
          className="h-2 bg-blue-500 rounded"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default AudioPlayer;
