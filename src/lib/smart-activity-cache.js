/**
 * Smart Activity Cache Manager
 * Combines IndexedDB persistent storage with memory cache for optimal performance
 * and minimal API usage for private notes data
 */

import { activityDatabase } from './activity-database';
import { StravaAPI } from './strava-api';

export class SmartActivityCache {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.memoryCache = new Map(); // Fast memory cache for current session
    this.database = activityDatabase;
    this.apiCallCount = 0;
    this.cacheHitCount = 0;
  }

  /**
   * Get activity with smart caching logic
   * Priority: Memory Cache -> IndexedDB -> API -> Fallback
   */
  async getActivity(activityId) {
    const id = String(activityId);
    
    // 1. Check memory cache first (fastest)
    if (this.memoryCache.has(id)) {
      this.cacheHitCount++;
      console.log('SmartActivityCache: Memory cache hit', { activityId: id });
      return this.memoryCache.get(id);
    }

    // 2. Check IndexedDB (persistent, still fast)
    try {
      const cachedActivity = await this.database.getActivity(id);
      if (cachedActivity) {
        this.cacheHitCount++;
        // Store in memory cache for next access
        this.memoryCache.set(id, cachedActivity);
        console.log('SmartActivityCache: Database cache hit', { 
          activityId: id,
          hasPrivateNote: cachedActivity.has_private_note
        });
        return cachedActivity;
      }
    } catch (error) {
      console.warn('SmartActivityCache: Database cache check failed', { activityId: id, error });
    }

    // 3. Cache miss - fetch from API if we have a token
    if (this.accessToken) {
      try {
        this.apiCallCount++;
        console.log('SmartActivityCache: Fetching from API', { 
          activityId: id,
          apiCallCount: this.apiCallCount 
        });
        
        const stravaAPI = new StravaAPI(this.accessToken);
        const activity = await stravaAPI.getActivity(id);
        
        // Store in both caches
        await this.storeActivity(activity);
        
        return activity;
      } catch (error) {
        console.error('SmartActivityCache: API fetch failed', { activityId: id, error });
      }
    }

    // 4. No token or API failed - return null
    console.log('SmartActivityCache: Complete cache miss', { activityId: id });
    return null;
  }

  /**
   * Get multiple activities with batch optimization
   */
  async getActivities(activityIds) {
    const ids = activityIds.map(id => String(id));
    const results = new Map();
    
    // 1. Check memory cache for all IDs
    const memoryMisses = [];
    for (const id of ids) {
      if (this.memoryCache.has(id)) {
        results.set(id, this.memoryCache.get(id));
        this.cacheHitCount++;
      } else {
        memoryMisses.push(id);
      }
    }

    if (memoryMisses.length === 0) {
      console.log('SmartActivityCache: All activities found in memory cache');
      return Array.from(results.values());
    }

    // 2. Check database for memory misses
    let dbMisses = [];
    try {
      const dbResults = await this.database.getActivities(memoryMisses);
      for (const activity of dbResults) {
        const id = String(activity.id);
        results.set(id, activity);
        this.memoryCache.set(id, activity); // Cache in memory for next time
        this.cacheHitCount++;
      }
      
      const foundInDb = new Set(dbResults.map(a => String(a.id)));
      dbMisses = memoryMisses.filter(id => !foundInDb.has(id));
    } catch (error) {
      console.warn('SmartActivityCache: Database batch check failed', error);
      dbMisses = memoryMisses;
    }

    if (dbMisses.length === 0) {
      console.log('SmartActivityCache: All remaining activities found in database');
      return Array.from(results.values());
    }

    // 3. Fetch missing activities from API
    if (this.accessToken && dbMisses.length > 0) {
      console.log('SmartActivityCache: Fetching missing activities from API', {
        missing: dbMisses.length,
        total: ids.length
      });

      const stravaAPI = new StravaAPI(this.accessToken);
      const apiPromises = dbMisses.map(async (id) => {
        try {
          this.apiCallCount++;
          const activity = await stravaAPI.getActivity(id);
          await this.storeActivity(activity);
          results.set(id, activity);
          return activity;
        } catch (error) {
          console.warn('SmartActivityCache: Failed to fetch activity', { activityId: id, error });
          return null;
        }
      });

      await Promise.all(apiPromises);
    }

    const finalResults = Array.from(results.values());
    console.log('SmartActivityCache: Batch get complete', {
      requested: ids.length,
      found: finalResults.length,
      memoryHits: ids.length - memoryMisses.length,
      databaseHits: memoryMisses.length - dbMisses.length,
      apiCalls: this.accessToken ? dbMisses.length : 0
    });

    return finalResults;
  }

  /**
   * Smart activity loading strategy for the PrivateNotesViewer
   * Minimizes API calls while ensuring complete data
   */
  async loadActivitiesWithPrivateNotes(summaryActivities) {
    console.log('SmartActivityCache: Starting smart loading strategy', {
      summaryCount: summaryActivities.length
    });

    if (!summaryActivities || summaryActivities.length === 0) {
      console.log('SmartActivityCache: No summary activities provided');
      return [];
    }

    const activityIds = summaryActivities.map(a => a.id);
    
    // Check which activities we already have cached
    let missingIds = [];
    let cachedActivities = [];
    
    try {
      missingIds = await this.database.getMissingActivityIds(activityIds);
      console.log('SmartActivityCache: Database check complete', {
        total: activityIds.length,
        missing: missingIds.length
      });
    } catch (dbError) {
      console.error('SmartActivityCache: Database check failed, treating all as missing', {
        error: dbError.message
      });
      missingIds = activityIds; // Treat all as missing if database fails
    }
    
    console.log('SmartActivityCache: Cache analysis complete', {
      total: activityIds.length,
      cached: activityIds.length - missingIds.length,
      missing: missingIds.length,
      cacheHitRate: activityIds.length > 0 ? Math.round(((activityIds.length - missingIds.length) / activityIds.length) * 100) + '%' : '0%'
    });

    // Get all cached activities
    try {
      if (missingIds.length < activityIds.length) {
        const cachedIds = activityIds.filter(id => !missingIds.includes(id));
        cachedActivities = await this.database.getActivities(cachedIds);
        console.log('SmartActivityCache: Retrieved cached activities', {
          requested: cachedIds.length,
          retrieved: cachedActivities.length
        });
      }
    } catch (dbError) {
      console.error('SmartActivityCache: Failed to retrieve cached activities', {
        error: dbError.message
      });
      cachedActivities = [];
      missingIds = activityIds; // Treat all as missing if we can't get cached ones
    }

    // Create a map for easy lookup
    const activityMap = new Map();
    cachedActivities.forEach(activity => {
      activityMap.set(String(activity.id), activity);
      this.memoryCache.set(String(activity.id), activity); // Store in memory cache too
    });

    console.log('SmartActivityCache: Activity map initialized', {
      mapSize: activityMap.size,
      missingToFetch: missingIds.length
    });

    // Fetch missing activities from API (if we have token)
    if (this.accessToken && missingIds.length > 0) {
      console.log('SmartActivityCache: Fetching missing activities from API', {
        count: missingIds.length,
        sampleIds: missingIds.slice(0, 3)
      });

      const stravaAPI = new StravaAPI(this.accessToken);
      
      // Use a simpler approach: fetch all missing activities individually
      // This is more reliable than complex batching
      for (const id of missingIds) {
        try {
          this.apiCallCount++;
          console.log('SmartActivityCache: Fetching activity', { 
            activityId: id,
            progress: `${missingIds.indexOf(id) + 1}/${missingIds.length}`
          });
          
          const activity = await stravaAPI.getActivity(id);
          
          // Store in database (with error handling)
          try {
            await this.storeActivity(activity);
          } catch (storeError) {
            console.warn('SmartActivityCache: Failed to store in database', { 
              activityId: id, 
              error: storeError.message 
            });
          }
          
          activityMap.set(String(activity.id), activity);
          
          console.log('SmartActivityCache: Successfully fetched activity', {
            activityId: id,
            hasPrivateNote: !!activity.private_note,
            name: activity.name
          });
          
        } catch (error) {
          console.warn('SmartActivityCache: Failed to fetch activity', { 
            activityId: id, 
            error: error.message 
          });
          
          // Use summary data as fallback
          const summaryActivity = summaryActivities.find(a => String(a.id) === String(id));
          if (summaryActivity) {
            console.log('SmartActivityCache: Using summary data as fallback', { activityId: id });
            activityMap.set(String(id), summaryActivity);
          }
        }
      }
    } else {
      console.log('SmartActivityCache: No API access or no missing activities', {
        hasToken: !!this.accessToken,
        missingCount: missingIds.length
      });
      
      // No token or no missing activities - use summary data for missing ones
      missingIds.forEach(id => {
        const summaryActivity = summaryActivities.find(a => String(a.id) === String(id));
        if (summaryActivity) {
          console.log('SmartActivityCache: Using summary data for missing activity', { activityId: id });
          activityMap.set(String(id), summaryActivity);
        }
      });
    }

    // Return activities in original order
    const result = activityIds
      .map(id => {
        const activity = activityMap.get(String(id));
        if (!activity) {
          console.warn('SmartActivityCache: Missing activity in final result', { activityId: id });
        }
        return activity;
      })
      .filter(activity => activity !== undefined);

    console.log('SmartActivityCache: Smart loading complete', {
      inputSummaries: summaryActivities.length,
      outputActivities: result.length,
      withPrivateNotes: result.filter(a => a.private_note).length,
      apiCallsMade: this.apiCallCount,
      cacheHits: this.cacheHitCount
    });

    return result;
  }

  /**
   * Store activity in both memory and persistent cache
   */
  async storeActivity(activity) {
    const id = String(activity.id);
    
    // Store in memory cache
    this.memoryCache.set(id, activity);
    
    // Store in persistent database
    try {
      await this.database.storeActivity(activity);
    } catch (error) {
      console.warn('SmartActivityCache: Failed to store in database', { 
        activityId: id, 
        error 
      });
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const dbStats = await this.database.getStats();
    
    return {
      ...dbStats,
      memoryCache: {
        size: this.memoryCache.size,
        activities: Array.from(this.memoryCache.values()).length
      },
      session: {
        apiCalls: this.apiCallCount,
        cacheHits: this.cacheHitCount,
        hitRate: this.cacheHitCount + this.apiCallCount > 0 ? 
          Math.round((this.cacheHitCount / (this.cacheHitCount + this.apiCallCount)) * 100) : 0
      }
    };
  }

  /**
   * Clear all caches
   */
  async clearAll() {
    this.memoryCache.clear();
    await this.database.clearAll();
    this.apiCallCount = 0;
    this.cacheHitCount = 0;
  }

  /**
   * Cleanup old entries
   */
  async cleanup() {
    return await this.database.cleanupOldActivities(90); // Keep 90 days
  }
}

export default SmartActivityCache;
