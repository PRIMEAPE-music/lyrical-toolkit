class GeminiService {
  constructor() {
    // Rate limiting and caching for frontend
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
      this.lastApiCall = Date.now();
      
      const response = await fetch('/.netlify/functions/analyze-coherence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lyrics, songTitle })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Cache successful results
      if (result.success) {
        this.cache.set(cacheKey, result);
      }
      
      return result;
      
    } catch (error) {
      console.error('Error analyzing lyrical coherence:', error);
      return {
        success: false,
        error: error.message,
        fromCache: false
      };
    }
  }


  async analyzePerformanceAndStyle(lyrics, songTitle = "Unknown Song", forceFresh = false) {
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
      this.lastApiCall = Date.now();
      
      const response = await fetch('/.netlify/functions/analyze-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lyrics, songTitle, forceFresh })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Cache successful results
      if (result.success) {
        this.cache.set(cacheKey, result);
      }
      
      return result;
      
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


  // Clear cache (useful for testing)
  clearCache() {
    this.cache.clear();

  }
}

const geminiServiceInstance = new GeminiService();
export default geminiServiceInstance;