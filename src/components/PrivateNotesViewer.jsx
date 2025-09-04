import { useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { ActivityCard } from './ActivityCard';
import { ActivityTable } from './ActivityTable';
import { ActivityFilters } from './ActivityFilters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, TrendingUp, User, RefreshCw, TableProperties, Database } from 'lucide-react';
import { formatDistance, formatDuration, formatSpeed, formatElevation, StravaAPI } from '@/lib/strava-api';
import { SmartActivityCache } from '@/lib/smart-activity-cache';
import { toast } from 'sonner';

export function PrivateNotesViewer({ accessToken }) {
  // Debug: Log accessToken
  console.log('PrivateNotesViewer: Received accessToken', {
    hasToken: !!accessToken,
    tokenPreview: accessToken ? accessToken.substring(0, 8) + '...' : 'null'
  });

  const [activities, setActivities] = useLocalStorage('strava-activities', []);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedActivityDetails, setSelectedActivityDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isRealData, setIsRealData] = useLocalStorage('strava-real-data', false);
  const [units, setUnits] = useLocalStorage('strava-units', 'metric');
  const [viewMode, setViewMode] = useLocalStorage('strava-view-mode', 'table');
  
  // Filter states
  const [filters, setFilters] = useState({
    activityType: 'all',
    minDistance: '',
    maxDistance: '',
    titleKeywords: '',
    notesKeywords: ''
  });
  
  // Date range for filtering and fetching
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  
  // Track the date range of currently loaded activities
  const [loadedDateRange, setLoadedDateRange] = useState({ from: null, to: null });
  
  // Smart cache for efficient API usage and private notes
  const [smartCache, setSmartCache] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);

  // Filtered activities based on current filters
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Filter by activity type
    if (filters.activityType && filters.activityType !== 'all') {
      filtered = filtered.filter(activity => 
        activity.type.toLowerCase() === filters.activityType.toLowerCase()
      );
    }

    // Filter by distance range
    if (filters.minDistance) {
      const minDistanceMeters = parseFloat(filters.minDistance) * (units === 'metric' ? 1000 : 1609.34);
      filtered = filtered.filter(activity => activity.distance >= minDistanceMeters);
    }
    if (filters.maxDistance) {
      const maxDistanceMeters = parseFloat(filters.maxDistance) * (units === 'metric' ? 1000 : 1609.34);
      filtered = filtered.filter(activity => activity.distance <= maxDistanceMeters);
    }

    // Filter by title keywords
    if (filters.titleKeywords) {
      const keywords = filters.titleKeywords.toLowerCase().split(' ').filter(k => k.length > 0);
      filtered = filtered.filter(activity => 
        keywords.every(keyword => 
          activity.name.toLowerCase().includes(keyword)
        )
      );
    }

    // Filter by notes keywords
    if (filters.notesKeywords) {
      const keywords = filters.notesKeywords.toLowerCase().split(' ').filter(k => k.length > 0);
      filtered = filtered.filter(activity => 
        activity.private_note && keywords.every(keyword => 
          activity.private_note.toLowerCase().includes(keyword)
        )
      );
    }

    // Filter by date range if set
    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter(activity => {
        const activityDate = new Date(activity.start_date);
        return activityDate >= dateRange.from && activityDate <= dateRange.to;
      });
    }

    return filtered;
  }, [activities, filters, units, dateRange]);

  // Available activity types for filter dropdown
  const availableActivityTypes = useMemo(() => {
    const types = [...new Set(activities.map(activity => activity.type))];
    return types.sort();
  }, [activities]);

  // Stats calculations
  const stats = useMemo(() => {
    const totalDistance = filteredActivities.reduce((sum, activity) => sum + (activity.distance || 0), 0);
    const totalTime = filteredActivities.reduce((sum, activity) => sum + (activity.moving_time || 0), 0);
    const totalElevation = filteredActivities.reduce((sum, activity) => sum + (activity.total_elevation_gain || 0), 0);
    
    return {
      totalDistance,
      totalTime,
      totalElevation,
      totalActivities: filteredActivities.length
    };
  }, [filteredActivities]);

  // Activity type breakdown for statistics
  const activityTypeStats = useMemo(() => {
    const typeStats = {};
    filteredActivities.forEach(activity => {
      if (!typeStats[activity.type]) {
        typeStats[activity.type] = { count: 0, distance: 0 };
      }
      typeStats[activity.type].count += 1;
      typeStats[activity.type].distance += activity.distance || 0;
    });
    return typeStats;
  }, [filteredActivities]);

  // Helper function to determine if we need to fetch more data
  const needsAdditionalData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return false;
    
    // Convert to date-only format for comparison
    const requestedRange = {
      from: new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate()),
      to: new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate())
    };
    
    const loadedRange = {
      from: loadedDateRange.from ? new Date(loadedDateRange.from.getFullYear(), loadedDateRange.from.getMonth(), loadedDateRange.from.getDate()) : null,
      to: loadedDateRange.to ? new Date(loadedDateRange.to.getFullYear(), loadedDateRange.to.getMonth(), loadedDateRange.to.getDate()) : null
    };
    
    console.log('needsAdditionalData: Checking if additional data needed', {
      requestedRange: {
        from: requestedRange.from.toISOString().split('T')[0],
        to: requestedRange.to.toISOString().split('T')[0]
      },
      loadedRange: {
        from: loadedRange.from?.toISOString().split('T')[0] || 'null',
        to: loadedRange.to?.toISOString().split('T')[0] || 'null'
      }
    });
    
    // Check if we need earlier data (requestedRange.from < loadedRange.from)
    const needsEarlierData = !loadedRange.from || requestedRange.from < loadedRange.from;
    
    // Check if we need later data (requestedRange.to > loadedRange.to)  
    const needsLaterData = !loadedRange.to || requestedRange.to > loadedRange.to;
    
    const needsData = needsEarlierData || needsLaterData;
    
    console.log('needsAdditionalData: Analysis result', {
      needsEarlierData,
      needsLaterData,
      needsData
    });
    
    // If we have cached activities, check if they cover the requested range
    if (!needsData && activities.length > 0) {
      // Find the date range of cached activities
      const cachedDates = activities.map(activity => new Date(activity.start_date));
      const cachedMinDate = new Date(Math.min(...cachedDates));
      const cachedMaxDate = new Date(Math.max(...cachedDates));
      
      // Check if cached activities cover the requested range
      const cacheCoversRange = requestedRange.from >= cachedMinDate && requestedRange.to <= cachedMaxDate;
      
      console.log('needsAdditionalData: Checking cache coverage', {
        requestedRange: {
          from: requestedRange.from.toISOString(),
          to: requestedRange.to.toISOString()
        },
        loadedRange: {
          from: loadedDateRange.from.toISOString(),
          to: loadedDateRange.to.toISOString()
        },
        cachedRange: {
          from: cachedMinDate.toISOString(),
          to: cachedMaxDate.toISOString()
        },
        cachedActivitiesCount: activities.length,
        cacheCoversRange,
        needsEarlierData,
        needsLaterData
      });
      
      return !cacheCoversRange;
    }
    
    return needsData;
  }, [dateRange, loadedDateRange, activities]);

  const refreshData = async () => {
    console.log('refreshData: Starting efficient cache-first data refresh', {
      hasAccessToken: !!accessToken,
      hasSmartCache: !!smartCache,
      activitiesCount: activities.length,
      dateRange: {
        from: dateRange.from?.toISOString() || 'null',
        to: dateRange.to?.toISOString() || 'null'
      },
      timestamp: new Date().toISOString()
    });
    
    if (!accessToken) {
      console.log('refreshData: No access token, loading demo data');
      await loadDemoData();
      return;
    }

    if (!smartCache) {
      console.log('refreshData: Smart cache not available, cannot proceed efficiently');
      toast.error('Smart cache not ready. Please wait a moment and try again.');
      return;
    }

    setIsLoading(true);
    
    try {
      // STEP 1: Load all cached activities immediately
      console.log('refreshData: Step 1 - Loading all cached activities from smart cache');
      let cachedActivities = [];
      
      try {
        await smartCache.database.initPromise; // Ensure database is ready
        cachedActivities = await smartCache.database.getAllActivities();
        console.log('refreshData: Cached activities loaded', {
          cachedCount: cachedActivities.length,
          withPrivateNotes: cachedActivities.filter(a => a.private_note).length,
          dateRange: cachedActivities.length > 0 ? {
            earliest: new Date(Math.min(...cachedActivities.map(a => new Date(a.start_date)))).toISOString(),
            latest: new Date(Math.max(...cachedActivities.map(a => new Date(a.start_date)))).toISOString()
          } : null
        });
      } catch (cacheError) {
        console.warn('refreshData: Failed to load cached activities', cacheError);
        cachedActivities = [];
      }

      // Set cached activities immediately for instant UI update
      if (cachedActivities.length > 0) {
        setActivities(cachedActivities);
        setIsRealData(true);
        
        // Update loaded date range based on cached data
        const dates = cachedActivities.map(a => new Date(a.start_date));
        setLoadedDateRange({
          from: new Date(Math.min(...dates)),
          to: new Date(Math.max(...dates))
        });
        
        toast.success(`Loaded ${cachedActivities.length} cached activities instantly!`);
      }

      // STEP 2: Determine if we need to fetch additional recent activities
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      // Check what's the most recent activity in cache
      let mostRecentCached = null;
      if (cachedActivities.length > 0) {
        const sortedByDate = cachedActivities.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        mostRecentCached = new Date(sortedByDate[0].start_date);
      }
      
      console.log('refreshData: Step 2 - Analyzing cache coverage', {
        mostRecentCached: mostRecentCached?.toISOString() || 'none',
        thirtyDaysAgo: thirtyDaysAgo.toISOString(),
        needsRecentData: !mostRecentCached || mostRecentCached < thirtyDaysAgo
      });

      // Only fetch if we're missing recent data (within 30 days)
      let shouldFetchRecent = false;
      let fetchAfter = null;
      
      if (!mostRecentCached) {
        // No cached data, fetch last 30 days
        shouldFetchRecent = true;
        fetchAfter = Math.floor(thirtyDaysAgo.getTime() / 1000);
        console.log('refreshData: No cached data, will fetch last 30 days');
      } else if (mostRecentCached < thirtyDaysAgo) {
        // Cached data is older than 30 days, fetch recent data
        shouldFetchRecent = true;
        fetchAfter = Math.floor(thirtyDaysAgo.getTime() / 1000);
        console.log('refreshData: Cached data is old, will fetch recent activities');
      } else {
        // Check if there might be new activities since the most recent cached one
        const daysSinceLastCached = (now - mostRecentCached) / (24 * 60 * 60 * 1000);
        if (daysSinceLastCached > 1) {
          shouldFetchRecent = true;
          fetchAfter = Math.floor(mostRecentCached.getTime() / 1000);
          console.log('refreshData: Checking for new activities since last cached', {
            daysSinceLastCached: daysSinceLastCached.toFixed(1)
          });
        } else {
          console.log('refreshData: Cache is up to date, no API calls needed');
        }
      }

      // STEP 3: Fetch recent activities if needed
      if (shouldFetchRecent) {
        try {
          console.log('refreshData: Step 3 - Fetching recent activities from API', {
            fetchAfter: new Date(fetchAfter * 1000).toISOString()
          });
          
          const stravaAPI = new StravaAPI(accessToken);
          
          // Test API connection
          try {
            await stravaAPI.getAthlete();
            console.log('refreshData: API connection verified');
          } catch (testError) {
            console.warn('refreshData: API connection failed, using cached data only', testError.message);
            if (cachedActivities.length > 0) {
              toast.info('API unavailable, showing cached activities');
              return;
            } else {
              throw testError;
            }
          }

          // Fetch recent summary activities
          const recentSummaries = await stravaAPI.getActivities({
            after: fetchAfter,
            per_page: 100
          });
          
          console.log('refreshData: Recent activities fetched', {
            recentCount: recentSummaries.length,
            dateRange: recentSummaries.length > 0 ? {
              earliest: new Date(Math.min(...recentSummaries.map(a => new Date(a.start_date)))).toISOString(),
              latest: new Date(Math.max(...recentSummaries.map(a => new Date(a.start_date)))).toISOString()
            } : null
          });

          if (recentSummaries.length > 0) {
            // Filter out activities we already have cached
            const cachedIds = new Set(cachedActivities.map(a => a.id));
            const newActivities = recentSummaries.filter(a => !cachedIds.has(a.id));
            
            console.log('refreshData: Filtering new activities', {
              totalFetched: recentSummaries.length,
              alreadyCached: recentSummaries.length - newActivities.length,
              newActivities: newActivities.length
            });

            if (newActivities.length > 0) {
              // Use smart cache to efficiently get detailed data
              const detailedNewActivities = await smartCache.loadActivitiesWithPrivateNotes(newActivities);
              
              console.log('refreshData: New activities processed', {
                newDetailedCount: detailedNewActivities.length,
                withPrivateNotes: detailedNewActivities.filter(a => a.private_note).length
              });

              // Merge with existing cached activities
              const allActivities = [...cachedActivities, ...detailedNewActivities];
              
              // Sort by date (newest first)
              allActivities.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
              
              setActivities(allActivities);
              
              // Update loaded date range
              const allDates = allActivities.map(a => new Date(a.start_date));
              setLoadedDateRange({
                from: new Date(Math.min(...allDates)),
                to: new Date(Math.max(...allDates))
              });
              
              toast.success(`Added ${detailedNewActivities.length} new activities to cache!`);
            } else {
              toast.info('Cache is up to date - no new activities found');
            }
          }
          
        } catch (apiError) {
          console.warn('refreshData: API fetch failed, using cached data only', {
            error: apiError.message,
            hasCachedData: cachedActivities.length > 0
          });
          
          if (cachedActivities.length > 0) {
            toast.info('API temporarily unavailable, showing cached activities');
          } else {
            throw apiError;
          }
        }
      }

      // Get updated cache stats
      try {
        const stats = await smartCache.getStats();
        setCacheStats(stats);
      } catch (statsError) {
        console.warn('refreshData: Failed to get cache stats', statsError);
      }
      
    } catch (error) {
      console.error('refreshData: Failed to load activities', {
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // Final fallback: try to load from smart cache database directly
      if (smartCache && smartCache.database) {
        try {
          console.log('refreshData: Trying direct database access as final fallback');
          await smartCache.database.initPromise;
          const fallbackActivities = await smartCache.database.getAllActivities();
          
          if (fallbackActivities && fallbackActivities.length > 0) {
            console.log('refreshData: Loaded from database fallback', {
              count: fallbackActivities.length
            });
            setActivities(fallbackActivities);
            setIsRealData(true);
            toast.info(`Loaded ${fallbackActivities.length} activities from cache (API unavailable)`);
            return;
          }
        } catch (fallbackError) {
          console.warn('refreshData: Database fallback failed', fallbackError);
        }
      }
      
      // Ultimate fallback: demo data
      console.log('refreshData: Loading demo data as ultimate fallback');
      await loadDemoData();
      toast.error('Failed to load activities. Showing demo data.');
      
    } finally {
      setIsLoading(false);
    }
  };

  const loadDemoData = async () => {
    console.log('loadDemoData: Loading demo data');
    
    const today = new Date();
    const demoActivities = [
      {
        id: 'demo-1',
        name: 'Morning Training Run',
        type: 'Run',
        distance: 8047, // 5 miles in meters
        moving_time: 2400, // 40 minutes
        total_elevation_gain: 150,
        start_date: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        private_note: 'Felt great today! Weather was perfect. Maintained steady pace throughout. Need to focus on hydration for longer runs.',
        average_speed: 3.35
      },
      {
        id: 'demo-2',
        name: 'Evening Bike Ride',
        type: 'Ride',
        distance: 32186, // 20 miles in meters
        moving_time: 4500, // 75 minutes
        total_elevation_gain: 300,
        start_date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        private_note: 'Great ride through the countryside. Encountered headwind on the way back but pushed through. Bike handling feels more confident.',
        average_speed: 7.15
      },
      {
        id: 'demo-3',
        name: 'Recovery Walk',
        type: 'Walk',
        distance: 3219, // 2 miles in meters
        moving_time: 1800, // 30 minutes
        total_elevation_gain: 50,
        start_date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        private_note: 'Easy recovery walk. Legs felt heavy from yesterday\'s workout but good to keep moving.',
        average_speed: 1.79
      },
      {
        id: 'demo-4',
        name: 'Interval Training',
        type: 'Run',
        distance: 6437, // 4 miles in meters
        moving_time: 2100, // 35 minutes
        total_elevation_gain: 80,
        start_date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
        private_note: 'Tough interval session. 6x800m repeats with 400m recovery. Hit target times on most intervals. Core work after.',
        average_speed: 3.07
      },
      {
        id: 'demo-5',
        name: 'Long Weekend Ride',
        type: 'Ride',
        distance: 64374, // 40 miles in meters
        moving_time: 7200, // 2 hours
        total_elevation_gain: 600,
        start_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        private_note: 'Longest ride of the month! Great scenery and perfect weather. Nutrition strategy worked well - felt strong throughout.',
        average_speed: 8.94
      }
    ];
    
    setActivities(demoActivities);
    setIsRealData(false);
    
    // Set demo date range
    const demoDates = demoActivities.map(a => new Date(a.start_date));
    setLoadedDateRange({
      from: new Date(Math.min(...demoDates)),
      to: new Date(Math.max(...demoDates))
    });
    
    console.log('loadDemoData: Demo data loaded', {
      activitiesCount: demoActivities.length,
      hasPrivateNotes: demoActivities.filter(a => a.private_note).length
    });
  };

  const handleActivitySelect = async (activity) => {
    console.log('handleActivitySelect: Activity selected', {
      activityId: activity.id,
      activityName: activity.name,
      hasAccessToken: !!accessToken
    });
    
    setSelectedActivity(activity);
    setSelectedActivityDetails(null);

    if (!accessToken) {
      // For demo mode, we already have all the details
      console.log('handleActivitySelect: Demo mode, using activity data directly');
      setSelectedActivityDetails(activity);
      return;
    }

    setIsLoadingDetails(true);
    try {
      // Check smart cache first
      if (smartCache) {
        try {
          const cachedActivity = await smartCache.database.getActivity(activity.id);
          if (cachedActivity) {
            console.log('handleActivitySelect: Using smart cached activity data');
            setSelectedActivityDetails(cachedActivity);
            setIsLoadingDetails(false);
            return;
          }
        } catch (cacheError) {
          console.warn('handleActivitySelect: Failed to check smart cache', cacheError);
        }
      }

      const stravaAPI = new StravaAPI(accessToken);
      const details = await stravaAPI.getActivity(activity.id);
      
      // Cache the detailed data in smart cache
      if (smartCache) {
        try {
          await smartCache.database.storeActivity(details);
          console.log('handleActivitySelect: Stored activity in smart cache');
        } catch (cacheError) {
          console.warn('handleActivitySelect: Failed to store in smart cache', cacheError);
        }
      }
      
      console.log('handleActivitySelect: Activity details loaded', {
        activityId: activity.id,
        hasPrivateNote: !!details.private_note,
        privateNoteLength: details.private_note ? details.private_note.length : 0
      });
      
      setSelectedActivityDetails(details);
    } catch (error) {
      console.error('handleActivitySelect: Failed to load activity details', {
        activityId: activity.id,
        error: error.message,
        errorType: error.constructor.name
      });
      
      // Fallback to the activity summary data
      console.log('handleActivitySelect: Using summary data as fallback');
      setSelectedActivityDetails(activity);
      toast.error('Failed to load detailed activity data. Showing summary.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleDateRangeChange = (newRange) => {
    console.log('handleDateRangeChange: Date range changed', {
      oldRange: {
        from: dateRange.from?.toISOString() || 'null',
        to: dateRange.to?.toISOString() || 'null'
      },
      newRange: {
        from: newRange.from?.toISOString() || 'null',
        to: newRange.to?.toISOString() || 'null'
      }
    });
    
    setDateRange(newRange);
  };

  // Initialize smart cache when access token is available
  useEffect(() => {
    if (accessToken && !smartCache) {
      console.log('useEffect: Initializing smart cache with access token');
      const initializeSmartCache = async () => {
        try {
          const cache = new SmartActivityCache(accessToken);
          // Wait for database to be initialized
          await cache.database.initPromise;
          setSmartCache(cache);
          console.log('useEffect: Smart cache initialized and database ready');
        } catch (error) {
          console.error('useEffect: Failed to initialize smart cache', error);
        }
      };
      initializeSmartCache();
    } else if (!accessToken && smartCache) {
      console.log('useEffect: Clearing smart cache due to missing access token');
      setSmartCache(null);
      setCacheStats(null);
    }
  }, [accessToken, smartCache]);

  // Load initial data
  useEffect(() => {
    console.log('useEffect: Initial data load triggered', {
      hasAccessToken: !!accessToken,
      hasSmartCache: !!smartCache,
      activitiesCount: activities.length,
      isRealData,
      timestamp: new Date().toISOString()
    });
    
    const loadInitialData = async () => {
      if (accessToken) {
        // Wait for smart cache to be initialized if access token is available
        if (smartCache) {
          console.log('useEffect: Access token and smart cache available, fetching real data');
          await refreshData();
        } else {
          console.log('useEffect: Access token available but smart cache not ready yet');
        }
      } else if (activities.length === 0) {
        // Only load demo data if no access token and no activities
        console.log('useEffect: No access token, loading demo data');
        await loadDemoData();
      }
    };
    
    loadInitialData();
  }, [accessToken, smartCache]); // Added smartCache dependency

  // Refresh data when date range changes and we need additional data
  useEffect(() => {
    if (needsAdditionalData && !isLoading) {
      console.log('useEffect: Additional data needed due to date range change');
      refreshData();
    }
  }, [needsAdditionalData]);

  // Show activity details if an activity is selected
  if (selectedActivity) {
    return (
      <div className="container mx-auto p-4">
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={() => setSelectedActivity(null)}
            className="mb-4"
          >
            ← Back to Activities
          </Button>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {selectedActivity.type === 'Run' ? '🏃‍♂️' : selectedActivity.type === 'Ride' ? '🚴‍♂️' : '⚡'}
                </span>
                <div>
                  <CardTitle className="text-2xl">{selectedActivity.name}</CardTitle>
                  <p className="text-muted-foreground">
                    {new Date(selectedActivity.start_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingDetails ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                </div>
              ) : selectedActivityDetails ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-card rounded-lg border">
                      <div className="text-3xl font-bold text-primary">
                        {formatDistance(selectedActivityDetails.distance, units)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Distance</div>
                    </div>
                    <div className="text-center p-4 bg-card rounded-lg border">
                      <div className="text-3xl font-bold text-accent">
                        {formatDuration(selectedActivityDetails.moving_time)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Moving Time</div>
                    </div>
                    <div className="text-center p-4 bg-card rounded-lg border">
                      <div className="text-3xl font-bold text-success">
                        {formatSpeed(selectedActivityDetails.average_speed || 0, units)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Avg Speed</div>
                    </div>
                    <div className="text-center p-4 bg-card rounded-lg border">
                      <div className="text-3xl font-bold text-warning">
                        {formatElevation(selectedActivityDetails.total_elevation_gain || 0, units)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Elevation</div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span className="text-blue-600 dark:text-blue-400">📝</span>
                          Private Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap text-blue-900 dark:text-blue-100">
                          {selectedActivityDetails.private_note || 'N/A'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading activity details...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {!accessToken && (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              Demo Mode
            </Badge>
          )}
          {accessToken && isRealData && (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              Live Data
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={units} onValueChange={setUnits}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="metric">Metric</SelectItem>
              <SelectItem value="imperial">Imperial</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {/* Smart Cache Status */}
          {smartCache && cacheStats && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              <span>
                Cache: {cacheStats.totalActivities} activities, {cacheStats.activitiesWithNotes} with notes
              </span>
              {cacheStats.session && (
                <span className="text-xs">
                  ({cacheStats.session.hitRate}% hit rate)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">{stats.totalActivities}</div>
            </div>
            <div className="text-sm text-muted-foreground">Activities</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">{formatDistance(stats.totalDistance, units)}</div>
            </div>
            <div className="text-sm text-muted-foreground">Total Distance</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">{formatDuration(stats.totalTime)}</div>
            </div>
            <div className="text-sm text-muted-foreground">Total Time</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">{formatElevation(stats.totalElevation, units)}</div>
            </div>
            <div className="text-sm text-muted-foreground">Total Elevation</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activities" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="activities">Recent Activities</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>
          
          {/* View mode toggle for activities tab only */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">View:</span>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <TableProperties className="h-4 w-4 mr-1" />
              Table
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              <Activity className="h-4 w-4 mr-1" />
              Cards
            </Button>
          </div>
        </div>

        <TabsContent value="activities" className="space-y-4">
          {/* Activity Filters */}
          <ActivityFilters
            filters={filters}
            onFiltersChange={setFilters}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            availableActivityTypes={availableActivityTypes}
          />

          {isLoading ? (
            <div className="space-y-4">
              {viewMode === 'table' ? (
                <div className="rounded-md border">
                  <div className="p-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full mb-2" />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-64 w-full" />
                  ))}
                </div>
              )}
            </div>
          ) : filteredActivities.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No activities found</h3>
                <p className="text-muted-foreground mb-4">
                  {activities.length === 0 
                    ? "Click 'Refresh' to load your Strava activities" 
                    : "Try adjusting your filters or date range"}
                </p>
              </CardContent>
            </Card>
          ) : viewMode === 'table' ? (
            <ActivityTable 
              activities={filteredActivities} 
              onActivitySelect={handleActivitySelect}
              units={units}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onClick={() => handleActivitySelect(activity)}
                  units={units}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(activityTypeStats).map(([type, stats]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {stats.count} activities
                        </span>
                      </div>
                      <div className="text-sm font-medium">
                        {formatDistance(stats.distance, units)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}