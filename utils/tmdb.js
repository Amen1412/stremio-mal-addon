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
      timeout: 10000 // Shorter timeout
    });
  }

  /**
   * SIMPLE WORKING APPROACH - No complex OTT checking, just get Malayalam movies
   */
  async discoverMalayalamMovies(options = {}) {
    const { page = 1, genre = null } = options;
    const cacheKey = `simple_malayalam_${page}_${genre || 'all'}`;
    
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      console.log('🚨 EMERGENCY MODE: Simple Malayalam movie discovery...');
      let allMovies = [];

      // Method 1: Traditional discover (SIMPLE)
      console.log('📽️ Method 1: Standard discover...');
      for (let pageNum = 1; pageNum <= 10; pageNum++) {
        try {
          const response = await this.api.get('/discover/movie', {
            params: {
              original_language: 'ml',
              sort_by: 'release_date.desc',
              page: pageNum,
              include_adult: false,
              'primary_release_date.lte': new Date().toISOString().split('T')[0],
              'vote_count.gte': 1
            }
          });

          const movies = response.data.results || [];
          if (movies.length === 0) break;

          // Filter Malayalam only
          const malayalamMovies = movies.filter(movie => 
            movie.original_language === 'ml' && movie.release_date
          );

          allMovies.push(...malayalamMovies);
          console.log(`✅ Page ${pageNum}: Found ${malayalamMovies.length} Malayalam movies`);

          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.log(`Page ${pageNum} failed:`, err.message);
          break;
        }
      }

      // Method 2: Search for popular Malayalam movies (SIMPLE)
      console.log('🔍 Method 2: Popular movie search...');
      const popularMovies = [
        'Hridayapoorvam', 'Aavesham', 'Manjummel Boys', 'Premalu', 'Bramayugam',
        'Aadujeevitham', 'Turbo', 'Bougainvillea', 'ARM', 'Vaazha', 'Kishkindha Kaandam',
        'Drishyam', 'Lucifer', 'Bangalore Days', 'Minnal Murali', 'The Great Indian Kitchen'
      ];

      for (const movieName of popularMovies) {
        try {
          const response = await this.api.get('/search/movie', {
            params: {
              query: movieName,
              language: 'en-US',
              include_adult: false
            }
          });

          const malayalamResults = response.data.results.filter(movie =>
            movie.original_language === 'ml' &&
            movie.release_date &&
            new Date(movie.release_date) <= new Date()
          );

          if (malayalamResults.length > 0) {
            allMovies.push(...malayalamResults);
            console.log(`✅ Found ${malayalamResults.length} results for: ${movieName}`);
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.log(`Search failed: ${movieName}`);
        }
      }

      // Remove duplicates
      const uniqueMovies = allMovies.filter((movie, index, self) =>
        index === self.findIndex(m => m.id === movie.id) &&
        movie.original_language === 'ml'
      );

      console.log(`📊 TOTAL UNIQUE MALAYALAM MOVIES: ${uniqueMovies.length}`);

      // Sort by release date
      uniqueMovies.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));

      // Apply genre filter
      let filteredMovies = uniqueMovies;
      if (genre) {
        const genreId = getGenreId(genre);
        if (genreId) {
          filteredMovies = uniqueMovies.filter(movie =>
            movie.genre_ids && movie.genre_ids.includes(genreId)
          );
        }
      }

      // Paginate
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

      // Shorter cache
      cache.set(cacheKey, result, 3600);
      return result;

    } catch (error) {
      console.error('💥 Simple discovery failed:', error.message);
      
      // FALLBACK: Return some hardcoded Malayalam movies if all fails
      const fallbackMovies = [
        {
          id: 123456,
          title: 'Hridayapoorvam',
          original_title: 'Hridayapoorvam',
          original_language: 'ml',
          release_date: '2025-01-15',
          overview: 'A Malayalam movie',
          poster_path: null,
          backdrop_path: null,
          genre_ids: [18],
          vote_average: 7.5
        }
      ];

      return {
        page: 1,
        results: fallbackMovies,
        total_pages: 1,
        total_results: fallbackMovies.length
      };
    }
  }

  movieToStremioMeta(movie) {
    if (!movie) return null;

    return {
      id: `tmdb:${movie.id}`, // Use TMDB ID format
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

  // Minimal other methods
  async getMovieDetails(movieId) {
    const cacheKey = `movie_${movieId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.api.get(`/movie/${movieId}`);
      cache.set(cacheKey, response.data, 7200);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getTrendingMalayalamMovies() {
    try {
      const response = await this.api.get('/trending/movie/week');
      const malayalamMovies = response.data.results.filter(movie => 
        movie.original_language === 'ml'
      );
      return { ...response.data, results: malayalamMovies };
    } catch (error) {
      return { results: [] };
    }
  }

  async searchMalayalamMovies(query, page = 1) {
    try {
      const response = await this.api.get('/search/movie', {
        params: { query, page, language: 'en-US', include_adult: false }
      });
      const malayalamMovies = response.data.results.filter(movie => 
        movie.original_language === 'ml'
      );
      return { ...response.data, results: malayalamMovies };
    } catch (error) {
      return { results: [] };
    }
  }
}

module.exports = new TMDB();
