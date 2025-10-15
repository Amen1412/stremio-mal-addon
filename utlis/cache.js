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

  get(key) {
    const value = this.cache.get(key);
    if (value) {
      console.log(`Cache HIT for key: ${key}`);
      return value;
    }
    console.log(`Cache MISS for key: ${key}`);
    return null;
  }

  set(key, value, ttl = null) {
    if (ttl) {
      this.cache.set(key, value, ttl);
    } else {
      this.cache.set(key, value);
    }
    console.log(`Cache SET for key: ${key}`);
  }

  flush() {
    this.cache.flushAll();
    console.log('Cache FLUSHED');
  }

  getStats() {
    return this.cache.getStats();
  }
}

module.exports = new Cache();
