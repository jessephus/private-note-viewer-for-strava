import { useLocalStorage } from './use-local-storage';

/**
 * Hook for caching activity details with TTL (time-to-live) functionality
 * @param {number} ttlMinutes - Cache TTL in minutes (default: 60 minutes)
 * @returns {object} Cache operations
 */
export function useActivityCache(ttlMinutes = 60) {
  const [cache, setCache] = useLocalStorage('strava-activity-details-cache', {});

  const getTtlMs = () => ttlMinutes * 60 * 1000;

  /**
   * Check if a cache entry is valid (not expired)
   * @param {object} cacheEntry - Cache entry with timestamp and ttl
   * @returns {boolean} Whether the cache entry is valid
   */
  const isCacheValid = (cacheEntry) => {
    if (!cacheEntry || !cacheEntry.timestamp || !cacheEntry.ttl) {
      return false;
    }

    const now = Date.now();
    const expiryTime = cacheEntry.timestamp + cacheEntry.ttl;
    return now < expiryTime;
  };

  /**
   * Get cached activity details if valid
   * @param {string|number} activityId - Activity ID
   * @returns {object|null} Cached activity data or null if not found/expired
   */
  const getCachedActivity = (activityId) => {
    const cacheKey = String(activityId);
    const cacheEntry = cache[cacheKey];

    if (isCacheValid(cacheEntry)) {
      console.log('useActivityCache.getCachedActivity: Cache hit', {
        activityId,
        cacheAge: Math.round((Date.now() - cacheEntry.timestamp) / 1000 / 60),
        ttlMinutes: Math.round(cacheEntry.ttl / 1000 / 60),
      });
      return cacheEntry.data;
    }

    if (cacheEntry) {
      console.log('useActivityCache.getCachedActivity: Cache expired', {
        activityId,
        cacheAge: Math.round((Date.now() - cacheEntry.timestamp) / 1000 / 60),
        ttlMinutes: Math.round(cacheEntry.ttl / 1000 / 60),
      });
    } else {
      console.log('useActivityCache.getCachedActivity: Cache miss', { activityId });
    }

    return null;
  };

  /**
   * Cache activity details
   * @param {string|number} activityId - Activity ID
   * @param {object} activityData - Activity data to cache
   */
  const setCachedActivity = (activityId, activityData) => {
    const cacheKey = String(activityId);
    const newEntry = {
      data: activityData,
      timestamp: Date.now(),
      ttl: getTtlMs(),
    };

    console.log('useActivityCache.setCachedActivity: Caching activity', {
      activityId,
      ttlMinutes,
      hasPrivateNote: !!activityData.private_note,
    });

    setCache((prevCache) => ({
      ...prevCache,
      [cacheKey]: newEntry,
    }));
  };

  /**
   * Clear all cached activities
   */
  const clearCache = () => {
    console.log('useActivityCache.clearCache: Clearing all cached activities');
    setCache({});
  };

  /**
   * Remove expired entries from cache
   */
  const cleanupExpiredEntries = () => {
    const now = Date.now();
    const cleanedCache = {};
    let removedCount = 0;

    Object.entries(cache).forEach(([activityId, entry]) => {
      if (isCacheValid(entry)) {
        cleanedCache[activityId] = entry;
      } else {
        removedCount++;
      }
    });

    if (removedCount > 0) {
      console.log('useActivityCache.cleanupExpiredEntries: Cleaned expired entries', {
        removedCount,
        remainingCount: Object.keys(cleanedCache).length,
      });
      setCache(cleanedCache);
    }
  };

  /**
   * Get all cached activities that are still valid
   * @returns {array} Array of cached activity data
   */
  const getAllCachedActivities = () => {
    const cachedActivities = [];

    Object.values(cache).forEach((entry) => {
      if (isCacheValid(entry)) {
        cachedActivities.push(entry.data);
      }
    });

    console.log('useActivityCache.getAllCachedActivities: Retrieved cached activities', {
      count: cachedActivities.length,
    });

    return cachedActivities;
  };

  /**
   * Get cache statistics
   */
  const getCacheStats = () => {
    const entries = Object.values(cache);
    const validEntries = entries.filter(isCacheValid);
    const expiredEntries = entries.filter((entry) => !isCacheValid(entry));

    return {
      total: entries.length,
      valid: validEntries.length,
      expired: expiredEntries.length,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map((e) => e.timestamp)) : null,
      newestEntry: entries.length > 0 ? Math.max(...entries.map((e) => e.timestamp)) : null,
    };
  };

  return {
    getCachedActivity,
    setCachedActivity,
    clearCache,
    cleanupExpiredEntries,
    getCacheStats,
    getAllCachedActivities,
    isCacheValid,
  };
}
