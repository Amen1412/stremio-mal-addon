const axios = require('axios');
const cache = require('./cache');
const { PROVIDER_LIST } = require('../constants/providers');
const { getGenreNames, getGenreId } = require('../constants/genres');

/**
 * TMDB API utility class
 * Handles all interactions with The Movie Database API
 */
class TMDB {
  constructor() {
    this.baseURL = 'https://api.themoviedb.org/3';
    this.imageBaseURL = 'https://image.tmdb.org/t/p/w500';
    
    // Create axios instance with default headers
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 second timeout for comprehensive search
    });
  }

  /**
   * Discover ALL Malayalam movies available on OTT platforms
   * @param {object} options - Query options
   * @returns {Promise<object>} TMDB API response
   */
  async discoverMalayalamMovies(options = {}) {
    const { page = 1, genre = null } = options;
    const cacheKey = `discover_ml_all_${page}_${genre || 'all'}`;
    
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      console.log('Starting comprehensive Malayalam movie search...');
      let allMovies = [];

      // Method 1: Direct discover with Malayalam language (with OTT providers)
      try {
        console.log('Method 1: Direct discover with OTT providers...');
        for (let pageNum = 1; pageNum <= 10; pageNum++) {
          const discoverResponse = await this.api.get('/discover/movie', {
            params: {
              original_language: 'ml',
              with_watch_providers: PROVIDER_LIST,
              watch_region: 'IN',
              sort_by: 'release_date.desc',
              page: pageNum,
              include_adult: false,
              'primary_release_date.lte': new Date().toISOString().split('T')[0]
            }
          });
          
          const movies = discoverResponse.data.results || [];
          if (movies.length === 0) break;
          
          allMovies.push(...movies);
          console.log(`Page ${pageNum}: Found ${movies.length} movies`);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (err) {
        console.log('Method 1 failed:', err.message);
      }

      // Method 2: Search for popular recent Malayalam movies by name
      const recentMalayalamMovies = [
        'Hridayapoorvam', 'Aavesham', 'Manjummel Boys', 'Premalu', 'Bramayugam',
        'Aadujeevitham', 'Turbo', 'Bougainvillea', 'ARM', 'Vaazha', 'Kishkindha Kaandam',
        'Barroz', 'Marco', 'Identity', 'Malaikottai Vaaliban', 'Bramayugam',
        'Guruvayoor Ambalanadayil', 'Varshangalkku Shesham', 'Anweshippin Kandethum',
        'Jai Ganesh', 'Neru', 'RDX', 'Jawan of Vellimala', 'Kaathal The Core',
        'Kanguva', 'Ajayante Randam Moshanam', 'Kappela', 'The Great Indian Kitchen',
        'Drishyam', 'Lucifer', 'Bangalore Days', 'Kumbakonam Gopals', 'Minnal Murali'
      ];

      console.log('Method 2: Searching for specific Malayalam movies...');
      for (const movieName of recentMalayalamMovies) {
        try {
          const searchResponse = await this.api.get('/search/movie', {
            params: {
              query: movieName,
              language: 'en-US',
              region: 'IN',
              include_adult: false
            }
          });
          
          const malayalamResults = searchResponse.data.results.filter(movie => 
            movie.original_language === 'ml' && 
            movie.release_date &&
            new Date(movie.release_date) <= new Date()
          );
          
          if (malayalamResults.length > 0) {
            allMovies.push(...malayalamResults);
            console.log(`Found ${malayalamResults.length} results for: ${movieName}`);
          }
          
          // Small delay
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (err) {
          console.log(`Search failed for: ${movieName}`);
        }
      }

      // Method 3: Search by Malayalam terms
      const searchTerms = ['Malayalam', 'മലയാളം', 'Mollywood', 'Kerala'];
      console.log('Method 3: Searching by Malayalam terms...');
      
      for (const term of searchTerms) {
        try {
          for (let pageNum = 1; pageNum <= 3; pageNum++) {
            const response = await this.api.get('/search/movie', {
              params: {
                query: term,
                page: pageNum,
                language: 'en-US',
                include_adult: false,
                region: 'IN'
              }
            });
            
            const malayalamMovies = response.data.results.filter(movie => 
              movie.original_language === 'ml' && 
              movie.release_date &&
              new Date(movie.release_date) <= new Date()
            );
            
            allMovies.push(...malayalamMovies);
            
            if (response.data.results.length < 20) break;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (err) {
          console.log(`Search failed for term: ${term}`);
        }
      }

      // Remove duplicates based on movie ID
      console.log('Removing duplicates and sorting...');
      const uniqueMovies = allMovies.filter((movie, index, self) => 
        index === self.findIndex(m => m.id === movie.id)
      );
      
      console.log(`Total unique Malayalam movies found: ${uniqueMovies.length}`);

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
        console.log(`After genre filter (${genre}): ${filteredMovies.length} movies`);
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

      console.log(`Returning page ${page}: ${paginatedMovies.length} movies`);

      // Cache for 2 hours since we did comprehensive search
      cache.set(cacheKey, result, 7200);
      return result;
      
    } catch (error) {
      console.error('Malayalam movie comprehensive search error:', error.message);
      throw new Error(`Malayalam movie search failed: ${error.message}`);
    }
  }

  /**
   * Get movie details by ID with OTT availability check
   * @param {number} movieId - TMDB movie ID
   * @returns {Promise<object>} Movie details
   */
  async getMovieDetails(movieId) {
    const cacheKey = `movie_${movieId}`;
    
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.api.get(`/movie/${movieId}`, {
        params: {
          append_to_response: 'watch/providers'
        }
      });
      
      cache.set(cacheKey, response.data, 7200); // Cache for 2 hours
      return response.data;
    } catch (error) {
      console.error(`Error fetching movie ${movieId}:`, error.message);
      throw error;
    }
  }

  /**
   * Convert TMDB movie data to Stremio meta format
   * @param {object} movie - TMDB movie object
   * @returns {object} Stremio meta object
   */
  movieToStremioMeta(movie) {
    if (!movie) {
      return null;
    }

    return {
      id: `tmdb:${movie.id}`,
      type: 'movie',
      name: movie.title || movie.original_title,
      poster: movie.poster_path ? `${this.imageBaseURL}${movie.poster_path}` : null,
      background: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
      genres: movie.genre_ids ? getGenreNames(movie.genre_ids) : [],
      releaseInfo: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : null,
      imdbRating: movie.vote_average ? movie.vote_average.toFixed(1) : null,
      description: movie.overview || 'No description available',
      runtime: movie.runtime ? `${movie.runtime} min` : null
    };
  }

  /**
   * Get trending Malayalam movies
   * @returns {Promise<object>} Trending movies
   */
  async getTrendingMalayalamMovies() {
    const cacheKey = 'trending_malayalam';
    
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.api.get('/trending/movie/week');

      // Filter for Malayalam movies only
      const malayalamMovies = response.data.results.filter(movie => 
        movie.original_language === 'ml'
      );

      const result = {
        ...response.data,
        results: malayalamMovies
      };

      cache.set(cacheKey, result, 3600); // Cache for 1 hour
      return result;
    } catch (error) {
      console.error('Error fetching trending movies:', error.message);
      throw error;
    }
  }

  /**
   * Search Malayalam movies
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @returns {Promise<object>} Search results
   */
  async searchMalayalamMovies(query, page = 1) {
    const cacheKey = `search_${query}_${page}`;
    
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.api.get('/search/movie', {
        params: {
          query: query,
          page: page,
          language: 'en-US',
          include_adult: false,
          region: 'IN'
        }
      });

      // Filter for Malayalam movies
      const malayalamMovies = response.data.results.filter(movie => 
        movie.original_language === 'ml'
      );

      const result = {
        ...response.data,
        results: malayalamMovies
      };

      cache.set(cacheKey, result, 1800); // Cache for 30 minutes
      return result;
    } catch (error) {
      console.error('Search error:', error.message);
      throw error;
    }
  }
}

module.exports = new TMDB();
