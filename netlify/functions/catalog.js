const tmdb = require('../../utils/tmdb');

exports.handler = async (event, context) => {
  // Comprehensive CORS headers for Stremio compatibility
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'public, max-age=1800'
  };

  // Handle preflight OPTIONS requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('=== CATALOG REQUEST ===');
    console.log('Path:', event.path);
    console.log('Method:', event.httpMethod);
    console.log('Query params:', event.queryStringParameters);
    console.log('Headers:', event.headers);
    
    const queryParams = event.queryStringParameters || {};
    const skip = parseInt(queryParams.skip || '0');
    const genre = queryParams.genre;
    
    console.log(`Processing - Skip: ${skip}, Genre: ${genre || 'none'}`);

    // Get Malayalam movies
    const page = Math.floor(skip / 20) + 1;
    const discoverOptions = {
      page,
      genre,
      sortBy: 'release_date.desc'
    };
    
    console.log('Fetching from TMDB with options:', discoverOptions);
    const response = await tmdb.discoverMalayalamMovies(discoverOptions);
    console.log('TMDB response received - Movies count:', response.results?.length || 0);
    
    const movies = response.results || [];

    // Convert to Stremio format
    const metas = movies
      .map(movie => tmdb.movieToStremioMeta(movie))
      .filter(meta => meta !== null)
      .slice(0, 20);

    console.log(`Returning ${metas.length} movies to Stremio`);

    const responseData = { metas: metas };
    console.log('Final response preview:', JSON.stringify(responseData, null, 2).substring(0, 500) + '...');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    };

  } catch (error) {
    console.error('=== CATALOG ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
