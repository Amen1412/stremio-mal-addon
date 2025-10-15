exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    console.log('=== TMDB CREDENTIALS TEST ===');
    console.log('TMDB_API_KEY exists:', !!process.env.TMDB_API_KEY);
    console.log('TMDB_ACCESS_TOKEN exists:', !!process.env.TMDB_ACCESS_TOKEN);
    console.log('API Key length:', process.env.TMDB_API_KEY?.length);
    console.log('Access Token length:', process.env.TMDB_ACCESS_TOKEN?.length);
    console.log('API Key preview:', process.env.TMDB_API_KEY?.substring(0, 8) + '...');
    
    // Test a simple TMDB request
    const axios = require('axios');
    
    const response = await axios.get('https://api.themoviedb.org/3/configuration', {
      headers: {
        'Authorization': `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'TMDB API credentials work!',
        apiKeyExists: !!process.env.TMDB_API_KEY,
        accessTokenExists: !!process.env.TMDB_ACCESS_TOKEN,
        testResponse: 'Configuration endpoint responded successfully'
      })
    };

  } catch (error) {
    console.error('TMDB Test Error:', error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        apiKeyExists: !!process.env.TMDB_API_KEY,
        accessTokenExists: !!process.env.TMDB_ACCESS_TOKEN,
        apiKeyLength: process.env.TMDB_API_KEY?.length,
        accessTokenLength: process.env.TMDB_ACCESS_TOKEN?.length
      })
    };
  }
};
