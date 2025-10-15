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
    const {
      page = 1,
      genre = null,
      year = null,
      sortBy = 'release_date.desc'
    } = options;

    // Create cache key based on parameters
    const cacheKey = `discover_ml_${page}_${genre || 'all'}_${year || 'all'}_${sortBy}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const params = {
        api_key: process.env.TMDB_API_KEY,
        original_language: 'ml', // Malayalam
        with_watch_providers: PROVIDER_LIST,
        watch_region: 'IN', // India
        sort_by: sortBy,
        include_adult: false,
        page: page,
        'vote_count.gte': 1 // At least 1 vote to filter out unreleased movies
      };

      // Add genre filter if specified
      if (genre) {
        const genreId = getGenreId(genre);
        if (genreId) {
          params.with_genres = genreId;
        }
      }

      // Add year filter if specified
      if (year) {
        params.primary_release_year = year;
      }

      console.log(`Fetching Malayalam movies from TMDB - Page: ${page}, Genre: ${genre || 'all'}`);
      
      const response = await this.api.get('/discover/movie', { params });
      
      // Cache the response
      cache.set(cacheKey, response.data, 1800); // Cache for 30 minutes
      
      return response.data;
    } catch (error) {
      console.error('TMDB API Error:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }
      throw new Error(`TMDB API request failed: ${error.message}`);
    }
  }

  /**
   * Get movie details by ID
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
          api_key: process.env.TMDB_API_KEY,
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
      const response = await this.api.get('/trending/movie/week', {
        params: {
          api_key: process.env.TMDB_API_KEY
        }
      });

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
          api_key: process.env.TMDB_API_KEY,
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
