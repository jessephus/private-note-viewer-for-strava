/**
 * Weekly Mileage Database - Persistent storage for calculated weekly running distances
 * Uses IndexedDB to store pre-calculated weekly totals with completion status
 */

const DB_NAME = 'StravaWeeklyMileageDatabase';
const DB_VERSION = 1;
const STORE_NAME = 'weekly_mileage';

class WeeklyMileageDatabase {
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
        console.error('WeeklyMileageDatabase: Failed to open database', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('WeeklyMileageDatabase: Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create weekly mileage store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'weekId' });
          
          // Create indexes for efficient querying
          store.createIndex('year', 'year', { unique: false });
          store.createIndex('weekNumber', 'weekNumber', { unique: false });
          store.createIndex('weekStart', 'weekStart', { unique: false });
          store.createIndex('isComplete', 'isComplete', { unique: false });
          store.createIndex('calculatedAt', 'calculatedAt', { unique: false });
          
          console.log('WeeklyMileageDatabase: Weekly mileage store created with indexes');
        }
      };
    });
  }

  /**
   * Get the week ID for a given date (format: YYYY-WW)
   */
  getWeekId(date) {
    const monday = this.getWeekStart(date);
    const year = monday.getFullYear();
    const weekNumber = this.getWeekNumber(monday);
    return `${year}-${weekNumber.toString().padStart(2, '0')}`;
  }

  /**
   * Get the Monday of the week containing the given date
   */
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  /**
   * Get the Sunday of the week containing the given date
   */
  getWeekEnd(date) {
    const monday = this.getWeekStart(date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  }

  /**
   * Get the ISO week number for a date
   */
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  /**
   * Store weekly mileage data
   */
  async storeWeeklyMileage(weekData) {
    await this.initPromise;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const weeklyData = {
        weekId: weekData.weekId,
        year: weekData.year,
        weekNumber: weekData.weekNumber,
        weekStart: weekData.weekStart.toISOString(),
        weekEnd: weekData.weekEnd.toISOString(),
        totalDistance: weekData.totalDistance || 0,
        totalTime: weekData.totalTime || 0,
        totalElevation: weekData.totalElevation || 0,
        runCount: weekData.runCount || 0,
        isComplete: weekData.isComplete || false,
        activities: weekData.activities || [],
        calculatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      const request = store.put(weeklyData);
      
      request.onsuccess = () => {
        console.log('WeeklyMileageDatabase: Stored weekly mileage', {
          weekId: weeklyData.weekId,
          distance: weeklyData.totalDistance,
          isComplete: weeklyData.isComplete
        });
        resolve(weeklyData);
      };
      
      request.onerror = () => {
        console.error('WeeklyMileageDatabase: Failed to store weekly mileage', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get weekly mileage data for a specific week
   */
  async getWeeklyMileage(weekId) {
    await this.initPromise;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(weekId);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        console.error('WeeklyMileageDatabase: Failed to get weekly mileage', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all weekly mileage data, sorted by week (newest first)
   */
  async getAllWeeklyMileage() {
    await this.initPromise;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const results = request.result || [];
        // Sort by week start date, newest first
        results.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
        
        console.log('WeeklyMileageDatabase: Retrieved all weekly mileage', {
          count: results.length,
          completeWeeks: results.filter(w => w.isComplete).length
        });
        resolve(results);
      };
      
      request.onerror = () => {
        console.error('WeeklyMileageDatabase: Failed to get all weekly mileage', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get weekly mileage data for a date range
   */
  async getWeeklyMileageInRange(startDate, endDate) {
    await this.initPromise;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('weekStart');
      
      const range = IDBKeyRange.bound(
        startDate.toISOString(),
        endDate.toISOString()
      );
      
      const request = index.getAll(range);
      
      request.onsuccess = () => {
        const results = request.result || [];
        results.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
        resolve(results);
      };
      
      request.onerror = () => {
        console.error('WeeklyMileageDatabase: Failed to get weekly mileage in range', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Check if we have weekly data for a specific week
   */
  async hasWeeklyData(weekId) {
    const data = await this.getWeeklyMileage(weekId);
    return !!data;
  }

  /**
   * Check if weekly data is complete for a specific week
   */
  async isWeekComplete(weekId) {
    const data = await this.getWeeklyMileage(weekId);
    return data ? data.isComplete : false;
  }

  /**
   * Delete weekly mileage data for a specific week
   */
  async deleteWeeklyMileage(weekId) {
    await this.initPromise;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(weekId);
      
      request.onsuccess = () => {
        console.log('WeeklyMileageDatabase: Deleted weekly mileage', { weekId });
        resolve();
      };
      
      request.onerror = () => {
        console.error('WeeklyMileageDatabase: Failed to delete weekly mileage', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all weekly mileage data
   */
  async clearAll() {
    await this.initPromise;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('WeeklyMileageDatabase: Cleared all weekly mileage data');
        resolve();
      };
      
      request.onerror = () => {
        console.error('WeeklyMileageDatabase: Failed to clear weekly mileage data', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const allWeeks = await this.getAllWeeklyMileage();
    const completeWeeks = allWeeks.filter(w => w.isComplete);
    const incompleteWeeks = allWeeks.filter(w => !w.isComplete);
    
    return {
      totalWeeks: allWeeks.length,
      completeWeeks: completeWeeks.length,
      incompleteWeeks: incompleteWeeks.length,
      totalDistance: completeWeeks.reduce((sum, w) => sum + (w.totalDistance || 0), 0),
      totalRuns: completeWeeks.reduce((sum, w) => sum + (w.runCount || 0), 0),
      averageWeeklyDistance: completeWeeks.length > 0 
        ? completeWeeks.reduce((sum, w) => sum + (w.totalDistance || 0), 0) / completeWeeks.length 
        : 0,
      dateRange: allWeeks.length > 0 ? {
        earliest: allWeeks[allWeeks.length - 1].weekStart,
        latest: allWeeks[0].weekStart
      } : null
    };
  }
}

export { WeeklyMileageDatabase };
