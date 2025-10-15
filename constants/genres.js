/**
 * Movie genre mappings for TMDB API
 * Maps genre IDs to genre names
 */

const GENRE_MAP = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
};

// Reverse mapping for genre name to ID
const GENRE_ID_MAP = Object.fromEntries(
  Object.entries(GENRE_MAP).map(([id, name]) => [name.toLowerCase(), parseInt(id)])
);

/**
 * Get genre name by ID
 * @param {number} genreId - TMDB genre ID
 * @returns {string} Genre name
 */
function getGenreName(genreId) {
  return GENRE_MAP[genreId] || 'Unknown';
}

/**
 * Get genre ID by name
 * @param {string} genreName - Genre name
 * @returns {number|null} TMDB genre ID
 */
function getGenreId(genreName) {
  return GENRE_ID_MAP[genreName.toLowerCase()] || null;
}

/**
 * Convert genre IDs to names
 * @param {number[]} genreIds - Array of TMDB genre IDs
 * @returns {string[]} Array of genre names
 */
function getGenreNames(genreIds) {
  return genreIds.map(id => getGenreName(id)).filter(name => name !== 'Unknown');
}

module.exports = {
  GENRE_MAP,
  GENRE_ID_MAP,
  getGenreName,
  getGenreId,
  getGenreNames
};
