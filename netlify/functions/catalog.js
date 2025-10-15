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
    console.log('Full request path:', event.path);
    console.log('Query parameters:', event.queryStringParameters);

    // Extract path without .json extension if present
    const cleanPath = event.path.replace(/\.json$/, '');
    console.log('Clean path:', cleanPath);

    // Simple check for catalog requests
    if (!cleanPath.includes('/catalog/') && !event.path.includes('/catalog/')) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Not a catalog endpoint' })
      };
    }

    const queryParams = event.queryStringParameters || {};
    const skip = parseInt(queryParams.skip || '0');
    const genre = queryParams.genre;
    
    console.log(`Catalog request - Skip: ${skip}, Genre: ${genre || 'none'}`);

    // Get Malayalam movies
    const page = Math.floor(skip / 20) + 1;
    const discoverOptions = {
      page,
      genre,
      sortBy: 'release_date.desc'
    };
    
    console.log('Calling TMDB with options:', discoverOptions);
    const response = await tmdb.discoverMalayalamMovies(discoverOptions);
    console.log('TMDB response received, movies count:', response.results?.length || 0);
    
    const movies = response.results || [];

    const metas = movies
      .map(movie => tmdb.movieToStremioMeta(movie))
      .filter(meta => meta !== null)
      .slice(0, 20);

    console.log(`Returning ${metas.length} movies`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ metas: metas })
    };

  } catch (error) {
    console.error('Catalog error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        path: event.path
      })
    };
  }
};
