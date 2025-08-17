// Simple test function to verify Netlify functions are working
exports.handler = async (event, context) => {
  console.log('🚀 Hello function called');
  console.log('Method:', event.httpMethod);
  console.log('Path:', event.path);
  
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ Handling OPTIONS request');
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('✅ Function executed successfully');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Hello from Netlify function!',
        timestamp: new Date().toISOString(),
        method: event.httpMethod,
        path: event.path
      })
    };
  } catch (error) {
    console.error('❌ Function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Function failed',
        message: error.message
      })
    };
  }
};