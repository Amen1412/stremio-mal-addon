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
      timeout: 15000
    });
  }

  /**
   * Get ALL Malayalam movies from multiple sources and approaches
   */
  async discoverMalayalamMovies(options = {}) {
    const { page = 1, genre = null } = options;
    const cacheKey = `malayalam_all_movies_${page}_${genre || 'all'}`;
    
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      console.log('🎬 Starting comprehensive Malayalam movie search...');
      let allMalayalamMovies = [];

      // METHOD 1: Direct search for popular Malayalam movies by name
      const malayalamHits = [
        // 2024-2025 releases
        'Hridayapoorvam', 'Aavesham', 'Manjummel Boys', 'Premalu', 'Bramayugam', 'Identity',
        'Aadujeevitham', 'Turbo', 'Bougainvillea', 'ARM', 'Vaazha', 'Kishkindha Kaandam',
        'Guruvayoor Ambalanadayil', 'Varshangalkku Shesham', 'Anweshippin Kandethum', 'Barroz',
        'Marco', 'Malaikottai Vaaliban', 'Jai Ganesh', 'Neru', 'RDX', 'Jawan of Vellimala',
        
        // Popular older releases
        'Kanguva', 'Ajayante Randam Moshanam', 'Kappela', 'The Great Indian Kitchen',
        'Drishyam', 'Lucifer', 'Bangalore Days', 'Minnal Murali', 'Kumbakonam Gopals',
        'Kaathal The Core', 'Fahadh Faasil', 'Mohanlal', 'Mammootty', 'Tovino Thomas',
        
        // More Malayalam films
        'Unda', 'Joseph', 'Virus', 'Take Off', 'Maheshinte Prathikaaram', 'Angamaly Diaries',
        'Parava', 'Thondimuthalum Driksakshiyum', 'Ee.Ma.Yau', 'Kumbakonam Gopals',
        'C U Soon', 'Lijo Jose Pellissery', 'Soubin Shahir', 'Nivin Pauly', 'Dulquer Salmaan'
      ];

      console.log('🔍 Searching for specific Malayalam movies...');
      for (const movieName of malayalamHits) {
        try {
          const searchResponse = await this.api.get('/search/movie', {
            params: {
              query: movieName,
              language: 'en-US',
              region: 'IN',
              include_adult: false
            }
          });
          
          // Filter ONLY Malayalam movies
          const malayalamResults = searchResponse.data.results.filter(movie => 
            movie.original_language === 'ml' && 
            movie.release_date &&
            new Date(movie.release_date) <= new Date() // Only released movies
          );
          
          if (malayalamResults.length > 0) {
            allMalayalamMovies.push(...malayalamResults);
            console.log(`✅ Found ${malayalamResults.length} Malayalam results for: ${movieName}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 50)); // Rate limiting
        } catch (err) {
          console.log(`❌ Search failed for: ${movieName}`);
        }
      }

      // METHOD 2: Search by Malayalam terms
      const malayalamTerms = ['Malayalam', 'മലയാളം', 'Mollywood', 'Kerala film', 'Malayalam movie'];
      console.log('🏷️ Searching by Malayalam terms...');
      
      for (const term of malayalamTerms) {
        try {
          for (let pageNum = 1; pageNum <= 5; pageNum++) {
            const response = await this.api.get('/search/movie', {
              params: {
                query: term,
                page: pageNum,
                language: 'en-US',
                include_adult: false,
                region: 'IN'
              }
            });
            
            // STRICT filter for Malayalam language only
            const malayalamMovies = response.data.results.filter(movie => 
              movie.original_language === 'ml' && 
              movie.release_date &&
              new Date(movie.release_date) <= new Date() &&
              movie.vote_count > 0 // Has some votes
            );
            
            allMalayalamMovies.push(...malayalamMovies);
            console.log(`✅ Term "${term}" page ${pageNum}: Found ${malayalamMovies.length} Malayalam movies`);
            
            if (response.data.results.length < 20) break;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (err) {
          console.log(`❌ Search failed for term: ${term}`);
        }
      }

      // METHOD 3: Discover with Malayalam language (backup)
      console.log('🎯 Using discover API as backup...');
      try {
        for (let pageNum = 1; pageNum <= 10; pageNum++) {
          const discoverResponse = await this.api.get('/discover/movie', {
            params: {
              original_language: 'ml',
              sort_by: 'release_date.desc',
              page: pageNum,
              include_adult: false,
              'primary_release_date.lte': new Date().toISOString().split('T')[0],
              'vote_count.gte': 1
            }
          });
          
          const movies = discoverResponse.data.results || [];
          if (movies.length === 0) break;
          
          // Double-check language
          const malayalamOnly = movies.filter(movie => movie.original_language === 'ml');
          allMalayalamMovies.push(...malayalamOnly);
          
          console.log(`✅ Discover page ${pageNum}: Found ${malayalamOnly.length} Malayalam movies`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (err) {
        console.log('❌ Discover method failed');
      }

      // Remove duplicates and clean up
      console.log('🧹 Removing duplicates and sorting...');
      const uniqueMovies = allMalayalamMovies.filter((movie, index, self) => 
        index === self.findIndex(m => m.id === movie.id) &&
        movie.original_language === 'ml' // Triple check Malayalam language
      );
      
      console.log(`📊 Total unique Malayalam movies found: ${uniqueMovies.length}`);

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

      console.log(`📄 Returning page ${page}: ${paginatedMovies.length} Malayalam movies`);
      console.log(`🎬 Sample movie check:`, paginatedMovies[0]?.original_title, 'Lang:', paginatedMovies[0]?.original_language);

      // Cache for 2 hours since comprehensive search
      cache.set(cacheKey, result, 7200);
      return result;
      
    } catch (error) {
      console.error('❌ Malayalam movie comprehensive search error:', error.message);
      throw new Error(`Malayalam movie search failed: ${error.message}`);
    }
  }

  movieToStremioMeta(movie) {
    if (!movie || movie.original_language !== 'ml') {
      return null; // Extra safety check
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

  // Keep other methods as they were...
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
      console.error('Error fetching trending movies:', error.message);
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
      console.error('Search error:', error.message);
      throw error;
    }
  }
}

module.exports = new TMDB();
