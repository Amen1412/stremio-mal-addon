/**
 * OTT Platform Provider IDs for TMDB API
 * These are the major platforms that show Malayalam content in India
 */

const PROVIDERS = {
  NETFLIX: 8,
  PRIME_VIDEO: 119,
  SONYLIV: 237,
  ZEE5: 232,
  JIOHOTSTAR: 433,
  SUN_NXT: 309,
  MANORAMA_MAX: 542
};

// Combined provider IDs for API queries
const PROVIDER_LIST = Object.values(PROVIDERS).join('|');

// Provider names for display
const PROVIDER_NAMES = {
  8: 'Netflix',
  119: 'Amazon Prime Video',
  237: 'SonyLIV',
  232: 'ZEE5',
  433: 'JioHotstar',
  309: 'Sun NXT',
  542: 'ManoramaMAX'
};

module.exports = {
  PROVIDERS,
  PROVIDER_LIST,
  PROVIDER_NAMES
};
