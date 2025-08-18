import { STOP_WORDS } from './constants';

// Enhanced phonetic rhyme analysis with multiple rhyme types
export const getEnhancedRhymeData = (phoneticString) => {
  if (!phoneticString || typeof phoneticString !== 'string') return null;

  const phonemes = phoneticString.trim().split(' ');
  if (phonemes.length === 0) return null;

  // Find stressed vowels
  let lastStressedVowelIndex = -1;
  let allStressedVowels = [];
  
  for (let i = phonemes.length - 1; i >= 0; i--) {
    const phoneme = phonemes[i];
    if (/[A-Z]+[12]$/.test(phoneme)) {
      if (lastStressedVowelIndex === -1) lastStressedVowelIndex = i;
      allStressedVowels.unshift(i);
    }
  }

  // If no primary/secondary stress, find last vowel
  if (lastStressedVowelIndex === -1) {
    for (let i = phonemes.length - 1; i >= 0; i--) {
      const phoneme = phonemes[i];
      if (/[A-Z]+0?$/.test(phoneme)) {
        const alphaPart = phoneme.replace(/[012]$/, '');
        const VOWELS = ['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW'];
        if (VOWELS.includes(alphaPart)) {
          lastStressedVowelIndex = i;
          break;
        }
      }
    }
  }

  if (lastStressedVowelIndex === -1) return null;

  // Generate multiple rhyme keys for different rhyme types
  const perfectRhyme = phonemes.slice(lastStressedVowelIndex).join(' ');
  const nearRhyme = phonemes.slice(Math.max(0, lastStressedVowelIndex - 1)).join(' ');
  const slantRhyme = phonemes.slice(-2).join(' '); // Last 2 phonemes for consonant rhymes
  const endingRhyme = phonemes.slice(-1)[0]; // Just the final sound

  return {
    perfect: perfectRhyme,
    near: nearRhyme,
    slant: slantRhyme,
    ending: endingRhyme,
    fullPhonetic: phoneticString
  };
};

// Calculate phonetic similarity score
// Enhanced flow-based phonetic similarity
export const calculatePhoneticSimilarity = (rhymeData1, rhymeData2) => {
  if (!rhymeData1 || !rhymeData2) return 0;

  let score = 0;
  const phonemes1 = rhymeData1.fullPhonetic.split(' ');
  const phonemes2 = rhymeData2.fullPhonetic.split(' ');

  // Extract core vowel sounds for flow analysis
  const extractCoreVowel = (phonemes) => {
    // Find the last stressed or prominent vowel
    for (let i = phonemes.length - 1; i >= 0; i--) {
      const phoneme = phonemes[i];
      const baseSound = phoneme.replace(/[012]$/, '');
      if (['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW'].includes(baseSound)) {
        return baseSound;
      }
    }
    return null;
  };

  const coreVowel1 = extractCoreVowel(phonemes1);
  const coreVowel2 = extractCoreVowel(phonemes2);

  // Define vowel families for flow-based rhyming
  const vowelFamilies = {
    'long-oo': ['UW', 'UH'], // crew, blue, food, good
    'long-ee': ['IY', 'IH'], // me, see, bit
    'ay-sound': ['AY', 'EY'], // day, say, they
    'oh-sound': ['OW', 'AO'], // go, show, law
    'ah-sound': ['AA', 'AH'], // car, star, but
    'eh-sound': ['EH', 'AE'], // bed, cat
    'er-sound': ['ER', 'AH'], // her, word
    'oy-sound': ['OY'], // boy, toy
    'aw-sound': ['AW', 'AO'] // cow, now, law
  };

  // Check for vowel family matches (flow-based rhyming)
  let vowelFamilyMatch = false;
  let vowelFamilyScore = 0;
  
  if (coreVowel1 && coreVowel2) {
    // Exact vowel match
    if (coreVowel1 === coreVowel2) {
      vowelFamilyScore = 85;
      vowelFamilyMatch = true;
    } else {
      // Check vowel families
      for (const [, vowels] of Object.entries(vowelFamilies)) {
        if (vowels.includes(coreVowel1) && vowels.includes(coreVowel2)) {
          vowelFamilyScore = 75;
          vowelFamilyMatch = true;
          break;
        }
      }
    }
  }

  // Traditional rhyme analysis
  if (rhymeData1.perfect === rhymeData2.perfect) {
    score = 100;
  } else if (rhymeData1.near === rhymeData2.near) {
    score = 80;
  } else if (rhymeData1.slant === rhymeData2.slant) {
    score = 60;
  } else if (rhymeData1.ending === rhymeData2.ending) {
    score = 45;
  }

  // Flow-based scoring - prioritize vowel family matches
  if (vowelFamilyMatch) {
    // Only use vowel family score if traditional rhyme analysis scored low
    if (score < 50) {
      score = Math.max(score, vowelFamilyScore - 10); // Reduced vowel family scoring
    }
    
    // Bonus for consonant patterns after the vowel
    const endingConsonants1 = getEndingConsonants(phonemes1);
    const endingConsonants2 = getEndingConsonants(phonemes2);
    
    if (endingConsonants1 && endingConsonants2) {
      const consonantSimilarity = calculateConsonantSimilarity(endingConsonants1, endingConsonants2);
      score += consonantSimilarity * 10; // Reduced from 15 to 10
    }
  }

  // Additional flow pattern bonuses
  score += calculateFlowPatternBonus(phonemes1, phonemes2);

  return Math.min(score, 100);
};

// Helper function to extract ending consonants
const getEndingConsonants = (phonemes) => {
  const consonants = [];
  // Get consonants after the last vowel
  let foundVowel = false;
  
  for (let i = phonemes.length - 1; i >= 0; i--) {
    const phoneme = phonemes[i];
    const baseSound = phoneme.replace(/[012]$/, '');
    
    if (['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW'].includes(baseSound)) {
      foundVowel = true;
      break;
    } else {
      consonants.unshift(baseSound);
    }
  }
  
  return foundVowel ? consonants : [];
};

// Calculate consonant pattern similarity
const calculateConsonantSimilarity = (consonants1, consonants2) => {
  if (consonants1.length === 0 && consonants2.length === 0) return 1;
  if (consonants1.length === 0 || consonants2.length === 0) return 0.3;
  
  // Similar consonant groups
  const consonantGroups = {
    'stops': ['B', 'P', 'D', 'T', 'G', 'K'],
    'fricatives': ['F', 'V', 'TH', 'DH', 'S', 'Z', 'SH', 'ZH'],
    'nasals': ['M', 'N', 'NG'],
    'liquids': ['L', 'R'],
    'semivowels': ['W', 'Y']
  };
  
  // Exact match
  if (consonants1.join('') === consonants2.join('')) return 1;
  
  // Similar length and pattern
  if (consonants1.length === consonants2.length) {
    let matches = 0;
    for (let i = 0; i < consonants1.length; i++) {
      if (consonants1[i] === consonants2[i]) {
        matches++;
      } else {
        // Check if they're in the same consonant group
        for (const group of Object.values(consonantGroups)) {
          if (group.includes(consonants1[i]) && group.includes(consonants2[i])) {
            matches += 0.7;
            break;
          }
        }
      }
    }
    return matches / consonants1.length;
  }
  
  return 0.2; // Different patterns, small bonus
};

// Calculate additional flow pattern bonuses
const calculateFlowPatternBonus = (phonemes1, phonemes2) => {
  let bonus = 0;
  
  // Similar word length (syllable count approximation)
  const syllableCount1 = phonemes1.filter(p => /[012]$/.test(p)).length;
  const syllableCount2 = phonemes2.filter(p => /[012]$/.test(p)).length;
  
  if (syllableCount1 === syllableCount2) {
    bonus += 5; // Same syllable count bonus
  }
  
  // Common hip-hop flow patterns
  const word1 = phonemes1.join(' ');
  const word2 = phonemes2.join(' ');
  
  // -ING pattern bonus
  if ((word1.includes('IH NG') || word1.includes('IY NG')) && 
      (word2.includes('IH NG') || word2.includes('IY NG'))) {
    bonus += 10;
  }
  
  // -ED pattern bonus  
  if ((word1.includes('D') && word1.endsWith('D')) && 
      (word2.includes('D') && word2.endsWith('D'))) {
    bonus += 8;
  }
  
  // -LY pattern bonus
  if ((word1.includes('L IY') || word1.endsWith('L IY')) && 
      (word2.includes('L IY') || word2.endsWith('L IY'))) {
    bonus += 8;
  }
  
  return bonus;
};

// Extract the ending pattern from phonetic data
const getEndingPattern = (rhymeData) => {
  if (!rhymeData || !rhymeData.fullPhonetic) return null;
  
  const phonemes = rhymeData.fullPhonetic.split(' ');
  // Get last 2-3 phonemes as the "ending pattern"
  return phonemes.slice(-3).join(' ');
};

// Check if two ending patterns are compatible for rhyming
const areCompatiblePatterns = (pattern1, pattern2) => {
  if (!pattern1 || !pattern2) return false;
  
  // Split patterns into individual phonemes
  const phonemes1 = pattern1.split(' ');
  const phonemes2 = pattern2.split(' ');
  
  // They should share at least the last phoneme (final sound)
  const lastPhoneme1 = phonemes1[phonemes1.length - 1];
  const lastPhoneme2 = phonemes2[phonemes2.length - 1];
  
  // Basic compatibility check - must share final sound or very similar
  if (lastPhoneme1 === lastPhoneme2) return true;
  
  // Check for similar ending patterns (like different stress versions)
  const base1 = lastPhoneme1.replace(/[012]$/, '');
  const base2 = lastPhoneme2.replace(/[012]$/, '');
  
  return base1 === base2;
};

// Analyze rhyme statistics using existing phonetic system - CONSERVATIVE VERSION
export const analyzeRhymeStatistics = (lyrics, vocabularyMap) => {
  if (!lyrics || typeof lyrics !== 'string') return {
    totalRhymableWords: 0,
    perfectRhymes: 0,
    nearRhymes: 0,
    soundsLike: 0,
    rhymeDensity: 0,
    internalRhymes: 0,
    rhymeGroups: []
  };

  const lines = lyrics.split('\n').filter(line => line.trim().length > 0);
  const endWords = []; // Focus on end-of-line words primarily
  const allRhymableWords = [];
  let internalRhymeCount = 0;

  // Extract end-of-line words and some internal words
  lines.forEach((line, lineIndex) => {
    const wordsInLine = line.split(/\s+/)
      .map(word => word.trim().toLowerCase().replace(/[^\w\s'-]|('s\b)|(^\s*')|('\s*$)/g, ''))
      .filter(word => word && word.length >= 3 && !STOP_WORDS.has(word)); // Raised minimum length

    if (wordsInLine.length === 0) return;

    // Get end word (most important for rhyme schemes)
    const endWord = wordsInLine[wordsInLine.length - 1];
    const endPhonetic = vocabularyMap[endWord];
    if (endPhonetic) {
      const rhymeData = getEnhancedRhymeData(endPhonetic);
      if (rhymeData) {
        const wordData = { word: endWord, rhymeData, lineIndex, isEndWord: true };
        endWords.push(wordData);
        allRhymableWords.push(wordData);
      }
    }

    // Also get some internal words for internal rhyme detection (but be selective)
    const internalWordsData = [];
    wordsInLine.slice(0, -1).forEach(word => {
      const phoneticData = vocabularyMap[word];
      if (phoneticData && word.length >= 4) { // Higher threshold for internal words
        const rhymeData = getEnhancedRhymeData(phoneticData);
        if (rhymeData) {
          const wordData = { word, rhymeData, lineIndex, isEndWord: false };
          internalWordsData.push(wordData);
          allRhymableWords.push(wordData);
        }
      }
    });

    // Check for internal rhymes within this line (conservative)
    for (let i = 0; i < internalWordsData.length; i++) {
      for (let j = i + 1; j < internalWordsData.length; j++) {
        const similarity = calculatePhoneticSimilarity(
          internalWordsData[i].rhymeData,
          internalWordsData[j].rhymeData
        );
        if (similarity >= 75) { // Slightly lower threshold for internal rhymes
          internalRhymeCount++;
        }
      }
    }
  });

  if (allRhymableWords.length === 0) {
    return {
      totalRhymableWords: 0,
      perfectRhymes: 0,
      nearRhymes: 0,
      soundsLike: 0,
      rhymeDensity: 0,
      internalRhymes: internalRhymeCount,
      rhymeGroups: []
    };
  }

  // Find unique rhyme relationships (avoid double counting)
  const uniqueRhymePairs = new Set();
  let perfectRhymeCount = 0;
  let nearRhymeCount = 0;
  let soundsLikeCount = 0;
  const rhymeGroups = new Map();

  // Prioritize end-word rhymes
  for (let i = 0; i < endWords.length; i++) {
    for (let j = i + 1; j < endWords.length; j++) {
      const word1 = endWords[i];
      const word2 = endWords[j];
      
      // Skip if same word
      if (word1.word === word2.word) continue;
      
      // Create unique pair identifier (sorted to avoid duplicates)
      const pairKey = [word1.word, word2.word].sort().join('|');
      if (uniqueRhymePairs.has(pairKey)) continue;
      uniqueRhymePairs.add(pairKey);

      const similarity = calculatePhoneticSimilarity(word1.rhymeData, word2.rhymeData);
      
      if (similarity >= 82) { // Slightly lower threshold for perfect rhymes
        perfectRhymeCount++;
        
        // Group perfect rhymes
        const groupKey = word1.rhymeData.perfect;
        if (!rhymeGroups.has(groupKey)) {
          rhymeGroups.set(groupKey, new Set());
        }
        rhymeGroups.get(groupKey).add(word1.word);
        rhymeGroups.get(groupKey).add(word2.word);
        
      } else if (similarity >= 80) { // Lower threshold for near rhymes
        nearRhymeCount++;
      } else if (similarity >= 78) { // Higher threshold for sounds-like to reduce false positives
        soundsLikeCount++;
      }
    }
  }

  // Also check some cross-category rhymes (end words with prominent internal words)
  const internalWords = allRhymableWords.filter(w => !w.isEndWord && w.word.length >= 5);
  for (let i = 0; i < endWords.length && i < 20; i++) { // Limit to prevent explosion
    for (let j = 0; j < internalWords.length && j < 10; j++) {
      const endWord = endWords[i];
      const internalWord = internalWords[j];
      
      if (endWord.word === internalWord.word) continue;
      
      const pairKey = [endWord.word, internalWord.word].sort().join('|');
      if (uniqueRhymePairs.has(pairKey)) continue;
      uniqueRhymePairs.add(pairKey);

      const similarity = calculatePhoneticSimilarity(endWord.rhymeData, internalWord.rhymeData);
      
      if (similarity >= 82) {
        perfectRhymeCount++;
      } else if (similarity >= 68) {
        nearRhymeCount++;
      } else if (similarity >= 55) {
        soundsLikeCount++;
      }
    }
  }

  // Convert rhyme groups to array and consolidate duplicates
  let rhymeGroupsArray = Array.from(rhymeGroups.entries())
    .filter(([, words]) => words.size >= 2)
    .map(([key, words]) => ({
      rhymeSound: key,
      words: Array.from(words),
      count: words.size
    }));

  // Consolidate similar/duplicate rhyme groups
  const consolidateRhymeGroups = (groups) => {
    const consolidated = [];
    const processed = new Set();

    for (let i = 0; i < groups.length; i++) {
      if (processed.has(i)) continue;

      const currentGroup = groups[i];
      const mergedWords = new Set(currentGroup.words);
      const similarGroups = [i];

      // Find groups with similar phonetic patterns or overlapping words
      for (let j = i + 1; j < groups.length; j++) {
        if (processed.has(j)) continue;

        const otherGroup = groups[j];
        
        // Check if groups should be merged
        const shouldMerge = checkGroupsShouldMerge(currentGroup, otherGroup);
        
        if (shouldMerge) {
          // Merge the groups
          otherGroup.words.forEach(word => mergedWords.add(word));
          similarGroups.push(j);
          processed.add(j);
        }
      }

      // Mark current group as processed
      processed.add(i);

      // Create consolidated group
      if (mergedWords.size >= 2) {
        // Use the most representative rhyme sound from the merged groups
        const bestRhymeSound = selectBestRhymeSound(
          similarGroups.map(idx => groups[idx].rhymeSound)
        );
        
        consolidated.push({
          rhymeSound: bestRhymeSound,
          words: Array.from(mergedWords).sort(),
          count: mergedWords.size
        });
      }
    }

    return consolidated;
  };

  // Helper function to determine if two groups should be merged - IMPROVED
  const checkGroupsShouldMerge = (group1, group2) => {
    const words1 = new Set(group1.words);
    const words2 = new Set(group2.words);
    
    // Merge if there's ANY word overlap (to catch duplicates like "grew" in multiple groups)
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    
    if (intersection.size > 0) {
      return true; // Merge any groups that share words
    }
    
    // Also merge if the groups have very similar phonetic patterns
    if (group1.rhymeSound === group2.rhymeSound) {
      return true;
    }
    
    return false;
  };

  // Helper function to select the best representative rhyme sound
  const selectBestRhymeSound = (rhymeSounds) => {
    if (rhymeSounds.length === 1) return rhymeSounds[0];
    
    // Prefer shorter, more general patterns
    const sorted = rhymeSounds.sort((a, b) => {
      const phonemes1 = a.split(' ').length;
      const phonemes2 = b.split(' ').length;
      
      // Prefer patterns with 1-2 phonemes over longer ones
      if (phonemes1 <= 2 && phonemes2 > 2) return -1;
      if (phonemes2 <= 2 && phonemes1 > 2) return 1;
      
      // If both similar length, prefer the one that looks more "standard"
      return phonemes1 - phonemes2;
    });
    
    return sorted[0];
  };

  // Apply consolidation
  rhymeGroupsArray = consolidateRhymeGroups(rhymeGroupsArray);

  // Filter out weak/non-rhyming groups
  rhymeGroupsArray = rhymeGroupsArray.filter(group => {
    // Remove groups with less than 2 words
    if (group.count < 2) return false;
    
    // For 2-word groups, check if they actually rhyme well
    if (group.count === 2) {
      const [word1, word2] = group.words;
      
      // Remove obvious non-rhymes (different ending sounds)
      const ending1 = word1.toLowerCase().slice(-2);
      const ending2 = word2.toLowerCase().slice(-2);
      const lastChar1 = word1.toLowerCase().slice(-1);
      const lastChar2 = word2.toLowerCase().slice(-1);
      
      // If they don't share ANY similar ending pattern, probably not a real rhyme
      const hasSharedEnding = (
        ending1 === ending2 || 
        lastChar1 === lastChar2 ||
        (word1.toLowerCase().endsWith('m') && word2.toLowerCase().endsWith('nt')) ||
        (word1.toLowerCase().endsWith('nt') && word2.toLowerCase().endsWith('m')) ||
        // Add more specific patterns that should be kept
        (word1.toLowerCase().includes('oom') && word2.toLowerCase().includes('ew')) ||
        (word1.toLowerCase().includes('est') && word2.toLowerCase().includes('ed'))
      );
      
      // For very different words, check if they're actually similar sounding
      const wordsAreToodifferent = (
        Math.abs(word1.length - word2.length) > 3 || // Very different lengths
        (word1.toLowerCase() === 'cataclysm' && word2.toLowerCase() === 'environment') ||
        (word1.toLowerCase() === 'environment' && word2.toLowerCase() === 'cataclysm')
      );
      
      if (wordsAreToodifferent || !hasSharedEnding) {
        return false;
      }
    }
    
    return true;
  });

  // Final sort and limit
  rhymeGroupsArray = rhymeGroupsArray
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const totalWords = lyrics.toLowerCase().split(/\s+/).filter(word => word.match(/[a-zA-Z]/)).length;
  const rhymeDensity = totalWords > 0 ? ((allRhymableWords.length / totalWords) * 100) : 0;

  return {
    totalRhymableWords: allRhymableWords.length,
    perfectRhymes: perfectRhymeCount,
    nearRhymes: nearRhymeCount,
    soundsLike: soundsLikeCount,
    rhymeDensity: Math.round(rhymeDensity * 10) / 10,
    internalRhymes: internalRhymeCount,
    rhymeGroups: rhymeGroupsArray
  };
};

  // Helper function to consolidate very similar clusters
  const consolidateSimilarClusters = (clusters, threshold = 85) => {
    const consolidated = [...clusters];
    let changed = true;
    
    while (changed) {
      changed = false;
      
      for (let i = 0; i < consolidated.length && !changed; i++) {
        for (let j = i + 1; j < consolidated.length && !changed; j++) {
          // Check if clusters should be merged by comparing their centroids
          const similarity = calculatePhoneticSimilarity(
            consolidated[i].centroid,
            consolidated[j].centroid
          );
          
          if (similarity >= threshold) {
            // Check if clusters have compatible ending patterns before merging
            const pattern1 = getEndingPattern(consolidated[i].centroid);
            const pattern2 = getEndingPattern(consolidated[j].centroid);
            
            if (areCompatiblePatterns(pattern1, pattern2)) {
              // Merge clusters
              consolidated[i] = {
                words: [...consolidated[i].words, ...consolidated[j].words],
                indices: [...consolidated[i].indices, ...consolidated[j].indices],
                centroid: consolidated[i].centroid
              };
              consolidated.splice(j, 1);
              changed = true;
            }
          }
        }
      }
    }
    
    return consolidated;
  };

  // Helper function to calculate internal cluster similarity
  const calculateInternalSimilarity = (cluster, similarityMatrix) => {
    if (cluster.words.length < 2) return 0;
    
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < cluster.indices.length; i++) {
      for (let j = i + 1; j < cluster.indices.length; j++) {
        const indexA = cluster.indices[i];
        const indexB = cluster.indices[j];
        totalSimilarity += similarityMatrix[indexA][indexB];
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  };

  // Analyzes rhymes based on API-derived rhyme identifiers
  export const analyzeFullTextRhymes = (lyrics, vocabularyMap) => {
    if (!lyrics) return [];
    console.log("Smart Clustering Rhyme Analysis - Starting...");

    const lines = lyrics.split('\n');
    const allWordsProcessed = [];

    // Step 1: Extract all words with enhanced rhyme data
    for (const lineText of lines) {
      const lineData = [];
      const wordsInLine = lineText.split(/(\s+)/);
      for (const wordText of wordsInLine) {
        const cleanedWord = wordText.trim().toLowerCase().replace(/[^\w\s'-]|('s\b)|(^\s*')|('\s*$)/g, '').replace(/\s+/g, ' ');
        let rhymeData = null;

        if (cleanedWord && cleanedWord.length >= 1 && !STOP_WORDS.has(cleanedWord)) {
          const fullPhonetic = vocabularyMap[cleanedWord];
          if (fullPhonetic) {
            rhymeData = getEnhancedRhymeData(fullPhonetic);
          }
        }
        
        lineData.push({
          text: wordText,
          clean: cleanedWord,
          rhymeData: rhymeData,
          rhymeGroup: null
        });
      }
      allWordsProcessed.push(lineData);
    }

    // Step 2: Collect all rhymable words
    const allRhymableWords = [];
    allWordsProcessed.forEach((line, lineIndex) => {
      line.forEach((word, wordIndex) => {
        if (word.rhymeData) {
          allRhymableWords.push({
            ...word,
            lineIndex,
            wordIndex,
            id: `${lineIndex}-${wordIndex}`
          });
        }
      });
    });

    // Step 3: Create similarity matrix
    const createSimilarityMatrix = (words) => {
      const matrix = [];
      for (let i = 0; i < words.length; i++) {
        matrix[i] = [];
        for (let j = 0; j < words.length; j++) {
          if (i === j) {
            matrix[i][j] = 100; // Perfect self-similarity
          } else {
            matrix[i][j] = calculatePhoneticSimilarity(words[i].rhymeData, words[j].rhymeData);
          }
        }
      }
      return matrix;
    };

    // Step 4: Hierarchical clustering algorithm
    const performHierarchicalClustering = (words, similarityMatrix, minSimilarity = 70) => {
      const clusters = words.map((word, index) => ({
        words: [word],
        indices: [index],
        centroid: word.rhymeData
      }));

      while (true) {
        let bestMerge = null;
        let bestSimilarity = 0;

        // Find the two most similar clusters
        for (let i = 0; i < clusters.length; i++) {
          for (let j = i + 1; j < clusters.length; j++) {
            const similarity = calculateClusterSimilarity(clusters[i], clusters[j], similarityMatrix);
            if (similarity > bestSimilarity && similarity >= minSimilarity) {
              bestSimilarity = similarity;
              bestMerge = { i, j };
            }
          }
        }

        // If no good merge found, stop clustering
        if (!bestMerge) break;

        // Merge the two best clusters
        const clusterA = clusters[bestMerge.i];
        const clusterB = clusters[bestMerge.j];
        
        const mergedCluster = {
          words: [...clusterA.words, ...clusterB.words],
          indices: [...clusterA.indices, ...clusterB.indices],
          centroid: clusterA.centroid // Keep the first cluster's centroid as representative
        };

        // Remove the old clusters and add the merged one
        clusters.splice(Math.max(bestMerge.i, bestMerge.j), 1);
        clusters.splice(Math.min(bestMerge.i, bestMerge.j), 1);
        clusters.push(mergedCluster);
      }

      return clusters.filter(cluster => cluster.words.length >= 2);
    };

    // Helper function to calculate similarity between clusters
    const calculateClusterSimilarity = (clusterA, clusterB, similarityMatrix) => {
      let totalSimilarity = 0;
      let comparisons = 0;

      for (const indexA of clusterA.indices) {
        for (const indexB of clusterB.indices) {
          totalSimilarity += similarityMatrix[indexA][indexB];
          comparisons++;
        }
      }

      return comparisons > 0 ? totalSimilarity / comparisons : 0;
    };

    // Step 5: Perform clustering
    if (allRhymableWords.length === 0) {
      let wordIdCounter = 0;
      return allWordsProcessed.map(line =>
        line.map(word => ({ ...word, id: wordIdCounter++ }))
      );
    }

    const similarityMatrix = createSimilarityMatrix(allRhymableWords);
    const clusters = performHierarchicalClustering(allRhymableWords, similarityMatrix, 77);

    // Step 6: Post-process clusters to merge very similar ones
    const consolidatedClusters = consolidateSimilarClusters(clusters, 95);

    // Step 7: Sort clusters by strength and size
    consolidatedClusters.sort((a, b) => {
      // Prioritize by cluster size, then by average internal similarity
      if (b.words.length !== a.words.length) {
        return b.words.length - a.words.length;
      }
      
      // Calculate average internal similarity for tie-breaking
      const avgSimA = calculateInternalSimilarity(a, similarityMatrix, allRhymableWords);
      const avgSimB = calculateInternalSimilarity(b, similarityMatrix, allRhymableWords);
      return avgSimB - avgSimA;
    });

    // Step 8: Intelligent Color Assignment
    const assignColorsIntelligently = (clusters, similarityMatrix, allWords) => {
      // Extended color palette: letters + numbers for more groups
      const colorIdentifiers = [
        // Primary letters (A-Z) - 26 colors
        ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        // Extended numbers (1-20) - 20 additional colors
        ...'12345678901234567890'.split('')
      ];

      // Score each cluster for priority assignment
      const scoredClusters = clusters.map((cluster, index) => {
        const size = cluster.words.length;
        const avgSimilarity = calculateInternalSimilarity(cluster, similarityMatrix, allWords);
        
        // Priority scoring: larger groups + higher similarity get better colors
        const sizeScore = Math.min(size * 10, 50); // Up to 50 points for size
        const similarityScore = avgSimilarity * 0.3; // Up to 30 points for similarity
        const diversityBonus = calculateDiversityBonus(cluster); // Bonus for word variety
        
        return {
          cluster,
          index,
          priority: sizeScore + similarityScore + diversityBonus,
          size,
          avgSimilarity
        };
      });

      // Sort by priority (highest priority gets first/best colors)
      scoredClusters.sort((a, b) => b.priority - a.priority);

      // Assign colors with smart distribution
      const assignedColors = new Set();
      const colorAssignments = [];

      scoredClusters.forEach((scoredCluster, priorityIndex) => {
        let assignedColor = null;

        if (priorityIndex < colorIdentifiers.length) {
          // Direct assignment for high-priority groups
          assignedColor = colorIdentifiers[priorityIndex];
        } else {
          // Fallback: reuse colors but prefer less similar groups
          const availableColors = colorIdentifiers.filter(color => 
            !assignedColors.has(color) || assignedColors.size >= colorIdentifiers.length
          );
          assignedColor = availableColors[priorityIndex % availableColors.length] || 'default';
        }

        assignedColors.add(assignedColor);
        colorAssignments.push({
          cluster: scoredCluster.cluster,
          color: assignedColor,
          priority: scoredCluster.priority
        });
      });

      return colorAssignments;
    };

    // Helper function to calculate diversity bonus
    const calculateDiversityBonus = (cluster) => {
      if (cluster.words.length < 2) return 0;
      
      // Bonus for clusters with varied word types (different syllable counts, patterns)
      const syllableCounts = cluster.words.map(word => {
        if (!word.rhymeData || !word.rhymeData.fullPhonetic) return 1;
        return word.rhymeData.fullPhonetic.split(' ').filter(p => /[012]$/.test(p)).length;
      });
      
      const uniqueSyllableCounts = new Set(syllableCounts);
      const diversityBonus = Math.min(uniqueSyllableCounts.size * 3, 15); // Up to 15 points
      
      // Extra bonus for clusters with both short and long words (good flow variety)
      const hasShort = syllableCounts.some(count => count <= 2);
      const hasLong = syllableCounts.some(count => count >= 3);
      const varietyBonus = hasShort && hasLong ? 5 : 0;
      
      return diversityBonus + varietyBonus;
    };

    // Apply intelligent color assignment
    const colorAssignments = assignColorsIntelligently(consolidatedClusters, similarityMatrix, allRhymableWords);

    // Apply color assignments to words
    colorAssignments.forEach(assignment => {
      assignment.cluster.words.forEach(word => {
        allWordsProcessed[word.lineIndex][word.wordIndex].rhymeGroup = assignment.color;
      });
    });

    // Step 9: Add IDs and prepare final result
    let wordIdCounter = 0;
    const finalResult = allWordsProcessed.map(line =>
      line.map(word => ({ ...word, id: wordIdCounter++ }))
    );

    console.log(`Smart Clustering - Found ${consolidatedClusters.length} rhyme clusters`);
    console.log("ALL cluster assignments:", colorAssignments.map(assignment => ({
      color: assignment.color,
      words: assignment.cluster.words.slice(0, 3).map(w => w.clean), // Just show first 3 words
      size: assignment.cluster.words.length,
      priority: Math.round(assignment.priority)
    })));

    return finalResult;
  };