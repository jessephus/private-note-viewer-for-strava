/**
 * Activity Database - Persistent local storage for Strava activity data with private notes
 * Uses IndexedDB for long-term storage to minimize API requests
 */

const DB_NAME = 'StravaActivityDatabase';
const DB_VERSION = 1;
const STORE_NAME = 'activities';
const METADATA_STORE = 'metadata';

class ActivityDatabase {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  /**
   * Initialize the IndexedDB database
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('ActivityDatabase: Failed to open database', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('ActivityDatabase: Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create activities store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          
          // Create indexes for efficient querying
          store.createIndex('start_date', 'start_date', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('has_private_note', 'has_private_note', { unique: false });
          store.createIndex('last_updated', 'last_updated', { unique: false });
          
          console.log('ActivityDatabase: Activities store created with indexes');
        }

        // Create metadata store for tracking sync status
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metaStore = db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
          console.log('ActivityDatabase: Metadata store created');
        }
      };
    });
  }

  /**
   * Ensure database is initialized before operations
   */
  async ensureReady() {
    if (!this.db) {
      await this.initPromise;
    }
  }

  /**
   * Store activity data with private notes
   * @param {Object} activity - Complete activity data from Strava API
   */
  async storeActivity(activity) {
    await this.ensureReady();
    
    const enhancedActivity = {
      ...activity,
      has_private_note: !!activity.private_note,
      private_note_length: activity.private_note ? activity.private_note.length : 0,
      last_updated: new Date().toISOString(),
      cached_at: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(enhancedActivity);

      request.onsuccess = () => {
        console.log('ActivityDatabase: Stored activity', {
          activityId: activity.id,
          hasPrivateNote: !!activity.private_note,
          privateNoteLength: activity.private_note ? activity.private_note.length : 0
        });
        resolve(activity);
      };

      request.onerror = () => {
        console.error('ActivityDatabase: Failed to store activity', {
          activityId: activity.id,
          error: request.error
        });
        reject(request.error);
      };
    });
  }

  /**
   * Store multiple activities efficiently
   * @param {Array} activities - Array of activity objects
   */
  async storeActivities(activities) {
    await this.ensureReady();
    
    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const promises = activities.map(activity => {
      const enhancedActivity = {
        ...activity,
        has_private_note: !!activity.private_note,
        private_note_length: activity.private_note ? activity.private_note.length : 0,
        last_updated: new Date().toISOString(),
        cached_at: Date.now()
      };

      return new Promise((resolve, reject) => {
        const request = store.put(enhancedActivity);
        request.onsuccess = () => resolve(enhancedActivity);
        request.onerror = () => reject(request.error);
      });
    });

    try {
      const results = await Promise.all(promises);
      console.log('ActivityDatabase: Bulk stored activities', {
        count: results.length,
        withPrivateNotes: results.filter(a => a.has_private_note).length
      });
      return results;
    } catch (error) {
      console.error('ActivityDatabase: Bulk store failed', error);
      throw error;
    }
  }

  /**
   * Get activity by ID from database
   * @param {string|number} activityId - Activity ID
   * @returns {Object|null} - Activity data or null if not found
   */
  async getActivity(activityId) {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(String(activityId));

      request.onsuccess = () => {
        const activity = request.result;
        if (activity) {
          console.log('ActivityDatabase: Retrieved activity from cache', {
            activityId,
            hasPrivateNote: activity.has_private_note,
            cacheAge: Math.round((Date.now() - activity.cached_at) / 1000 / 60) + ' minutes'
          });
        }
        resolve(activity || null);
      };

      request.onerror = () => {
        console.error('ActivityDatabase: Failed to retrieve activity', {
          activityId,
          error: request.error
        });
        reject(request.error);
      };
    });
  }

  /**
   * Get multiple activities by IDs
   * @param {Array} activityIds - Array of activity IDs
   * @returns {Array} - Array of found activities
   */
  async getActivities(activityIds) {
    await this.ensureReady();
    
    const promises = activityIds.map(id => this.getActivity(id));
    const results = await Promise.all(promises);
    return results.filter(activity => activity !== null);
  }

  /**
   * Get all activities within a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} - Array of activities
   */
  async getActivitiesInDateRange(startDate, endDate) {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('start_date');
      
      const range = IDBKeyRange.bound(
        startDate.toISOString(),
        endDate.toISOString(),
        false,
        false
      );
      
      const request = index.getAll(range);

      request.onsuccess = () => {
        const activities = request.result || [];
        console.log('ActivityDatabase: Retrieved activities in date range', {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          count: activities.length,
          withPrivateNotes: activities.filter(a => a.has_private_note).length
        });
        resolve(activities);
      };

      request.onerror = () => {
        console.error('ActivityDatabase: Failed to retrieve activities in date range', {
          error: request.error
        });
        reject(request.error);
      };
    });
  }

  /**
   * Get all cached activities
   * @returns {Array} - All cached activities
   */
  async getAllActivities() {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const activities = request.result || [];
        console.log('ActivityDatabase: Retrieved all cached activities', {
          count: activities.length,
          withPrivateNotes: activities.filter(a => a.has_private_note).length
        });
        resolve(activities);
      };

      request.onerror = () => {
        console.error('ActivityDatabase: Failed to retrieve all activities', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Check which activities from a list are missing from the cache
   * @param {Array} activityIds - Array of activity IDs to check
   * @returns {Array} - Array of missing activity IDs
   */
  async getMissingActivityIds(activityIds) {
    await this.ensureReady();
    
    const cachedActivities = await this.getActivities(activityIds);
    const cachedIds = new Set(cachedActivities.map(a => String(a.id)));
    
    const missingIds = activityIds.filter(id => !cachedIds.has(String(id)));
    
    console.log('ActivityDatabase: Checked for missing activities', {
      requested: activityIds.length,
      cached: cachedActivities.length,
      missing: missingIds.length,
      missingIds: missingIds.slice(0, 5) // Log first 5 for debugging
    });
    
    return missingIds;
  }

  /**
   * Get activities that need refreshing (based on age or other criteria)
   * @param {number} maxAgeHours - Maximum age in hours before refresh needed
   * @returns {Array} - Activities that need refreshing
   */
  async getActivitiesNeedingRefresh(maxAgeHours = 24) {
    await this.ensureReady();
    
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('last_updated');
      
      const request = index.openCursor();
      const staleActivities = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const activity = cursor.value;
          if (activity.cached_at < cutoffTime) {
            staleActivities.push(activity);
          }
          cursor.continue();
        } else {
          console.log('ActivityDatabase: Found stale activities', {
            count: staleActivities.length,
            maxAgeHours
          });
          resolve(staleActivities);
        }
      };

      request.onerror = () => {
        console.error('ActivityDatabase: Failed to check for stale activities', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete activities older than specified days
   * @param {number} maxAgeDays - Maximum age in days
   */
  async cleanupOldActivities(maxAgeDays = 90) {
    await this.ensureReady();
    
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('last_updated');
      
      const request = index.openCursor();
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const activity = cursor.value;
          if (activity.cached_at < cutoffTime) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          console.log('ActivityDatabase: Cleaned up old activities', {
            deletedCount,
            maxAgeDays
          });
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error('ActivityDatabase: Failed to cleanup old activities', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get database statistics
   * @returns {Object} - Database stats
   */
  async getStats() {
    await this.ensureReady();
    
    const allActivities = await this.getAllActivities();
    const withNotes = allActivities.filter(a => a.has_private_note);
    const oldestCached = allActivities.length > 0 ? 
      Math.min(...allActivities.map(a => a.cached_at)) : null;
    const newestCached = allActivities.length > 0 ? 
      Math.max(...allActivities.map(a => a.cached_at)) : null;

    return {
      totalActivities: allActivities.length,
      activitiesWithNotes: withNotes.length,
      activitiesWithoutNotes: allActivities.length - withNotes.length,
      oldestCached: oldestCached ? new Date(oldestCached).toISOString() : null,
      newestCached: newestCached ? new Date(newestCached).toISOString() : null,
      totalPrivateNoteChars: withNotes.reduce((sum, a) => sum + (a.private_note_length || 0), 0)
    };
  }

  /**
   * Clear all cached data
   */
  async clearAll() {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('ActivityDatabase: Cleared all cached activities');
        resolve();
      };

      request.onerror = () => {
        console.error('ActivityDatabase: Failed to clear cache', request.error);
        reject(request.error);
      };
    });
  }
}

// Create singleton instance
const activityDatabase = new ActivityDatabase();

export { activityDatabase, ActivityDatabase };
