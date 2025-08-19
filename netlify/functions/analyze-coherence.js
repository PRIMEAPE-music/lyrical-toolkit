const { GoogleGenerativeAI } = require('@google/generative-ai');

// DEBUG: Check environment variables at module load time
console.log('🐛 MODULE LOAD: Function module loaded');
console.log('🐛 MODULE LOAD: NODE_ENV:', process.env.NODE_ENV);
console.log('🐛 MODULE LOAD: GEMINI_API_KEY available:', !!process.env.GEMINI_API_KEY);

// Alternative way to access environment variables (sometimes needed in Netlify)
function getEnvironmentVariable(name) {
  // Try multiple ways to access the environment variable
  const methods = [
    () => process.env[name],
    () => globalThis.process?.env?.[name],
    () => global.process?.env?.[name],
    () => require('process').env[name]
  ];
  
  for (let i = 0; i < methods.length; i++) {
    try {
      const value = methods[i]();
      if (value) {
        console.log(`🐛 DEBUG: Found ${name} using method ${i + 1}`);
        return value;
      }
    } catch (error) {
      console.log(`🐛 DEBUG: Method ${i + 1} failed for ${name}:`, error.message);
    }
  }
  
  console.log(`🐛 DEBUG: All methods failed to find ${name}`);
  return null;
}

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

function createCoherenceAnalysisPrompt(lyrics, songTitle) {
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

exports.handler = async (event, context) => {
  // DEBUG: Log environment variable information
  console.log('🐛 DEBUG: Function execution started');
  console.log('🐛 DEBUG: Node environment:', process.env.NODE_ENV);
  console.log('🐛 DEBUG: Context environment:', JSON.stringify(context, null, 2));
  
  // DEBUG: Check all environment variables (be careful not to log sensitive data in full)
  console.log('🐛 DEBUG: Environment variables available:');
  Object.keys(process.env).forEach(key => {
    if (key.includes('GEMINI') || key.includes('API')) {
      // Show partial value for API keys for security
      const value = process.env[key];
      const displayValue = value ? `${value.substring(0, 10)}...` : 'undefined';
      console.log(`  ${key}: ${displayValue}`);
    } else {
      console.log(`  ${key}: ${process.env[key] ? 'SET' : 'NOT SET'}`);
    }
  });
  
  // DEBUG: Specifically check GEMINI_API_KEY
  console.log('🐛 DEBUG: GEMINI_API_KEY check:');
  console.log('  Direct access:', process.env.GEMINI_API_KEY ? 'DEFINED' : 'UNDEFINED');
  console.log('  Type:', typeof process.env.GEMINI_API_KEY);
  console.log('  Length:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 'N/A');
  
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
    const { lyrics, songTitle = "Unknown Song" } = JSON.parse(event.body);

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
    console.log('🐛 DEBUG: About to initialize Gemini API');
    
    // Try multiple methods to get the API key
    let apiKey = process.env.GEMINI_API_KEY;
    console.log('🐛 DEBUG: Standard method - apiKey:', apiKey ? 'PRESENT' : 'MISSING');
    
    // If not found, try alternative method
    if (!apiKey) {
      console.log('🐛 DEBUG: Standard method failed, trying alternative methods');
      apiKey = getEnvironmentVariable('GEMINI_API_KEY');
    }
    
    console.log('🐛 DEBUG: Final apiKey status:', apiKey ? 'PRESENT' : 'MISSING');
    console.log('🐛 DEBUG: apiKey type:', typeof apiKey);
    console.log('🐛 DEBUG: apiKey length:', apiKey ? apiKey.length : 'N/A');
    
    if (!apiKey) {
      console.log('❌ ERROR: GEMINI_API_KEY is not available');
      console.log('🐛 DEBUG: Final env var check:');
      console.log('  process.env.GEMINI_API_KEY:', process.env.GEMINI_API_KEY);
      console.log('  Keys containing GEMINI:', Object.keys(process.env).filter(k => k.includes('GEMINI')));
      console.log('  Keys containing API:', Object.keys(process.env).filter(k => k.includes('API')));
      
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Gemini API key not configured',
          debug: {
            nodeEnv: process.env.NODE_ENV,
            envKeysCount: Object.keys(process.env).length,
            hasGeminiKey: !!process.env.GEMINI_API_KEY,
            geminiKeys: Object.keys(process.env).filter(k => k.includes('GEMINI')),
            apiKeys: Object.keys(process.env).filter(k => k.includes('API'))
          }
        })
      };
    }
    
    console.log('✅ SUCCESS: GEMINI_API_KEY found, proceeding with API initialization');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Check cache first
    const cacheKey = generateCacheKey(lyrics, 'coherence');
    if (cache.has(cacheKey)) {
      console.log('Returning cached coherence analysis');
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
    const prompt = createCoherenceAnalysisPrompt(lyrics, songTitle);
    
    lastApiCall.time = Date.now();
    const result = await model.generateContent(prompt);
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
      console.error('Coherence JSON parse error:', parseError);
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
            coherenceScore: 70,
            storyFlow: 'fair',
            thematicUnity: 'fair',
            narrativeConsistency: 'fair',
            sectionConnections: 'fair',
            overallAssessment: 'Analysis completed with technical fallback',
            observations: [],
            references: []
          }
        })
      };
    }
    
    const resultData = {
      success: true,
      fromCache: false,
      ...analysisData
    };
    
    // Cache the result (only successful analyses)
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
    console.error('Error analyzing lyrical coherence:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        fromCache: false
      })
    };
  }
};