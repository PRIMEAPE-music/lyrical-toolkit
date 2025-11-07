import React, { useState } from 'react';
import { X } from 'lucide-react';

const MusicBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-gray-700 text-white py-3 px-4 relative">
      {/* Dismiss Button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 text-black hover:text-white transition-colors z-10 dismiss-button"
        title="Dismiss banner"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Banner Content */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          
          {/* Left Social Links */}
          <div className="flex gap-3 order-1 desktop-social">

          <a  href="https://open.spotify.com/artist/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Spotify
            </a>

          <a  href="https://youtube.com/@PRIMEAPE-music"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              YouTube
            </a>

          <a  href="https://primeape.bandcamp.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Bandcamp
            </a>
          </div>

        {/* Album Cover - Center, links to main site */}

          <div className="text-center order-2">
            <div className="text-sm font-medium text-white mb-1">Check out my music!</div>
            
            {/* Desktop: Show album with primeape.org link */}
            <a  href="https://primeape.org"
                target="_blank"
                rel="noopener noreferrer"
                className="desktop-link inline-block hover:opacity-80 transition-opacity"
              >
              <img
                src="/foundation-cover.png"
                alt="PRIMEAPE - Foundation"
                className="w-8 h-8 md:w-10 md:h-10 rounded border border-gray-500 mx-auto"
                style={{ maxWidth: '40px', maxHeight: '40px', width: '32px', height: '32px' }}
              />
            </a>

            {/* Mobile: Show album with Linktree link */}
            <a  href="https://linktr.ee/primeape.music"
                target="_blank"
                rel="noopener noreferrer"
                className="mobile-link inline-block hover:opacity-80 transition-opacity"
              >
              <img
                src="/foundation-cover.png"
                alt="PRIMEAPE - Foundation"
                className="w-8 h-8 md:w-10 md:h-10 rounded border border-gray-500 mx-auto"
                style={{ maxWidth: '40px', maxHeight: '40px', width: '32px', height: '32px' }}
              />
            </a>
          </div>

          {/* Right Social Links */}
          <div className="flex gap-3 order-3 desktop-social">

          <a  href="https://tiktok.com/@primeape.music"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              TikTok
            </a>

          <a  href="https://instagram.com/primeape.music"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Instagram
            </a>

          <a  href="https://music.apple.com/artist/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Apple Music
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicBanner;