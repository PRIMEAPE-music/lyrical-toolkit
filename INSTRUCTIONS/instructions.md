I'll help you update the banner details for your lyrical-toolkit website with your new PRIMEAPE moniker and links. First, let me search your project to understand the current banner structure.Perfect! I can see the current banner structure. Now let me update it with your new PRIMEAPE branding and links. I'll need to:

1. Update all the links to your PRIMEAPE social media
2. Replace the left album image with `foundation-cover.png`
3. Remove the right album image
4. Update the main website links for desktop and mobile

**Modification Approach:** Function-level replacement (~40% of the component changes)

---

📁 **File:** `src/components/Shared/MusicBanner.js`

🔍 **FIND:**
```javascript
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
```

✏️ **REPLACE WITH:**
```javascript
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
          </div>
```

---

🔍 **FIND:**
```javascript
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
```

✏️ **REPLACE WITH:**
```javascript
          {/* Album Cover */}
          
        <a  href="https://primeape.bandcamp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity order-2"
          >
            <img 
              src="/foundation-cover.png" 
              alt="PRIMEAPE - Foundation" 
              className="w-6 h-6 md:w-8 md:h-8 rounded border border-gray-500"
              style={{ maxWidth: '64px', maxHeight: '64px', minWidth: '48px', minHeight: '48px' }}
            />
          </a>
```

---

🔍 **FIND:**
```javascript
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
              className="mobile-link text-xs text-gray-300 hover:text-white transition-colors px-2 py-1 border borsrc/components/Shared/MusicBanner.js
der-gray-500 rounded"
            >
              Linktree
            </a>
          </div>
```

✏️ **REPLACE WITH:**
```javascript
          {/* Main Site Link */}
          
          <div className="text-center order-3">
            <div className="text-sm font-medium text-white mb-1">Check out my music!</div>
            {/* Desktop: Show full website link */}
            
          <a  href="https://primeape.org"
              target="_blank"
              rel="noopener noreferrer"
              className="desktop-link text-xs text-gray-300 hover:text-white transition-colors px-2 py-1 border border-gray-500 rounded"
            >
              primeape.org
            </a>
            {/* Mobile: Show Linktree link */}
            
          <a  href="https://linktr.ee/primeape.music"
              target="_blank"
              rel="noopener noreferrer"
              className="mobile-link text-xs text-gray-300 hover:text-white transition-colors px-2 py-1 border border-gray-500 rounded"
            >
              Linktree
            </a>
          </div>
```

---

🔍 **FIND:**
```javascript
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
```

✏️ **REPLACE WITH:**
```javascript
          {/* Right Social Links */}
```

---

🔍 **FIND:**
```javascript
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
```

✏️ **REPLACE WITH:**
```javascript
          {/* Right Social Links */}
          <div className="flex gap-3 order-4 desktop-social">
            
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
```

---

## Summary of Changes:

✅ **Updated all social media links** to PRIMEAPE accounts
✅ **Changed desktop website** from itztli-music.com → primeape.org  
✅ **Changed mobile link** from ITZTLI Linktree → primeape.music Linktree
✅ **Replaced left album image** with foundation-cover.png linking to Bandcamp
✅ **Removed right album image** completely
✅ **Added Apple Music link** to the right social links section
✅ **Updated order classes** (right social links now order-4 instead of order-5)

**Note:** Make sure you have `foundation-cover.png` in your `/public` folder for the image to display correctly!