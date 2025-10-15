const NodeCache = require('node-cache');

/**
 * Simple in-memory cache for API responses
 * Helps reduce TMDB API calls and improves performance
 */
class Cache {
  constructor() {
    // Cache for 1 hour by default, or use environment variable
    const ttl = parseInt(process.env.CACHE_DURATION) || 3600;
    this.cache = new NodeCache({ stdTTL: ttl });
    
    console.log(`Cache initialized with TTL: ${ttl} seconds`);
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if not found
   */
  get(key) {
    const value = this.cache.get(key);
    if (value) {
      console.log(`Cache HIT for key: ${key}`);
      return value;
    }
    console.log(`Cache MISS for key: ${key}`);
    return null;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   */
  set(key, value, ttl = null) {
    if (ttl) {
      this.cache.set(key, value, ttl);
    } else {
      this.cache.set(key, value);
    }
    console.log(`Cache SET for key: ${key}`);
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  del(key) {
    this.cache.del(key);
    console.log(`Cache DELETE for key: ${key}`);
  }

  /**
   * Clear all cache
   */
  flush() {
    this.cache.flushAll();
    console.log('Cache FLUSHED');
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getStats() {
    return this.cache.getStats();
  }
}

// Export singleton instance
module.exports = new Cache();
