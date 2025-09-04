/**
 * Weekly Mileage Calculator - Calculates weekly running mileage using cached data and API calls
 * Implements smart caching strategy to minimize API usage while ensuring data completeness
 */

import { WeeklyMileageDatabase } from './weekly-mileage-database.js';
import { StravaAPI } from './strava-api.js';

class WeeklyMileageCalculator {
  constructor(accessToken, smartCache) {
    this.accessToken = accessToken;
    this.smartCache = smartCache;
    this.stravaAPI = new StravaAPI(accessToken);
    this.weeklyDatabase = new WeeklyMileageDatabase();
    this.isCalculating = false;
    this.calculationStats = {
      weeksProcessed: 0,
      apiCallsMade: 0,
      cacheHits: 0,
      rateLimitReached: false,
      lastError: null
    };
  }

  /**
   * Start the weekly mileage calculation process
   */
  async calculateWeeklyMileage() {
    if (this.isCalculating) {
      console.log('WeeklyMileageCalculator: Calculation already in progress');
      return this.calculationStats;
    }

    this.isCalculating = true;
    this.calculationStats = {
      weeksProcessed: 0,
      apiCallsMade: 0,
      cacheHits: 0,
      rateLimitReached: false,
      lastError: null
    };

    console.log('WeeklyMileageCalculator: Starting weekly mileage calculation');

    try {
      // Start with the most recent complete week (last Monday to Sunday)
      const today = new Date();
      const currentWeekStart = this.weeklyDatabase.getWeekStart(today);
      
      // Go back to the previous complete week
      const lastCompleteWeekStart = new Date(currentWeekStart);
      lastCompleteWeekStart.setDate(lastCompleteWeekStart.getDate() - 7);
      
      console.log('WeeklyMileageCalculator: Starting from week', {
        weekStart: lastCompleteWeekStart.toISOString(),
        weekId: this.weeklyDatabase.getWeekId(lastCompleteWeekStart)
      });

      let currentWeek = lastCompleteWeekStart;
      let weeksBack = 0;
      const maxWeeksBack = 52; // Don't go back more than a year

      while (weeksBack < maxWeeksBack && !this.calculationStats.rateLimitReached) {
        const weekId = this.weeklyDatabase.getWeekId(currentWeek);
        const weekStart = this.weeklyDatabase.getWeekStart(currentWeek);
        const weekEnd = this.weeklyDatabase.getWeekEnd(currentWeek);

        console.log(`WeeklyMileageCalculator: Processing week ${weekId}`, {
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString()
        });

        try {
          await this.processWeek(weekStart, weekEnd);
          this.calculationStats.weeksProcessed++;
        } catch (error) {
          console.error(`WeeklyMileageCalculator: Error processing week ${weekId}`, error);
          
          if (error.message.includes('429') || error.message.includes('rate limit')) {
            console.log('WeeklyMileageCalculator: Rate limit reached, stopping calculation');
            this.calculationStats.rateLimitReached = true;
            break;
          } else {
            this.calculationStats.lastError = error.message;
          }
        }

        // Move to the previous week
        currentWeek = new Date(currentWeek);
        currentWeek.setDate(currentWeek.getDate() - 7);
        weeksBack++;

        // Small delay to be gentle on the API
        if (this.calculationStats.apiCallsMade > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log('WeeklyMileageCalculator: Calculation complete', this.calculationStats);
      return this.calculationStats;

    } catch (error) {
      console.error('WeeklyMileageCalculator: Fatal error during calculation', error);
      this.calculationStats.lastError = error.message;
      throw error;
    } finally {
      this.isCalculating = false;
    }
  }

  /**
   * Process a single week - check cache first, then API if needed
   */
  async processWeek(weekStart, weekEnd) {
    const weekId = this.weeklyDatabase.getWeekId(weekStart);
    
    // Check if we already have complete data for this week
    const existingData = await this.weeklyDatabase.getWeeklyMileage(weekId);
    if (existingData && existingData.isComplete) {
      console.log(`WeeklyMileageCalculator: Week ${weekId} already complete, skipping`);
      this.calculationStats.cacheHits++;
      return existingData;
    }

    // Get cached activities for this week
    const cachedActivities = await this.getCachedActivitiesForWeek(weekStart, weekEnd);
    const cachedRuns = cachedActivities.filter(activity => 
      activity.type === 'Run' || activity.sport_type === 'Run'
    );

    console.log(`WeeklyMileageCalculator: Found ${cachedRuns.length} cached runs for week ${weekId}`);

    // Check if we have complete coverage from cache
    const hasCompleteCoverage = await this.hasCompleteWeekCoverage(cachedRuns, weekStart, weekEnd);
    
    let weeklyData;
    if (hasCompleteCoverage) {
      // Calculate from cached data only
      console.log(`WeeklyMileageCalculator: Using cached data for complete week ${weekId}`);
      weeklyData = this.calculateWeekData(weekId, weekStart, weekEnd, cachedRuns, true);
      this.calculationStats.cacheHits++;
    } else {
      // Need to fetch additional data from API
      console.log(`WeeklyMileageCalculator: Fetching additional data from API for week ${weekId}`);
      const allRuns = await this.fetchCompleteWeekData(weekStart, weekEnd, cachedRuns);
      weeklyData = this.calculateWeekData(weekId, weekStart, weekEnd, allRuns, true);
      this.calculationStats.apiCallsMade++;
    }

    // Save to database
    await this.weeklyDatabase.storeWeeklyMileage(weeklyData);
    
    console.log(`WeeklyMileageCalculator: Saved week ${weekId}`, {
      distance: weeklyData.totalDistance,
      runs: weeklyData.runCount,
      isComplete: weeklyData.isComplete
    });

    return weeklyData;
  }

  /**
   * Get cached activities for a specific week
   */
  async getCachedActivitiesForWeek(weekStart, weekEnd) {
    try {
      await this.smartCache.database.initPromise;
      const allCached = await this.smartCache.database.getAllActivities();
      
      return allCached.filter(activity => {
        const activityDate = new Date(activity.start_date);
        return activityDate >= weekStart && activityDate <= weekEnd;
      });
    } catch (error) {
      console.warn('WeeklyMileageCalculator: Failed to get cached activities', error);
      return [];
    }
  }

  /**
   * Check if we have complete coverage for a week from cached data
   */
  async hasCompleteWeekCoverage(cachedRuns, weekStart, weekEnd) {
    // For simplicity, we'll consider cache complete if:
    // 1. We have some activities in the cache for this time period
    // 2. The cache was last updated recently (within the last few days for recent weeks)
    
    if (cachedRuns.length === 0) {
      return false;
    }

    // For weeks that ended more than a week ago, we can be more confident
    // that our cache is complete if we have any data
    const weekAge = (new Date() - weekEnd) / (1000 * 60 * 60 * 24); // Days
    
    if (weekAge > 7) {
      // For older weeks, if we have cached data, it's likely complete
      return true;
    }

    // For recent weeks, we need to be more careful
    // Check if we have activities from multiple days in the week
    const uniqueDays = new Set(
      cachedRuns.map(run => new Date(run.start_date).toDateString())
    );

    // If we have activities from at least 2 different days, assume coverage is reasonable
    return uniqueDays.size >= 2;
  }

  /**
   * Fetch complete week data from API, combining with cached data
   */
  async fetchCompleteWeekData(weekStart, weekEnd, cachedRuns) {
    try {
      // Fetch activities from API for this week
      const apiActivities = await this.stravaAPI.getActivities({
        after: Math.floor(weekStart.getTime() / 1000),
        before: Math.floor(weekEnd.getTime() / 1000),
        per_page: 200
      });

      console.log(`WeeklyMileageCalculator: Fetched ${apiActivities.length} activities from API`);

      // Filter for runs only
      const apiRuns = apiActivities.filter(activity => 
        activity.type === 'Run' || activity.sport_type === 'Run'
      );

      // Combine with cached data, avoiding duplicates
      const cachedIds = new Set(cachedRuns.map(run => run.id));
      const newRuns = apiRuns.filter(run => !cachedIds.has(run.id));

      console.log(`WeeklyMileageCalculator: Found ${newRuns.length} new runs from API`);

      // If we have new runs, we need detailed data to save to cache
      if (newRuns.length > 0) {
        // Use smart cache to get detailed data efficiently
        const detailedNewRuns = await this.smartCache.loadActivitiesWithPrivateNotes(newRuns);
        
        // The smart cache automatically saves to database, so we don't need to do that manually
        console.log(`WeeklyMileageCalculator: Processed ${detailedNewRuns.length} detailed runs through smart cache`);
        
        // Combine all runs
        return [...cachedRuns, ...detailedNewRuns];
      }

      return cachedRuns;

    } catch (error) {
      console.error('WeeklyMileageCalculator: Error fetching from API', error);
      
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        throw error; // Re-throw rate limit errors to stop calculation
      }
      
      // For other errors, use cached data if available
      console.log('WeeklyMileageCalculator: Using cached data due to API error');
      return cachedRuns;
    }
  }

  /**
   * Calculate weekly data from run activities
   */
  calculateWeekData(weekId, weekStart, weekEnd, runs, isComplete) {
    const totalDistance = runs.reduce((sum, run) => sum + (run.distance || 0), 0);
    const totalTime = runs.reduce((sum, run) => sum + (run.moving_time || run.elapsed_time || 0), 0);
    const totalElevation = runs.reduce((sum, run) => sum + (run.total_elevation_gain || 0), 0);

    return {
      weekId,
      year: weekStart.getFullYear(),
      weekNumber: this.weeklyDatabase.getWeekNumber(weekStart),
      weekStart,
      weekEnd,
      totalDistance,
      totalTime,
      totalElevation,
      runCount: runs.length,
      isComplete,
      activities: runs.map(run => ({
        id: run.id,
        name: run.name,
        distance: run.distance,
        moving_time: run.moving_time,
        start_date: run.start_date,
        type: run.type
      }))
    };
  }

  /**
   * Get calculation statistics
   */
  getStats() {
    return { ...this.calculationStats };
  }

  /**
   * Check if calculation is in progress
   */
  isCalculationInProgress() {
    return this.isCalculating;
  }
}

export { WeeklyMileageCalculator };
