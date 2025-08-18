// Improved syllable counter
export const countSyllables = (word) => {
  if (!word || typeof word !== 'string') return 0;
  
  word = word.toLowerCase().trim();
  if (word.length === 0) return 0;
  if (word.length <= 2) return 1;
  
  // Remove common word endings that don't add syllables
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  
  // Count vowel groups
  let syllableCount = 0;
  let previousWasVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    const isVowel = /[aeiouy]/.test(char);
    
    if (isVowel && !previousWasVowel) {
      syllableCount++;
    }
    previousWasVowel = isVowel;
  }
  
  // Handle special cases
  if (word.endsWith('le') && word.length > 2 && !/[aeiouy]/.test(word[word.length - 3])) {
    syllableCount++;
  }
  
  return Math.max(1, syllableCount);
};

// Calculate reading level using Flesch-Kincaid Grade Level formula
export const calculateReadingLevel = (lyrics) => {
  if (!lyrics || typeof lyrics !== 'string') return 0;
  
  // Split into sentences - be more strict about what counts as a sentence
  const sentences = lyrics.split(/[.!?]+/).filter(s => s.trim().length > 5); // Minimum 5 chars per sentence
  const words = lyrics.toLowerCase().split(/\s+/).filter(word => word.match(/[a-zA-Z]/));
  const cleanWords = words.map(word => word.replace(/[^\w]/g, '')).filter(word => word.length > 0);
  
  // Need minimum thresholds for meaningful calculation
  if (sentences.length === 0 || cleanWords.length === 0) return 0;
  if (sentences.length < 2) return Math.min(cleanWords.length * 0.5, 12); // Very short texts
  
  const totalSyllables = cleanWords.reduce((sum, word) => sum + countSyllables(word), 0);
  const avgWordsPerSentence = cleanWords.length / sentences.length;
  const avgSyllablesPerWord = totalSyllables / cleanWords.length;
  
  // Flesch-Kincaid Grade Level formula
  let gradeLevel = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;
  
  // Apply realistic bounds - most texts should fall between 1-20
  gradeLevel = Math.max(1, Math.min(20, gradeLevel));
  
  // Round to 1 decimal place
  return Math.round(gradeLevel * 10) / 10;
};

// Calculate vocabulary complexity score
export const calculateVocabularyComplexity = (lyrics, wordFrequencies) => {
  if (!lyrics || typeof lyrics !== 'string') return 0;
  
  const words = lyrics.toLowerCase().split(/\s+/)
    .map(word => word.replace(/[^\w]/g, ''))
    .filter(word => word.length > 0);
  
  if (words.length === 0) return 0;
  
  let complexityScore = 0;
  
  words.forEach(word => {
    const syllables = countSyllables(word);
    const length = word.length;
    const frequency = wordFrequencies[word] || 1;
    const rarity = 1 / frequency; // Less frequent words are more complex
    
    // Weighted complexity: syllables (40%), length (30%), rarity (30%)
    const wordComplexity = (syllables * 0.4) + (length * 0.3) + (rarity * 0.3);
    complexityScore += wordComplexity;
  });
  
  return Math.round((complexityScore / words.length) * 10) / 10; // Average complexity per word
};

export const analyzeMeter = (lyrics) => {
  try {
    if (!lyrics || typeof lyrics !== 'string') {
      return [];
    }
    
    const lines = lyrics.split('\n').filter(line => line.trim());
    const analysis = lines.map(line => {
      const words = line.trim().split(/\s+/).filter(word => word.length > 0);
      const syllableCounts = words.map(word => countSyllables(word.replace(/[^\w]/g, '')));
      const totalSyllables = syllableCounts.reduce((sum, count) => sum + count, 0);
      
      return {
        line: line,
        syllables: totalSyllables,
        words: words.length,
        syllableBreakdown: syllableCounts
      };
    });
    
    return analysis;
  } catch (error) {
    console.error('Error analyzing meter:', error);
    return [];
  }
};

// Generate rhyming dictionary from user's lyrics
export const generateRhymingDictionary = (songs) => {
  const rhymeDict = {};
  
  songs.forEach(song => {
    const words = song.lyrics.toLowerCase()
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length > 2);
    
    words.forEach(word => {
      const rhymeKey = word.slice(-2); // Last 2 characters for simple rhyming
      if (!rhymeDict[rhymeKey]) {
        rhymeDict[rhymeKey] = new Set();
      }
      rhymeDict[rhymeKey].add(word);
    });
  });
  
  // Convert Sets to Arrays and filter groups with 2+ words
  const filteredDict = {};
  Object.entries(rhymeDict).forEach(([key, wordSet]) => {
    const words = Array.from(wordSet);
    if (words.length >= 2) {
      filteredDict[key] = words.sort();
    }
  });
  
  return filteredDict;
};

// Word frequency analysis
export const generateWordFrequencyReport = (songs) => {
  const wordFreq = {};
  const totalWords = songs.reduce((sum, song) => sum + song.wordCount, 0);
  
  songs.forEach(song => {
    const words = song.lyrics.toLowerCase()
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length > 2);
    
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
  });

  const sortedWords = Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .map(([word, count]) => ({
      word,
      count,
      percentage: ((count / totalWords) * 100).toFixed(2)
    }));
  
  return {
    totalUniqueWords: Object.keys(wordFreq).length,
    totalWords,
    topWords: sortedWords.slice(0, 50),
    allWords: sortedWords
  };
};

// Clean highlight function with exact match support
export const highlightText = (text, query, isExactMatch = false) => {
  if (!query || !text) {
    return text;
  }
  
  // Remove quotes if present
  let searchTerm = query.toString().trim();
  if (searchTerm.startsWith('"') && searchTerm.endsWith('"') && searchTerm.length > 2) {
    searchTerm = searchTerm.slice(1, -1);
  }
  
  // Create regex based on exact match or not
  const regexPattern = isExactMatch 
    ? `\\b(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`  // Word boundaries for exact match
    : `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`;        // No boundaries for substring match
  
  const regex = new RegExp(regexPattern, 'gi');
  
  // Check if there are matches
  if (!regex.test(text)) {
    return text;
  }
  
  // Reset regex and split
  regex.lastIndex = 0;
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    const testRegex = new RegExp(regexPattern, 'gi');
    if (testRegex.test(part)) {
      return (
        <span 
          key={index}
          style={{
            backgroundColor: isExactMatch ? '#fed7aa' : '#fdba74',  // Different shades for exact vs substring
            color: '#9a3412',
            padding: '2px 4px',
            fontWeight: 'bold',
            borderRadius: '3px'
          }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

// Enhanced stress pattern detection using phonetic data and English stress rules
export const detectStressPattern = (word, phoneticData = null) => {
  if (!word || typeof word !== 'string') return [];
  
  const syllableCount = countSyllables(word);
  if (syllableCount <= 1) return syllableCount === 1 ? ['1'] : [];
  
  // If we have phonetic data, use it for more accurate stress detection
  if (phoneticData && typeof phoneticData === 'string') {
    const phonemes = phoneticData.split(' ');
    const stressPattern = [];
    
    phonemes.forEach(phoneme => {
      if (/[12]$/.test(phoneme)) { // Primary or secondary stress
        stressPattern.push(phoneme.endsWith('1') ? '1' : '2');
      } else if (/0$/.test(phoneme)) { // Unstressed
        stressPattern.push('0');
      }
    });
    
    if (stressPattern.length > 0) return stressPattern;
  }
  
  // Fallback to rule-based stress detection for English
  const stresses = [];
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
  
  // Common English stress patterns
  if (syllableCount === 2) {
    // Most 2-syllable nouns: first syllable stressed
    // Most 2-syllable verbs: second syllable stressed
    if (cleanWord.endsWith('ing') || cleanWord.endsWith('ed') || cleanWord.endsWith('er')) {
      stresses.push('1', '0');
    } else if (cleanWord.endsWith('tion') || cleanWord.endsWith('sion')) {
      stresses.push('0', '1');
    } else {
      // Default: first syllable stressed for nouns
      stresses.push('1', '0');
    }
  } else if (syllableCount === 3) {
    if (cleanWord.endsWith('tion') || cleanWord.endsWith('sion')) {
      stresses.push('0', '1', '0');
    } else if (cleanWord.endsWith('ity') || cleanWord.endsWith('ary')) {
      stresses.push('1', '0', '0');
    } else {
      stresses.push('1', '0', '0'); // Default
    }
  } else {
    // For longer words, alternate pattern starting with stress
    for (let i = 0; i < syllableCount; i++) {
      stresses.push(i % 2 === 0 ? '1' : '0');
    }
  }
  
  return stresses;
};

// Analyze meter patterns in lyrics
export const analyzeMeterPatterns = (lyrics, phoneticMap = {}) => {
  if (!lyrics || typeof lyrics !== 'string') return null;
  
  const lines = lyrics.split('\n').filter(line => line.trim().length > 0);
  const lineAnalysis = [];
  
  lines.forEach((line, lineIndex) => {
    const words = line.trim().split(/\s+/).filter(word => word.length > 0);
    const lineStresses = [];
    const lineSyllables = [];
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w'-]/g, '').toLowerCase();
      if (cleanWord.length > 0) {
        const phoneticData = phoneticMap[cleanWord];
        const stresses = detectStressPattern(cleanWord, phoneticData);
        const syllables = countSyllables(cleanWord);
        
        lineStresses.push(...stresses);
        lineSyllables.push(syllables);
      }
    });
    
    // Identify meter pattern
    const meterPattern = identifyMeter(lineStresses);
    
    lineAnalysis.push({
      lineIndex,
      line: line.trim(),
      stressPattern: lineStresses,
      syllableCount: lineStresses.length,
      meterType: meterPattern.type,
      meterConfidence: meterPattern.confidence,
      words: words.length
    });
  });
  
  return lineAnalysis;
};

// Identify common meter patterns
const identifyMeter = (stresses) => {
  if (!stresses || stresses.length < 2) {
    return { type: 'insufficient', confidence: 0 };
  }
  
  const length = stresses.length;
  
  // Convert to binary for pattern matching (1 = stressed, 0 = unstressed)
  const binaryPattern = stresses.map(s => s === '1' ? '1' : '0').join('');
  
  // Common meter patterns
  const meters = {
    iambic: /^(01)+0?$/,        // da-DUM da-DUM (01 01...)
    trochaic: /^(10)+1?$/,      // DUM-da DUM-da (10 10...)
    anapestic: /^(001)+00?$/,   // da-da-DUM da-da-DUM (001 001...)
    dactylic: /^(100)+10?$/,    // DUM-da-da DUM-da-da (100 100...)
    spondaic: /^(11)+1?$/,      // DUM-DUM DUM-DUM (11 11...)
    pyrrhic: /^(00)+0?$/        // da-da da-da (00 00...)
  };
  
  // Test each meter pattern
  for (const [meterName, regex] of Object.entries(meters)) {
    if (regex.test(binaryPattern)) {
      // Calculate confidence based on pattern consistency
      const expectedLength = getMeterExpectedLength(meterName, length);
      const lengthMatch = Math.abs(length - expectedLength) <= 1;
      const confidence = lengthMatch ? 0.9 : 0.7;
      
      return { type: meterName, confidence };
    }
  }
  
  // Check for mixed or irregular patterns
  const stressedCount = stresses.filter(s => s === '1').length;
  const unstressedCount = stresses.filter(s => s === '0').length;
  
  if (stressedCount === unstressedCount) {
    return { type: 'alternating', confidence: 0.6 };
  } else if (stressedCount > unstressedCount * 1.5) {
    return { type: 'stress-heavy', confidence: 0.5 };
  } else if (unstressedCount > stressedCount * 1.5) {
    return { type: 'stress-light', confidence: 0.5 };
  }
  
  return { type: 'irregular', confidence: 0.3 };
};

// Helper function for expected meter lengths
const getMeterExpectedLength = (meterType, actualLength) => {
  const meterUnits = {
    iambic: 2,      // 2 syllables per foot
    trochaic: 2,
    anapestic: 3,   // 3 syllables per foot
    dactylic: 3,
    spondaic: 2,
    pyrrhic: 2
  };
  
  const unitLength = meterUnits[meterType] || 2;
  return Math.round(actualLength / unitLength) * unitLength;
};

// Calculate flow consistency score
export const calculateFlowConsistency = (meterAnalysis) => {
  if (!meterAnalysis || meterAnalysis.length === 0) return 0;
  
  const validLines = meterAnalysis.filter(line => line.meterType !== 'insufficient');
  if (validLines.length === 0) return 0;
  
  // Group lines by sections (verses, choruses, etc.)
  const sections = groupLinesBySection(validLines);
  let totalConsistencyScore = 0;
  let sectionCount = 0;
  
  sections.forEach(section => {
    if (section.length >= 2) {
      const sectionScore = calculateSectionConsistency(section);
      totalConsistencyScore += sectionScore;
      sectionCount++;
    }
  });
  
  return sectionCount > 0 ? Math.round((totalConsistencyScore / sectionCount) * 100) / 100 : 0;
};

// Group lines into sections based on patterns
const groupLinesBySection = (lines) => {
  const sections = [];
  let currentSection = [];
  let lastSyllableCount = -1;
  let lastMeterType = '';
  
  lines.forEach((line, index) => {
    const syllableDiff = Math.abs(line.syllableCount - lastSyllableCount);
    const meterChanged = line.meterType !== lastMeterType;
    
    // Start new section if significant change or empty line pattern
    if (index === 0 || (syllableDiff > 3 && meterChanged && currentSection.length >= 2)) {
      if (currentSection.length > 0) {
        sections.push([...currentSection]);
      }
      currentSection = [line];
    } else {
      currentSection.push(line);
    }
    
    lastSyllableCount = line.syllableCount;
    lastMeterType = line.meterType;
  });
  
  if (currentSection.length > 0) {
    sections.push(currentSection);
  }
  
  return sections;
};

// Calculate consistency within a section
const calculateSectionConsistency = (section) => {
  if (section.length < 2) return 1;
  
  // Check syllable count consistency
  const syllableCounts = section.map(line => line.syllableCount);
  const avgSyllables = syllableCounts.reduce((a, b) => a + b, 0) / syllableCounts.length;
  const syllableVariance = syllableCounts.reduce((sum, count) => {
    return sum + Math.pow(count - avgSyllables, 2);
  }, 0) / syllableCounts.length;
  
  // Check meter consistency
  const meterTypes = section.map(line => line.meterType);
  const mostCommonMeter = getMostCommon(meterTypes);
  const meterConsistency = meterTypes.filter(type => type === mostCommonMeter).length / meterTypes.length;
  
  // Check confidence levels
  const avgConfidence = section.reduce((sum, line) => sum + line.meterConfidence, 0) / section.length;
  
  // Combined score (syllable consistency 40%, meter consistency 40%, confidence 20%)
  const syllableScore = Math.max(0, 1 - (syllableVariance / 10)); // Normalize variance
  const combinedScore = (syllableScore * 0.4) + (meterConsistency * 0.4) + (avgConfidence * 0.2);
  
  return Math.max(0, Math.min(1, combinedScore));
};

// Helper function to find most common element
const getMostCommon = (arr) => {
  if (!arr || arr.length === 0) return null; // Add safety check
  
  const counts = {};
  arr.forEach(item => counts[item] = (counts[item] || 0) + 1);
  
  const entries = Object.entries(counts);
  if (entries.length === 0) return null; // Additional safety check
  
  return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
};

// Analyze rhythm variation between sections
export const analyzeRhythmVariation = (meterAnalysis) => {
  if (!meterAnalysis || meterAnalysis.length === 0) return null;
  
  const sections = groupLinesBySection(meterAnalysis);
  if (sections.length < 2) {
    return {
      sections: sections.length,
      variation: 'insufficient-data',
      details: 'Need at least 2 sections to analyze variation'
    };
  }
  
  const sectionAnalysis = sections.map((section, index) => {
    const avgSyllables = section.reduce((sum, line) => sum + line.syllableCount, 0) / section.length;
    const dominantMeter = getMostCommon(section.map(line => line.meterType));
    const avgConfidence = section.reduce((sum, line) => sum + line.meterConfidence, 0) / section.length;
    
    return {
      sectionIndex: index,
      lineCount: section.length,
      avgSyllables: Math.round(avgSyllables * 10) / 10,
      dominantMeter,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      lines: section.map(line => ({
        text: line.line,
        syllables: line.syllableCount,
        meter: line.meterType
      }))
    };
  });
  
  // Calculate variation metrics
  const syllableRanges = sectionAnalysis.map(s => s.avgSyllables);
  const syllableVariation = Math.max(...syllableRanges) - Math.min(...syllableRanges);
  
  const meterTypes = sectionAnalysis.map(s => s.dominantMeter);
  const uniqueMeters = [...new Set(meterTypes)].length;
  
  let variationType = 'low';
  if (syllableVariation > 4 || uniqueMeters > 2) {
    variationType = 'high';
  } else if (syllableVariation > 2 || uniqueMeters > 1) {
    variationType = 'moderate';
  }
  
  return {
    sections: sections.length,
    variation: variationType,
    syllableVariation,
    uniqueMeters,
    sectionBreakdown: sectionAnalysis,
    summary: generateVariationSummary(variationType, syllableVariation, uniqueMeters)
  };
};

// Generate human-readable summary
const generateVariationSummary = (variationType, syllableVar, meterCount) => {
  if (variationType === 'low') {
    return 'Your song maintains consistent rhythm throughout most sections.';
  } else if (variationType === 'moderate') {
    return `Moderate rhythm variation detected. ${syllableVar > 2 ? 'Syllable counts vary moderately between sections.' : ''} ${meterCount > 1 ? 'Multiple meter patterns used.' : ''}`.trim();
  } else {
    return `High rhythm variation detected. ${syllableVar > 4 ? 'Significant syllable count differences between sections.' : ''} ${meterCount > 2 ? 'Multiple different meter patterns used.' : ''}`.trim();
  }
};

// Writing Quality Analysis Functions

// Lists of words and phrases for analysis
const WEAK_WORDS = new Set([
  'very', 'really', 'quite', 'rather', 'fairly', 'pretty', 'somewhat', 'kind of', 'sort of',
  'a lot', 'lots', 'tons', 'loads', 'heaps', 'bunch', 'stuff', 'things', 'something',
  'actually', 'basically', 'literally', 'totally', 'completely', 'absolutely', 'definitely',
  'probably', 'maybe', 'perhaps', 'possibly', 'seemingly', 'apparently', 'obviously',
  'clearly', 'simply', 'just', 'only', 'even', 'still', 'already', 'yet', 'however',
  'though', 'although', 'nevertheless', 'nonetheless', 'furthermore', 'moreover',
  'additionally', 'also', 'too', 'as well', 'in addition', 'besides', 'plus'
]);

const CLICHE_PHRASES = [
  'at the end of the day', 'when all is said and done', 'it is what it is', 'everything happens for a reason',
  'time heals all wounds', 'what doesn\'t kill you makes you stronger', 'follow your dreams', 'live your best life',
  'love conquers all', 'money can\'t buy happiness', 'good things come to those who wait', 'better late than never',
  'actions speak louder than words', 'when life gives you lemons', 'every cloud has a silver lining',
  'the calm before the storm', 'needle in a haystack', 'piece of cake', 'break a leg', 'spill the beans',
  'bite the bullet', 'hit the nail on the head', 'barking up the wrong tree', 'don\'t count your chickens',
  'diamond in the rough', 'fish out of water', 'blessing in disguise', 'burn the midnight oil',
  'caught between a rock and a hard place', 'devil\'s advocate', 'elephant in the room', 'green with envy',
  'heart of gold', 'icing on the cake', 'kill two birds with one stone', 'let the cat out of the bag',
  'once in a blue moon', 'raining cats and dogs', 'the ball is in your court', 'time is money',
  'you can\'t judge a book by its cover', 'all that glitters is not gold', 'beauty is in the eye of the beholder',
  'broken heart', 'tears in my eyes', 'soul on fire', 'heart and soul', 'blood sweat and tears',
  'ride or die', 'thick and thin', 'till death do us part', 'meant to be', 'written in the stars'
];

const POWER_WORDS = new Set([
  // Emotional power words
  'explosive', 'revolutionary', 'breakthrough', 'stunning', 'magnificent', 'extraordinary', 'phenomenal',
  'incredible', 'amazing', 'outstanding', 'remarkable', 'spectacular', 'brilliant', 'masterful',
  'dominant', 'commanding', 'fierce', 'ruthless', 'relentless', 'unstoppable', 'invincible',
  'legendary', 'iconic', 'epic', 'monumental', 'colossal', 'massive', 'enormous', 'gigantic',
  
  // Action power words
  'ignite', 'unleash', 'trigger', 'launch', 'explode', 'shatter', 'crush', 'demolish', 'destroy',
  'annihilate', 'obliterate', 'devastate', 'dominate', 'conquer', 'overcome', 'triumph', 'prevail',
  'surge', 'soar', 'skyrocket', 'plummet', 'crash', 'collide', 'strike', 'attack', 'assault',
  
  // Sensory power words
  'blazing', 'scorching', 'freezing', 'burning', 'searing', 'piercing', 'thunderous', 'deafening',
  'blinding', 'dazzling', 'glowing', 'shimmering', 'sparkling', 'gleaming', 'radiant', 'luminous',
  'fragrant', 'pungent', 'bitter', 'sweet', 'sour', 'spicy', 'tangy', 'smooth', 'rough', 'sharp'
]);

// Detect weak words in lyrics
export const detectWeakWords = (lyrics) => {
  if (!lyrics || typeof lyrics !== 'string') return [];
  
  const lines = lyrics.split('\n').filter(line => line.trim().length > 0);
  const weakWordInstances = [];
  
  lines.forEach((line, lineIndex) => {
    const words = line.toLowerCase().split(/\s+/);
    
    words.forEach((word, wordIndex) => {
      const cleanWord = word.replace(/[^\w'-]/g, '');
      if (WEAK_WORDS.has(cleanWord)) {
        weakWordInstances.push({
          line: lineIndex + 1,
          word: cleanWord,
          context: line.trim(),
          position: wordIndex,
          suggestion: getWeakWordSuggestion(cleanWord)
        });
      }
    });
  });
  
  return weakWordInstances;
};

// Get suggestions for replacing weak words
const getWeakWordSuggestion = (weakWord) => {
  const suggestions = {
    'very': 'Remove or use a stronger adjective',
    'really': 'Remove or be more specific',
    'quite': 'Remove or be more precise',
    'pretty': 'Remove (unless describing appearance)',
    'just': 'Often unnecessary - try removing',
    'actually': 'Usually unnecessary',
    'basically': 'Usually unnecessary',
    'literally': 'Often misused - remove or be precise',
    'totally': 'Use a more specific word',
    'definitely': 'Consider if this adds meaning',
    'probably': 'Be more decisive',
    'maybe': 'Be more decisive or specific',
    'stuff': 'Be more specific',
    'things': 'Be more specific',
    'something': 'Be more specific',
    'a lot': 'Use a specific quantity or "many"',
    'lots': 'Use "many" or be specific'
  };
  
  return suggestions[weakWord] || 'Consider a more specific alternative';
};

// Detect clichés in lyrics
export const detectCliches = (lyrics) => {
  if (!lyrics || typeof lyrics !== 'string') return [];
  
  const clicheInstances = [];
  
  CLICHE_PHRASES.forEach(cliche => {
    const regex = new RegExp(cliche.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let match;
    
    while ((match = regex.exec(lyrics)) !== null) {
      // Find which line this cliché appears on
      const textBeforeMatch = lyrics.substring(0, match.index);
      const lineNumber = (textBeforeMatch.match(/\n/g) || []).length + 1;
      const lines = lyrics.split('\n');
      const lineText = lines[lineNumber - 1] || '';
      
      clicheInstances.push({
        line: lineNumber,
        phrase: match[0],
        context: lineText.trim(),
        suggestion: getClicheSuggestion(cliche)
      });
    }
  });
  
  return clicheInstances;
};

// Get suggestions for replacing clichés
const getClicheSuggestion = (cliche) => {
  const suggestions = {
    'at the end of the day': 'ultimately, finally, in conclusion',
    'it is what it is': 'be more specific about the situation',
    'everything happens for a reason': 'express the specific reason or meaning',
    'follow your dreams': 'pursue your goals, chase your ambitions',
    'broken heart': 'describe the specific pain or emotion',
    'tears in my eyes': 'show the emotion through specific imagery',
    'heart and soul': 'with complete dedication, with everything',
    'meant to be': 'destined, inevitable, perfect match'
  };
  
  return suggestions[cliche] || 'Try a fresh, original way to express this idea';
};

// Detect power words
export const detectPowerWords = (lyrics) => {
  if (!lyrics || typeof lyrics !== 'string') return [];
  
  const lines = lyrics.split('\n').filter(line => line.trim().length > 0);
  const powerWordInstances = [];
  
  lines.forEach((line, lineIndex) => {
    const words = line.toLowerCase().split(/\s+/);
    
    words.forEach((word) => {
      const cleanWord = word.replace(/[^\w'-]/g, '');
      if (POWER_WORDS.has(cleanWord)) {
        powerWordInstances.push({
          line: lineIndex + 1,
          word: cleanWord,
          context: line.trim(),
          category: getPowerWordCategory(cleanWord)
        });
      }
    });
  });
  
  return powerWordInstances;
};

// Categorize power words
const getPowerWordCategory = (word) => {
  const emotional = ['explosive', 'stunning', 'magnificent', 'extraordinary', 'phenomenal', 'incredible', 'amazing', 'outstanding', 'remarkable', 'spectacular', 'brilliant', 'masterful'];
  const action = ['ignite', 'unleash', 'trigger', 'launch', 'explode', 'shatter', 'crush', 'demolish', 'destroy', 'annihilate', 'obliterate', 'devastate'];
  const dominance = ['dominant', 'commanding', 'fierce', 'ruthless', 'relentless', 'unstoppable', 'invincible', 'legendary', 'iconic', 'epic'];
  const sensory = ['blazing', 'scorching', 'freezing', 'burning', 'searing', 'piercing', 'thunderous', 'deafening', 'blinding', 'dazzling'];
  
  if (emotional.includes(word)) return 'emotional';
  if (action.includes(word)) return 'action';
  if (dominance.includes(word)) return 'dominance';
  if (sensory.includes(word)) return 'sensory';
  return 'general';
};

// Detect overused phrases within a song
export const detectOverusedPhrases = (lyrics) => {
  if (!lyrics || typeof lyrics !== 'string') return [];
  
  const lines = lyrics.split('\n').filter(line => line.trim().length > 0);
  const phraseCount = {};
  const overusedPhrases = [];
  
  // Extract 2-4 word phrases
  lines.forEach((line, lineIndex) => {
    const words = line.toLowerCase().split(/\s+/).filter(word => 
      word.replace(/[^\w'-]/g, '').length > 0
    );
    
    // Check 2-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = words.slice(i, i + 2).join(' ');
      const cleanPhrase = phrase.replace(/[^\w\s'-]/g, '');
      
      if (cleanPhrase.split(' ').every(word => word.length > 2)) {
        phraseCount[cleanPhrase] = phraseCount[cleanPhrase] || [];
        phraseCount[cleanPhrase].push({ line: lineIndex + 1, context: line.trim() });
      }
    }
    
    // Check 3-word phrases
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = words.slice(i, i + 3).join(' ');
      const cleanPhrase = phrase.replace(/[^\w\s'-]/g, '');
      
      if (cleanPhrase.split(' ').every(word => word.length > 2)) {
        phraseCount[cleanPhrase] = phraseCount[cleanPhrase] || [];
        phraseCount[cleanPhrase].push({ line: lineIndex + 1, context: line.trim() });
      }
    }
  });
  
  // Find phrases used 3+ times
  Object.entries(phraseCount).forEach(([phrase, instances]) => {
    if (instances.length >= 3) {
      overusedPhrases.push({
        phrase,
        count: instances.length,
        instances: instances
      });
    }
  });
  
  return overusedPhrases.sort((a, b) => b.count - a.count);
};

// Comprehensive writing quality analysis - SIMPLIFIED VERSION
export const performWritingQualityAnalysis = (lyrics) => {
  if (!lyrics || typeof lyrics !== 'string') {
    return {
      summary: {
        qualityScore: 100,
        totalLines: 0,
        totalWords: 0,
        improvement: 'No analysis available'
      }
    };
  }
  
  const lines = lyrics.split('\n').filter(line => line.trim().length > 0);
  const words = lyrics.split(/\s+/).filter(word => word.match(/[a-zA-Z]/));
  
  // Simple quality score based on basic metrics
  let qualityScore = 100;
  const avgWordsPerLine = words.length / Math.max(1, lines.length);
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / Math.max(1, words.length);
  
  // Adjust score based on basic metrics
  if (avgWordsPerLine < 3) qualityScore -= 10;
  if (avgWordsPerLine > 15) qualityScore -= 5;
  if (avgWordLength < 3) qualityScore -= 10;
  
  qualityScore = Math.max(0, Math.min(100, Math.round(qualityScore)));
  
  return {
    summary: {
      qualityScore,
      totalLines: lines.length,
      totalWords: words.length,
      avgWordsPerLine: Math.round(avgWordsPerLine * 10) / 10,
      avgWordLength: Math.round(avgWordLength * 10) / 10,
      improvement: qualityScore >= 80 ? 'Great work!' : 
                   qualityScore >= 60 ? 'Good foundation, consider refining.' : 
                   'Consider expanding and refining your lyrics.'
    }
  };
};