import { useMemo } from 'react';

export const useSearch = (songs, searchQuery, highlightWord) => {
  // Enhanced search functionality - group by verse/paragraph
  const searchResults = useMemo(() => {
    const query = searchQuery || highlightWord;
    if (!query.trim()) return [];

    const results = [];
    
    // Check if query is wrapped in quotes for exact matching
    const isExactMatch = query.startsWith('"') && query.endsWith('"') && query.length > 2;
    const searchTerm = isExactMatch ? query.slice(1, -1) : query; // Remove quotes if present
    const searchLower = searchTerm.toLowerCase();

    songs.forEach(song => {
      // Ensure lyrics field exists with fallback to content
      const lyrics = song.lyrics || song.content || '';
      
      // Split lyrics into verses/paragraphs (separated by empty lines)
      const verses = lyrics.split(/\n\s*\n/).filter(verse => verse.trim());
      
      verses.forEach((verse, verseIndex) => {
        const lines = verse.split('\n').filter(line => line.trim());
        let verseHasMatch = false;
        let matchCount = 0;
        let firstMatchLine = -1;
        
        // Check if this verse contains any matches
        lines.forEach((line, lineIndex) => {
          let lineHasMatch = false;
          
          if (isExactMatch) {
            // Exact word matching - use word boundaries
            const wordRegex = new RegExp(`\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            const matches = line.match(wordRegex);
            if (matches) {
              lineHasMatch = true;
              matchCount += matches.length;
            }
          } else {
            // Regular substring matching
            const matches = line.toLowerCase().match(new RegExp(searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
            if (matches) {
              lineHasMatch = true;
              matchCount += matches.length;
            }
          }
          
          if (lineHasMatch && !verseHasMatch) {
            verseHasMatch = true;
            firstMatchLine = lineIndex;
          }
        });
        
        // If verse has matches, add it to results
        if (verseHasMatch) {
          // Calculate the actual line number in the full song
          let lineNumberInSong = 1;
          const versesBeforeCurrent = song.lyrics.split(/\n\s*\n/).slice(0, verseIndex);
          versesBeforeCurrent.forEach(prevVerse => {
            lineNumberInSong += prevVerse.split('\n').length + 1; // +1 for the empty line separator
          });
          lineNumberInSong += firstMatchLine;
          
          results.push({
            songId: song.id,
            songTitle: song.title,
            verseContent: verse,
            verseIndex: verseIndex + 1,
            lineNumber: lineNumberInSong,
            matchCount: matchCount,
            isExactMatch: isExactMatch
          });
        }
      });
    });

    return results;
  }, [searchQuery, highlightWord, songs]);

  return { searchResults };
};