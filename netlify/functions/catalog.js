const tmdb = require('../../utils/tmdb');

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'public, max-age=1800'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const pathParts = event.path.split('/');
    const catalogIndex = pathParts.findIndex(part => part === 'catalog');
    
    if (catalogIndex === -1 || pathParts.length <= catalogIndex + 2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid catalog path',
          message: 'Expected format: /catalog/{type}/{id}'
        })
      };
    }

    const type = pathParts[catalogIndex + 1];
    const catalogId = pathParts[catalogIndex + 2];

    if (type !== 'movie') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid type',
          message: 'Only movie type is supported'
        })
      };
    }

    const queryParams = event.queryStringParameters || {};
    const skip = parseInt(queryParams.skip || '0');
    const genre = queryParams.genre;
    
    console.log(`Catalog request - ID: ${catalogId}, Skip: ${skip}, Genre: ${genre || 'none'}`);

    let movies = [];

    if (catalogId === 'malayalam_movies_latest') {
      const page = Math.floor(skip / 20) + 1;
      const discoverOptions = { page, genre, sortBy: 'release_date.desc' };
      
      const response = await tmdb.discoverMalayalamMovies(discoverOptions);
      movies = response.results || [];
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Catalog not found',
          message: `Catalog '${catalogId}' does not exist`
        })
      };
    }

    const metas = movies
      .map(movie => tmdb.movieToStremioMeta(movie))
      .filter(meta => meta !== null)
      .slice(0, 20);

    console.log(`Returning ${metas.length} movies for catalog ${catalogId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ metas: metas })
    };

  } catch (error) {
    console.error('Catalog error:', error);
    
    if (error.message.includes('TMDB API request failed')) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: 'External API error',
          message: 'Unable to fetch movie data. Please try again later.'
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      })
    };
  }
};
