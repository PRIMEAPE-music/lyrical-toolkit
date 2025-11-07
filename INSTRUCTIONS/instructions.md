Perfect! I can see the current layout. Let me make those adjustments.

**Modification approach:** Targeted FIND/REPLACE (< 20% changes)

---

📁 **File:** `src/components/Shared/MusicBanner.js`

🔍 **FIND:**
```jsx
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

✏️ **REPLACE WITH:**
```jsx
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
```

---

🔍 **FIND:**
```jsx
            {/* Desktop: Show album with primeape.org link */}
            <a  href="https://primeape.org"
                target="_blank"
                rel="noopener noreferrer"
                className="desktop-link inline-block hover:opacity-80 transition-opacity"
              >
              <img
                src="/foundation-cover.png"
                alt="PRIMEAPE - Foundation"
                className="w-16 h-16 md:w-20 md:h-20 rounded border border-gray-500 mx-auto"
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
                className="w-16 h-16 md:w-20 md:h-20 rounded border border-gray-500 mx-auto"
              />
            </a>
```

✏️ **REPLACE WITH:**
```jsx
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
              />
            </a>
```

---

🔍 **FIND:**
```jsx
          {/* Right Social Links */}
          <div className="flex gap-3 order-3 desktop-social">

          <a  href="https://primeape.bandcamp.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Bandcamp
            </a>

          <a  href="https://tiktok.com/@primeape.music"
```

✏️ **REPLACE WITH:**
```jsx
          {/* Right Social Links */}
          <div className="flex gap-3 order-3 desktop-social">

          <a  href="https://tiktok.com/@primeape.music"
```

---

**Summary of changes:**
- ✅ Bandcamp moved to left side (after YouTube)
- ✅ Album art reduced from `w-16 h-16 md:w-20 md:h-20` to `w-8 h-8 md:w-10 md:h-10` (half the size)
- ✅ Bandcamp removed from right side