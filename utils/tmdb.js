async discoverMalayalamMovies(options = {}) {
  const {
    page = 1,
    genre = null,
    year = null,
    sortBy = 'release_date.desc'
  } = options;

  // DEBUG: Check if credentials are loaded
  console.log('TMDB_API_KEY present:', !!process.env.TMDB_API_KEY);
  console.log('TMDB_ACCESS_TOKEN present:', !!process.env.TMDB_ACCESS_TOKEN);
  console.log('API Key length:', process.env.TMDB_API_KEY?.length);
  console.log('Access Token length:', process.env.TMDB_ACCESS_TOKEN?.length);

  const cacheKey = `discover_ml_${page}_${genre || 'all'}_${year || 'all'}_${sortBy}`;
  
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const params = {
      api_key: process.env.TMDB_API_KEY,
      original_language: 'ml',
      with_watch_providers: PROVIDER_LIST,
      watch_region: 'IN',
      sort_by: sortBy,
      include_adult: false,
      page: page,
      'vote_count.gte': 1,
      'primary_release_date.lte': new Date().toISOString().split('T')[0]
    };

    // DEBUG: Log the request details (without exposing full API key)
    console.log('Request params:', {
      ...params,
      api_key: params.api_key ? `${params.api_key.substring(0,8)}...` : 'MISSING'
    });

    console.log(`Fetching Malayalam movies from TMDB - Page: ${page}, Genre: ${genre || 'all'}`);
    
    const response = await this.api.get('/discover/movie', { params });
    
    cache.set(cacheKey, response.data, 1800);
    
    return response.data;
  } catch (error) {
    console.error('TMDB API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw new Error(`TMDB API request failed: ${error.message}`);
  }
}
