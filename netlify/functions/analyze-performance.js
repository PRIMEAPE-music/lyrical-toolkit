const { GoogleGenerativeAI } = require('@google/generative-ai');

// Rate limiting and caching for the function
const cache = new Map();
const lastApiCall = { time: 0 };
const rateLimitMs = 10000; // 10 seconds between calls

// Generate cache key from song content
function generateCacheKey(lyrics, analysisType) {
  const content = `${analysisType}:${lyrics}`;
  return Buffer.from(content).toString('base64').slice(0, 32);
}

// Check if we can make an API call (rate limiting)
function canMakeApiCall() {
  const now = Date.now();
  return (now - lastApiCall.time) >= rateLimitMs;
}

// Get time until next allowed API call
function getTimeUntilNextCall() {
  const now = Date.now();
  const timeSince = now - lastApiCall.time;
  return Math.max(0, rateLimitMs - timeSince);
}

function createPerformanceAnalysisPrompt(lyrics, songTitle) {
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

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    // Parse request body
    const { lyrics, songTitle = "Unknown Song", forceFresh = false } = JSON.parse(event.body);

    if (!lyrics) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Lyrics are required' })
      };
    }

    // Initialize Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Gemini API key not configured' })
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Generate cache key
    const cacheKey = generateCacheKey(lyrics, 'performance');
    
    // Clear cache if forced refresh
    if (forceFresh) {
      cache.delete(cacheKey);
      console.log('Forced cache clear for performance analysis');
    }

    // Check cache (unless forced fresh)
    if (!forceFresh && cache.has(cacheKey)) {
      console.log('Returning cached performance analysis');
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...cache.get(cacheKey), fromCache: true })
      };
    }

    // Check rate limiting
    if (!canMakeApiCall()) {
      const waitTime = Math.ceil(getTimeUntilNextCall() / 1000);
      return {
        statusCode: 429,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: `Rate limit exceeded. Please wait ${waitTime} seconds before analyzing again.` 
        })
      };
    }

    // Make API call
    const prompt = createPerformanceAnalysisPrompt(lyrics, songTitle);
    
    lastApiCall.time = Date.now();
    const result = await model.generateContent(prompt);
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
      
      // Fallback response - DON'T CACHE FALLBACKS
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
        })
      };
    }
    
    const resultData = {
      success: true,
      fromCache: false,
      ...analysisData
    };
    
    // Cache the result
    cache.set(cacheKey, resultData);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(resultData)
    };
    
  } catch (error) {
    console.error('Error analyzing performance and style:', error);
    
    // Don't cache errors, and provide more specific error messages
    if (error.message.includes('Rate limit exceeded')) {
      return {
        statusCode: 429,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: error.message,
          fromCache: false,
          retryable: true
        })
      };
    }
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: `Analysis failed: ${error.message}. Please try again.`,
        fromCache: false,
        retryable: true
      })
    };
  }
};