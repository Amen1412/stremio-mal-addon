exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'public, max-age=86400'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const manifest = {
      id: 'org.malayalam.movies.ott.catalog',
      version: '1.0.0',
      name: 'Malayalam Movies OTT',
      description: 'Catalog of Malayalam movies available on OTT platforms in India, sorted by release date',
      
      resources: ['catalog'],
      types: ['movie'],
      
      catalogs: [
        {
          id: 'malayalam_movies_latest',
          type: 'movie',
          name: 'Latest Malayalam Movies',
          description: 'Latest Malayalam movies available on OTT platforms',
          extra: [
            { name: 'skip', isRequired: false },
            { 
              name: 'genre', 
              isRequired: false,
              options: ['Action', 'Comedy', 'Drama', 'Romance', 'Thriller', 'Horror', 'Family', 'Crime', 'Mystery', 'Adventure']
            }
          ]
        }
      ],
      
      behaviorHints: {
        adult: false,
        p2p: false,
        configurable: true,
        configurationRequired: false
      }
    };

    console.log('Manifest requested successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(manifest, null, 2)
    };

  } catch (error) {
    console.error('Manifest error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to generate manifest'
      })
    };
  }
};
