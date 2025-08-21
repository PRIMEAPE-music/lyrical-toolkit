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
            
          <a  href="https://open.spotify.com/artist/63oAAVGEpX2fnQC2eF0rbM"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Spotify
            </a>
            
          <a  href="https://www.youtube.com/@ITZTLI-music"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              YouTube
            </a>
          </div>

          {/* Album 1 */}
          
        <a  href="https://open.spotify.com/album/1unpOZdVAc4g0FraOafrDS?si=ig3-0gTVR2SBdzMVseUCsQ"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity order-2"
          >
            <img 
              src="/album1.png" 
              alt="Album 1" 
              className="w-6 h-6 md:w-8 md:h-8 rounded border border-gray-500"
              style={{ maxWidth: '64px', maxHeight: '64px', minWidth: '48px', minHeight: '48px' }}
            />
          </a>

          {/* Main Site Link */}
          
          <div className="text-center order-3">
            <div className="text-sm font-medium text-white mb-1">Check out my music!</div>
            {/* Desktop: Show full website link */}
            
          <a  href="https://itztli-music.com"
              target="_blank"
              rel="noopener noreferrer"
              className="desktop-link text-xs text-gray-300 hover:text-white transition-colors px-2 py-1 border border-gray-500 rounded"
            >
              itztli-music.com
            </a>
            {/* Mobile: Show Linktree link */}
            
          <a  href="https://linktr.ee/ITZTLI.music"
              target="_blank"
              rel="noopener noreferrer"
              className="mobile-link text-xs text-gray-300 hover:text-white transition-colors px-2 py-1 border border-gray-500 rounded"
            >
              Linktree
            </a>
          </div>

          {/* Album 2 */}
          
        <a  href="https://open.spotify.com/album/5DIJJcDNZJ9uqOhHC5hi3P"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity order-4"
          >
            <img 
              src="/album2.png" 
              alt="Album 2" 
              className="w-6 h-6 md:w-8 md:h-8 rounded border border-gray-500"
              style={{ maxWidth: '64px', maxHeight: '64px', minWidth: '48px', minHeight: '48px' }}
            />
          </a>

          {/* Right Social Links */}
          <div className="flex gap-3 order-5 desktop-social">
            
          <a  href="https://www.tiktok.com/@itztli.music?_t=zt-8vgi63vcwwp&_r=1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              TikTok
            </a>
            
          <a  href="https://www.instagram.com/itztli.music/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Instagram
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicBanner;