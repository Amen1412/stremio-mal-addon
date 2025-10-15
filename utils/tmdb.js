const axios = require('axios');
const cache = require('./cache');
const { PROVIDER_LIST } = require('../constants/providers');
const { getGenreNames, getGenreId } = require('../constants/genres');

class TMDB {
  constructor() {
    this.baseURL = 'https://api.themoviedb.org/3';
    this.imageBaseURL = 'https://image.tmdb.org/t/p/w500';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * TRADITIONAL METHOD BASED ON FLASK EXAMPLE - Gets ALL Malayalam OTT movies
   */
  async discoverMalayalamMovies(options = {}) {
    const { page = 1, genre = null } = options;
    const cacheKey = `traditional_malayalam_all_${page}_${genre || 'all'}`;
    
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      console.log('🎬 TRADITIONAL METHOD: Fetching ALL Malayalam OTT movies...');
      let allMovies = [];
      const today = new Date().toISOString().split('T')[0];

      // ===== PRIMARY METHOD: Traditional discover like Flask example =====
      console.log('🎯 Discovering Malayalam movies with OTT availability...');
      
      for (let pageNum = 1; pageNum <= 100; pageNum++) { // Go through many pages like Flask
        console.log(`[INFO] Checking page ${pageNum}`);
        
        try {
          // Step 1: Discover Malayalam movies (like Flask)
          const discoverResponse = await this.api.get('/discover/movie', {
            params: {
              with_original_language: 'ml',
              sort_by: 'release_date.desc',
              'release_date.lte': today,
              region: 'IN',
              page: pageNum,
              include_adult: false
            }
          });

          const movies = discoverResponse.data.results || [];
          if (movies.length === 0) {
            console.log(`[INFO] No more movies found on page ${pageNum}. Stopping.`);
            break;
          }

          // Step 2: Check each movie for OTT availability (like Flask)
          for (const movie of movies) {
            const movieId = movie.id;
            const title = movie.title;
            
            if (!movieId || !title) continue;

            try {
              // Check OTT availability (like Flask does)
              const providersResponse = await this.api.get(`/movie/${movieId}/watch/providers`);
              const providerData = providersResponse.data;

              // Check if available on OTT in India (like Flask)
              if (providerData.results && 
                  providerData.results.IN && 
                  providerData.results.IN.flatrate) {
                
                console.log(`✅ ${title} - Available on OTT in India`);
                
                // Get external IDs for IMDb ID (like Flask)
                try {
                  const externalResponse = await this.api.get(`/movie/${movieId}/external_ids`);
                  const externalData = externalResponse.data;
                  const imdbId = externalData.imdb_id;
                  
                  if (imdbId && imdbId.startsWith('tt')) {
                    movie.imdb_id = imdbId;
                    allMovies.push(movie);
                  }
                } catch (extErr) {
                  console.log(`External ID fetch failed for: ${title}`);
                }
              }
              
              // Rate limiting
              await new Promise(resolve => setTimeout(resolve, 50));
              
            } catch (provErr) {
              console.log(`Provider check failed for: ${title}`);
            }
          }

          // Page-level rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (pageErr) {
          console.error(`[ERROR] Page ${pageNum} failed:`, pageErr.message);
          break;
        }
      }

      // ===== SUPPLEMENTARY METHODS (for additional coverage) =====
      console.log('📈 SUPPLEMENTARY: Adding extra coverage...');

      // Method 2: Popular Malayalam actors (supplementary)
      const topActors = ['Mohanlal', 'Mammootty', 'Fahadh Faasil', 'Dulquer Salmaan'];
      for (const actor of topActors.slice(0, 2)) { // Limit to avoid timeout
        try {
          console.log(`🌟 Checking ${actor}'s filmography...`);
          const personSearch = await this.api.get('/search/person', {
            params: { query: actor, language: 'en-US' }
          });

          if (personSearch.data.results.length > 0) {
            const personId = personSearch.data.results[0].id;
            const credits = await this.api.get(`/person/${personId}/movie_credits`);
            
            if (credits.data.cast) {
              const malayalamMovies = credits.data.cast.filter(movie => 
                movie.original_language === 'ml' && 
                movie.release_date && 
                new Date(movie.release_date) <= new Date()
              ).slice(0, 10); // Limit per actor
              
              // Check OTT availability for these too
              for (const movie of malayalamMovies) {
                try {
                  const providersResponse = await this.api.get(`/movie/${movie.id}/watch/providers`);
                  const providerData = providersResponse.data;

                  if (providerData.results?.IN?.flatrate) {
                    const externalResponse = await this.api.get(`/movie/${movie.id}/external_ids`);
                    const imdbId = externalResponse.data.imdb_id;
                    
                    if (imdbId && imdbId.startsWith('tt')) {
                      movie.imdb_id = imdbId;
                      allMovies.push(movie);
                    }
                  }
                  await new Promise(resolve => setTimeout(resolve, 100));
                } catch (err) {
                  // Skip if provider check fails
                }
              }
            }
          }
        } catch (err) {
          console.log(`Actor search failed: ${actor}`);
        }
      }

      // ===== DEDUPLICATE AND PROCESS (like Flask) =====
      console.log('🧹 Deduplicating and processing...');
      
      // Deduplicate by IMDb ID (like Flask does)
      const seenIds = new Set();
      const uniqueMovies = [];
      
      for (const movie of allMovies) {
        const imdbId = movie.imdb_id;
        if (imdbId && !seenIds.has(imdbId)) {
          seenIds.add(imdbId);
          uniqueMovies.push(movie);
        }
      }

      console.log(`📊 TOTAL UNIQUE MALAYALAM OTT MOVIES: ${uniqueMovies.length}`);

      // Sort by release date (newest first)
      uniqueMovies.sort((a, b) => {
        const dateA = new Date(a.release_date || '1900-01-01');
        const dateB = new Date(b.release_date || '1900-01-01');
        return dateB - dateA;
      });

      // Apply genre filter if specified
      let filteredMovies = uniqueMovies;
      if (genre) {
        const genreId = getGenreId(genre);
        if (genreId) {
          filteredMovies = uniqueMovies.filter(movie => 
            movie.genre_ids && movie.genre_ids.includes(genreId)
          );
        }
        console.log(`🎭 After genre filter (${genre}): ${filteredMovies.length} movies`);
      }

      // Paginate results (20 per page)
      const startIndex = (page - 1) * 20;
      const endIndex = startIndex + 20;
      const paginatedMovies = filteredMovies.slice(startIndex, endIndex);

      const result = {
        page: page,
        results: paginatedMovies,
        total_pages: Math.ceil(filteredMovies.length / 20),
        total_results: filteredMovies.length
      };

      console.log(`📄 Returning page ${page}: ${paginatedMovies.length} movies`);
      console.log(`🎬 Sample movies:`, paginatedMovies.slice(0, 3).map(m => `${m.title} (${m.release_date})`));

      // Cache for 4 hours (longer since this is comprehensive)
      cache.set(cacheKey, result, 14400);
      return result;

    } catch (error) {
      console.error('💥 Traditional Malayalam OTT discovery failed:', error.message);
      throw new Error(`Malayalam OTT movie discovery failed: ${error.message}`);
    }
  }

  /**
   * Convert TMDB movie to Stremio format (like Flask)
   */
  movieToStremioMeta(movie) {
    if (!movie) return null;

    try {
      const imdbId = movie.imdb_id;
      const title = movie.title;
      if (!imdbId || !title) return null;

      return {
        id: imdbId, // Use IMDb ID like Flask does
        type: 'movie',
        name: title,
        poster: movie.poster_path ? `${this.imageBaseURL}${movie.poster_path}` : null,
        description: movie.overview || '',
        releaseInfo: movie.release_date || '',
        background: movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : null,
        // Additional Stremio fields
        genres: movie.genre_ids ? getGenreNames(movie.genre_ids) : [],
        imdbRating: movie.vote_average ? movie.vote_average.toFixed(1) : null,
        runtime: movie.runtime ? `${movie.runtime} min` : null
      };
    } catch (error) {
      console.error('Error converting to Stremio meta:', error);
      return null;
    }
  }

  // Keep other methods minimal
  async getMovieDetails(movieId) {
    const cacheKey = `movie_${movieId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.api.get(`/movie/${movieId}`, {
        params: { append_to_response: 'watch/providers' }
      });
      cache.set(cacheKey, response.data, 7200);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getTrendingMalayalamMovies() {
    const cacheKey = 'trending_malayalam';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.api.get('/trending/movie/week');
      const malayalamMovies = response.data.results.filter(movie => 
        movie.original_language === 'ml'
      );
      const result = { ...response.data, results: malayalamMovies };
      cache.set(cacheKey, result, 3600);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async searchMalayalamMovies(query, page = 1) {
    const cacheKey = `search_${query}_${page}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.api.get('/search/movie', {
        params: { query, page, language: 'en-US', include_adult: false, region: 'IN' }
      });
      const malayalamMovies = response.data.results.filter(movie => 
        movie.original_language === 'ml'
      );
      const result = { ...response.data, results: malayalamMovies };
      cache.set(cacheKey, result, 1800);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new TMDB();
