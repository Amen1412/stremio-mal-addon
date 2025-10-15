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
      timeout: 10000 // 10 second timeout
    });
  }

  /**
   * Discover Malayalam movies available on OTT platforms
   * @param {object} options - Query options
   * @returns {Promise<object>} TMDB API response
   */
  async discoverMalayalamMovies(options = {}) {
  const { page = 1, genre = null, sortBy = 'release_date.desc' } = options;
  const cacheKey = `discover_ml_${page}_${genre || 'all'}_${sortBy}`;
  
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    // FIRST: Get movies by searching for Malayalam terms
    const searchTerms = [
      'Malayalam', 'മലയാളം', 'Mollywood', 'Kerala', 'Kochi', 'Thiruvananthapuram'
    ];
    
    let allMovies = [];
    
    // Search approach - more reliable for Malayalam movies
    for (const term of searchTerms) {
      try {
        const response = await this.api.get('/search/movie', {
          params: {
            query: term,
            page: page,
            language: 'en-US',
            include_adult: false,
            region: 'IN'
          }
        });
        
        // Filter for actual Malayalam movies
        const malayalamMovies = response.data.results.filter(movie => 
          movie.original_language === 'ml' && 
          movie.release_date &&
          new Date(movie.release_date) <= new Date()
        );
        
        allMovies.push(...malayalamMovies);
      } catch (err) {
        console.log(`Search failed for term: ${term}`);
      }
    }

    // Remove duplicates and sort by release date
    const uniqueMovies = allMovies.filter((movie, index, self) => 
      index === self.findIndex(m => m.id === movie.id)
    );
    
    uniqueMovies.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
    
    // Apply genre filter if specified
    let filteredMovies = uniqueMovies;
    if (genre) {
      const genreId = getGenreId(genre);
      if (genreId) {
        filteredMovies = uniqueMovies.filter(movie => 
          movie.genre_ids && movie.genre_ids.includes(genreId)
        );
      }
    }

    const result = {
      page: page,
      results: filteredMovies.slice(0, 20), // Limit to 20 per page
      total_pages: Math.ceil(filteredMovies.length / 20),
      total_results: filteredMovies.length
    };

    cache.set(cacheKey, result, 1800);
    return result;
    
  } catch (error) {
    console.error('Malayalam movie search error:', error.message);
    throw new Error(`Malayalam movie search failed: ${error.message}`);
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
          include_adult: false
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
