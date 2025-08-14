import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor() {
    // Initialize with API key from environment variable
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Gemini API key not found. Set REACT_APP_GEMINI_API_KEY in your environment.');
      this.genAI = null;
      return;
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Rate limiting and caching
    this.lastApiCall = 0;
    this.cache = new Map();
    this.rateLimitMs = 10000; // 10 seconds between calls
  }

  // Generate cache key from song content
  generateCacheKey(lyrics, analysisType) {
    const content = `${analysisType}:${lyrics}`;
    return btoa(content).slice(0, 32); // Simple hash
  }

  // Check if we can make an API call (rate limiting)
  canMakeApiCall() {
    const now = Date.now();
    return (now - this.lastApiCall) >= this.rateLimitMs;
  }

  // Get time until next allowed API call
  getTimeUntilNextCall() {
    const now = Date.now();
    const timeSince = now - this.lastApiCall;
    return Math.max(0, this.rateLimitMs - timeSince);
  }

  // Clear cache for a specific song and analysis type
  clearCacheForSong(lyrics, analysisType) {
    const cacheKey = this.generateCacheKey(lyrics, analysisType);
    this.cache.delete(cacheKey);
    console.log(`Cleared cache for ${analysisType} analysis`);
  }

  async analyzeLyricalCoherence(lyrics, songTitle = "Unknown Song") {
    if (!this.genAI) {
      throw new Error('Gemini API not initialized. Please check your API key.');
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(lyrics, 'coherence');
    if (this.cache.has(cacheKey)) {
      console.log('Returning cached coherence analysis');
      return { ...this.cache.get(cacheKey), fromCache: true };
    }

    // Check rate limiting
    if (!this.canMakeApiCall()) {
      const waitTime = Math.ceil(this.getTimeUntilNextCall() / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds before analyzing again.`);
    }

    try {
      const prompt = this.createCoherenceAnalysisPrompt(lyrics, songTitle);
      
      this.lastApiCall = Date.now();
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      console.log('Raw coherence analysis:', text);
      
      // Clean up the response text
      text = text.trim();
      if (text.startsWith('```json')) {
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }
      
      let analysisData;
      try {
        analysisData = JSON.parse(text);
        
        // Ensure all required fields exist with proper validation
        analysisData.coherenceScore = Math.max(0, Math.min(100, analysisData.coherenceScore || 70));
        analysisData.storyFlow = analysisData.storyFlow || 'fair';
        analysisData.thematicUnity = analysisData.thematicUnity || 'fair';
        analysisData.narrativeConsistency = analysisData.narrativeConsistency || 'fair';
        analysisData.sectionConnections = analysisData.sectionConnections || 'fair';
        analysisData.overallAssessment = analysisData.overallAssessment || 'Analysis completed.';
        analysisData.observations = Array.isArray(analysisData.observations) ? analysisData.observations : [];
        analysisData.references = Array.isArray(analysisData.references) ? analysisData.references : [];
        
      } catch (parseError) {
        console.error('Performance JSON parse error:', parseError);
        console.error('Failed to parse:', text);
        
        // Fallback response - DON'T CACHE FALLBACKS
        const fallbackData = {
          success: false,
          error: 'AI analysis parsing failed, try again for better results',
          fromCache: false,
          fallbackData: {
            vocalFlow: {
              overallRating: 'moderate',
              flowPatterns: ['Analysis completed with technical fallback'],
              difficultSections: []
            },
            breathControl: {
              rating: 'fair',
              naturalBreaks: [],
              challengingSections: []
            },
            performanceDynamics: {
              energyMapping: [{ section: 'overall', energy: 'moderate', description: 'Consistent energy level' }]
            },
            repetitionAnalysis: {
              effectiveRepeats: [],
              overusedPhrases: [],
              missedOpportunities: []
            },
            emotionalProgression: {
              arc: ['steady emotional tone'],
              keyMoments: []
            },
            eraInfluence: {
              primaryEra: 'contemporary',
              influences: [],
              modernElements: []
            }
          }
        };
        
        // DON'T cache fallback results
        return fallbackData;
      }
      
      const result_data = {
        success: true,
        fromCache: false,
        ...analysisData
      };
      
      // Cache the result (only successful analyses)
      this.cache.set(cacheKey, result_data);
      
      return result_data;
      
    } catch (error) {
      console.error('Error analyzing lyrical coherence:', error);
      return {
        success: false,
        error: error.message,
        fromCache: false
      };
    }
  }

  createCoherenceAnalysisPrompt(lyrics, songTitle) {
    return `Analyze the lyrical coherence and narrative quality of "${songTitle}".

LYRICS TO ANALYZE:
${lyrics}

Provide OBJECTIVE ANALYSIS ONLY. Do not suggest changes or improvements.

Evaluate these aspects:
1. STORY FLOW: How well the narrative progresses from beginning to end
2. THEMATIC UNITY: How consistently the song maintains its central theme/message  
3. SECTION CONNECTIONS: How well verses, chorus, and bridge connect thematically

Rate each aspect as: "excellent", "good", "fair", or "weak"
Provide an overall coherence score from 0-100 (higher = more coherent).

Focus on ANALYSIS not ADVICE:
- Describe what the song accomplishes narratively
- Identify patterns and techniques observed
- Note structural choices and their effects
- Assess clarity and consistency objectively

IDENTIFY REFERENCES:
Look for allusions, references, or connections to:
- Biblical stories, mythology, folklore
- Literature, poetry, famous quotes
- Historical events, figures, or periods
- Pop culture, movies, TV shows, other songs
- Cultural symbols, idioms, or sayings
- Geographic locations with cultural significance

For each reference found, categorize the type and explain the connection clearly.

Return JSON with this EXACT structure in mind:
{
  "coherenceScore": 0-100,
  "storyFlow": "excellent", "good", "fair", or "weak",
  "thematicUnity": "excellent", "good", "fair", or "weak",
  "narrativeConsistency": "excellent", "good", "fair", or "weak",
  "sectionConnections": "excellent", "good", "fair", or "weak",
  "overallAssessment": "Long explanatory, deeply analytical objective summary of what the lyrics accomplish, how they function and are structured",
  "references": [
    {
      "type": "biblical",
      "reference": "Garden of Eden imagery",
      "context": "Lines about paradise lost and innocence",
      "explanation": "Alludes to the biblical story of Adam and Eve's fall from grace"
    },
    {
      "type": "literary",
      "reference": "Romeo and Juliet",
      "context": "Star-crossed lovers theme",
      "explanation": "References Shakespeare's tragic romance about forbidden love"
    }
  ]
}`;
  }

  async analyzePerformanceAndStyle(lyrics, songTitle = "Unknown Song", forceFresh = false) {
    if (!this.genAI) {
      throw new Error('Gemini API not initialized. Please check your API key.');
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(lyrics, 'performance');
    
    // Clear cache if forced refresh
    if (forceFresh) {
      this.cache.delete(cacheKey);
      console.log('Forced cache clear for performance analysis');
    }

    // Check cache (unless forced fresh)
    if (!forceFresh && this.cache.has(cacheKey)) {
      console.log('Returning cached performance analysis');
      return { ...this.cache.get(cacheKey), fromCache: true };
    }

    // Check rate limiting
    if (!this.canMakeApiCall()) {
      const waitTime = Math.ceil(this.getTimeUntilNextCall() / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds before analyzing again.`);
    }

    try {
      const prompt = this.createPerformanceAnalysisPrompt(lyrics, songTitle);
      
      this.lastApiCall = Date.now();
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      console.log('Raw performance analysis:', text);
      
      // Clean up the response text
      text = text.trim();
      if (text.startsWith('```json')) {
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }
      
      let analysisData;
      try {
        analysisData = JSON.parse(text);
        
        // Ensure all required fields exist with proper validation
        if (!analysisData.vocalFlow) analysisData.vocalFlow = {};
        if (!analysisData.breathControl) analysisData.breathControl = {};
        if (!analysisData.performanceDynamics) analysisData.performanceDynamics = {};
        if (!analysisData.repetitionAnalysis) analysisData.repetitionAnalysis = {};
        if (!analysisData.emotionalProgression) analysisData.emotionalProgression = {};
        if (!analysisData.eraInfluence) analysisData.eraInfluence = {};
        
        // Set defaults for nested objects
        analysisData.vocalFlow.overallRating = analysisData.vocalFlow.overallRating || 'moderate';
        analysisData.vocalFlow.flowPatterns = Array.isArray(analysisData.vocalFlow.flowPatterns) ? analysisData.vocalFlow.flowPatterns : [];
        analysisData.breathControl.rating = analysisData.breathControl.rating || 'fair';
        analysisData.performanceDynamics.energyMapping = Array.isArray(analysisData.performanceDynamics.energyMapping) ? analysisData.performanceDynamics.energyMapping : [];
        analysisData.repetitionAnalysis.effectiveRepeats = Array.isArray(analysisData.repetitionAnalysis.effectiveRepeats) ? analysisData.repetitionAnalysis.effectiveRepeats : [];
        analysisData.emotionalProgression.arc = Array.isArray(analysisData.emotionalProgression.arc) ? analysisData.emotionalProgression.arc : [];
        analysisData.eraInfluence.primaryEra = analysisData.eraInfluence.primaryEra || 'contemporary';
        
      } catch (parseError) {
        console.error('Performance JSON parse error:', parseError);
        console.error('Failed to parse:', text);
        
        // Fallback response
        analysisData = {
          vocalFlow: {
            overallRating: 'moderate',
            flowPatterns: ['Analysis completed with technical fallback'],
            difficultSections: []
          },
          breathControl: {
            rating: 'fair',
            naturalBreaks: [],
            challengingSections: []
          },
          performanceDynamics: {
            energyMapping: [{ section: 'overall', energy: 'moderate', description: 'Consistent energy level' }]
          },
          repetitionAnalysis: {
            effectiveRepeats: [],
            overusedPhrases: [],
            missedOpportunities: []
          },
          emotionalProgression: {
            arc: ['steady emotional tone'],
            keyMoments: []
          },
          eraInfluence: {
            primaryEra: 'contemporary',
            influences: [],
            modernElements: []
          }
        };
      }
      
      const result_data = {
        success: true,
        fromCache: false,
        ...analysisData
      };
      
      // Cache the result
      this.cache.set(cacheKey, result_data);
      
      return result_data;
      
    } catch (error) {
      console.error('Error analyzing performance and style:', error);
      
      // Don't cache errors, and provide more specific error messages
      if (error.message.includes('Rate limit exceeded')) {
        return {
          success: false,
          error: error.message,
          fromCache: false,
          retryable: true
        };
      }
      
      return {
        success: false,
        error: `Analysis failed: ${error.message}. Please try again.`,
        fromCache: false,
        retryable: true
      };
    }
  }

  createPerformanceAnalysisPrompt(lyrics, songTitle) {
    return `Analyze the performance and stylistic qualities of "${songTitle}".

LYRICS TO ANALYZE:
${lyrics}

Provide detailed analysis of how these lyrics would perform when sung/delivered:

1. VOCAL FLOW PATTERNS: How smoothly do the words flow? Are there natural emphasis points?
2. BREATH CONTROL: Where are natural breathing spots? Any challenging sections?
3. PERFORMANCE DYNAMICS: Where are the energy peaks and valleys throughout the song?
4. REPETITION PATTERNS: What phrases repeat and how effective are they?
5. EMOTIONAL PROGRESSION: How do emotions change from start to finish?
6. ERA/INFLUENCE DETECTION: What musical periods, genres, or artists does this resemble?

Be specific and practical - focus on how a performer would actually deliver these lyrics.

Return JSON with this EXACT structure:
{
  "vocalFlow": {
    "overallRating": "smooth/choppy/varied/complex",
    "flowPatterns": ["specific observation about flow", "another flow observation"],
    "difficultSections": ["sections that might be hard to deliver smoothly"]
  },
  "breathControl": {
    "rating": "excellent/good/fair/challenging",
    "naturalBreaks": ["where natural breathing occurs", "other break points"],
    "challengingSections": ["long phrases without breaks", "rapid sections"]
  },
  "performanceDynamics": {
    "energyMapping": [
      {"section": "verse 1", "energy": "low/medium/high", "description": "mood description"},
      {"section": "chorus", "energy": "low/medium/high", "description": "mood description"}
    ]
  },
  "repetitionAnalysis": {
    "effectiveRepeats": ["phrases that repeat well for emphasis"],
    "overusedPhrases": ["phrases that repeat too much"],
    "missedOpportunities": ["suggestions for strategic repetition"]
  },
  "emotionalProgression": {
    "arc": ["starting emotion", "middle emotion", "ending emotion"],
    "keyMoments": ["emotional peaks or significant shifts"]
  },
  "eraInfluence": {
    "primaryEra": "specific time period or genre",
    "influences": ["artists or bands this resembles"],
    "modernElements": ["contemporary touches in the lyrics"]
  }
}`;
  }

  // Clear cache (useful for testing)
  clearCache() {
    this.cache.clear();

  }
}

const geminiServiceInstance = new GeminiService();
export default geminiServiceInstance;