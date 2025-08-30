/**
 * Sleeper API Client
 * 
 * Handles all interactions with the Sleeper API including:
 * - Player data fetching and caching
 * - NFL state information
 * - Rate limiting and error handling
 * 
 * @class SleeperAPI
 */
class SleeperAPI {
  /**
   * Creates an instance of SleeperAPI.
   * Initializes cache, rate limiting, and API configuration.
   * 
   * @constructor
   */
  constructor() {
    this.baseURL = 'https://api.sleeper.app/v1';
    this.cache = new Map();
    this.lastFetch = null;
    this.rateLimitDelay = 100; // ms between requests
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Fetch all NFL players with caching and storage management.
   * Attempts to use cached data first, then fetches fresh data if needed.
   * 
   * @param {boolean} [forceRefresh=false] - Whether to bypass cache and fetch fresh data
   * @async
   * @returns {Promise<Object>} Object containing all NFL players indexed by player ID
   */
  async getPlayers(forceRefresh = false) {
    const cacheKey = 'nfl_players';
    
    // Check cache first
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      console.log('🔄 Using cached player data');
      return this.cache.get(cacheKey).data;
    }

    console.log('🔍 Fetching fresh player data from Sleeper API...');
    
    try {
      const response = await this.makeRequest('/players/nfl');
      
      // Cache the response
      this.cache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });

      // Only save metadata to storage (not the full dataset - too large for Chrome storage)
      try {
        const metadata = {
          count: Object.keys(response).length,
          timestamp: Date.now(),
          success: true
        };

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.set({
            sleeper_players_metadata: metadata
          });
          console.log(`💾 Saved metadata to Chrome storage (${metadata.count} players)`);
        } else {
          // Fallback to localStorage
          localStorage.setItem('sleeper_players_metadata', JSON.stringify(metadata));
          console.log(`💾 Saved metadata to localStorage (${metadata.count} players)`);
        }
      } catch (error) {
        console.warn('⚠️ Could not save metadata:', error.message);
        // Continue without storage - not critical
      }

      console.log(`✅ Fetched ${Object.keys(response).length} players`);
      return response;
      
    } catch (error) {
      console.error('❌ Error fetching players:', error);
      
      // Try to use cached data as fallback
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('⚠️ Using stale cached data as fallback');
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Make HTTP request with rate limiting and error handling.
   * Enforces delay between requests to respect API limits.
   * 
   * @param {string} endpoint - API endpoint to request (without base URL)
   * @async
   * @returns {Promise<Object>} Parsed JSON response from the API
   * @throws {Error} If HTTP request fails or returns non-200 status
   */
  async makeRequest(endpoint) {
    // Simple rate limiting
    if (this.lastFetch && Date.now() - this.lastFetch < this.rateLimitDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.rateLimitDelay - (Date.now() - this.lastFetch))
      );
    }

    const url = this.baseURL + endpoint;
    this.lastFetch = Date.now();

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Check if cached data is still valid based on timestamp and expiry settings.
   * 
   * @param {string} key - Cache key to check
   * @param {number|null} [customExpiry=null] - Custom expiry time in milliseconds, uses default if null
   * @returns {boolean} True if cached data is still valid, false otherwise
   */
  isCacheValid(key, customExpiry = null) {
    const cached = this.cache.get(key);
    if (!cached) return false;

    const expiry = customExpiry || this.cacheExpiry;
    return Date.now() - cached.timestamp < expiry;
  }

  /**
   * Static convenience method for getting all players using a singleton instance.
   * Ensures cache persistence across multiple calls.
   * 
   * @param {boolean} [forceRefresh=false] - Whether to bypass cache and fetch fresh data
   * @static
   * @async
   * @returns {Promise<Object>} Object containing all NFL players indexed by player ID
   */
  static async getAllPlayers(forceRefresh = false) {
    // Reuse single instance so the in-memory cache persists across calls
    if (!SleeperAPI._instance) {
      SleeperAPI._instance = new SleeperAPI();
    }
    return await SleeperAPI._instance.getPlayers(forceRefresh);
  }
}

// Hold a single instance so `this.cache` is preserved between calls
SleeperAPI._instance = null;

// Export for use in other modules
if (typeof module !== 'undefined') {
  module.exports = SleeperAPI;
}
