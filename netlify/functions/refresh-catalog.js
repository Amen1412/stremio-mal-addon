const tmdb = require('../../utils/tmdb');
const cache = require('../../utils/cache');

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  console.log('Starting scheduled catalog refresh...');

  try {
    cache.flush();
    console.log('Cache cleared');

    let refreshedCount = 0;
    const errors = [];

    // Refresh latest Malayalam movies (first 5 pages)
    for (let page = 1; page <= 5; page++) {
      try {
        const response = await tmdb.discoverMalayalamMovies({ 
          page, 
          sortBy: 'release_date.desc' 
        });
        
        if (response && response.results) {
          refreshedCount += response.results.length;
          console.log(`Page ${page}: ${response.results.length} movies refreshed`);
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error refreshing page ${page}:`, error.message);
        errors.push(`Page ${page}: ${error.message}`);
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      moviesRefreshed: refreshedCount,
      errors: errors.length > 0 ? errors : null
    };

    console.log('Catalog refresh completed:', result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2)
    };

  } catch (error) {
    console.error('Catalog refresh failed:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message
      })
    };
  }
};
