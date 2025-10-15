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
      timeout: 10000
    });
  }

  async discoverMalayalamMovies(options = {}) {
    const { page = 1, genre = null, sortBy = 'release_date.desc' } = options;

    const cacheKey = `discover_ml_${page}_${genre || 'all'}_${sortBy}`;
    
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        api_key: process.env.TMDB_API_KEY,
        original_language: 'ml',
        with_watch_providers: PROVIDER_LIST,
        watch_region: 'IN',
        sort_by: sortBy,
        include_adult: false,
        page: page,
        'vote_count.gte': 1
      };

      if (genre) {
        const genreId = getGenreId(genre);
        if (genreId) params.with_genres = genreId;
      }

      console.log(`Fetching Malayalam movies - Page: ${page}, Genre: ${genre || 'all'}`);
      
      const response = await this.api.get('/discover/movie', { params });
      cache.set(cacheKey, response.data, 1800);
      
      return response.data;
    } catch (error) {
      console.error('TMDB API Error:', error.message);
      throw new Error(`TMDB API request failed: ${error.message}`);
    }
  }

  movieToStremioMeta(movie) {
    if (!movie) return null;

    return {
      id: `tmdb:${movie.id}`,
      type: 'movie',
      name: movie.title || movie.original_title,
      poster: movie.poster_path ? `${this.imageBaseURL}${movie.poster_path}` : null,
      background: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
      genres: movie.genre_ids ? getGenreNames(movie.genre_ids) : [],
      releaseInfo: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : null,
      imdbRating: movie.vote_average ? movie.vote_average.toFixed(1) : null,
      description: movie.overview || 'No description available'
    };
  }
}

module.exports = new TMDB();
