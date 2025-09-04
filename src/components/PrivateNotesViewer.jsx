import { useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useActivityCache } from '@/hooks/use-activity-cache';
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
  
  // Initialize activity cache with 60 minute TTL
  const activityCache = useActivityCache(60);
  
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
    console.log('refreshData: Starting data refresh', {
      hasAccessToken: !!accessToken,
      accessTokenValue: accessToken,
      accessTokenType: typeof accessToken,
      activitiesCount: activities.length,
      dateRange: {
        from: dateRange.from?.toISOString() || 'null',
        to: dateRange.to?.toISOString() || 'null'
      },
      needsAdditionalData,
      timestamp: new Date().toISOString()
    });
    
    if (!accessToken) {
      console.log('refreshData: No access token, loading demo data');
      await loadDemoData();
      return;
    }

    setIsLoading(true);
    try {
      console.log('refreshData: Creating StravaAPI instance with token', {
        tokenLength: accessToken.length,
        tokenStart: accessToken.substring(0, 10),
        tokenEnd: accessToken.substring(-10)
      });
      
      const stravaAPI = new StravaAPI(accessToken);
      
      // Test the API connection first
      console.log('refreshData: Testing API connection...');
      try {
        const athlete = await stravaAPI.getAthlete();
        console.log('refreshData: API connection successful', {
          athleteId: athlete?.id,
          athleteName: athlete?.firstname + ' ' + athlete?.lastname
        });
      } catch (testError) {
        console.error('refreshData: API connection test failed', {
          error: testError.message,
          errorType: testError.constructor.name
        });
        throw testError;
      }
      
      // Determine the date range to fetch
      let fetchAfter = null;
      let fetchBefore = null;
      
      if (dateRange.from && dateRange.to) {
        // Convert to Unix timestamps for Strava API
        fetchAfter = Math.floor(dateRange.from.getTime() / 1000);
        fetchBefore = Math.floor(dateRange.to.getTime() / 1000);
        
        console.log('refreshData: Using date range filter', {
          after: dateRange.from.toISOString(),
          before: dateRange.to.toISOString(),
          afterUnix: fetchAfter,
          beforeUnix: fetchBefore
        });
      } else {
        console.log('refreshData: No date range specified, fetching recent activities');
      }

      console.log('refreshData: Calling getActivities with parameters', {
        after: fetchAfter,
        before: fetchBefore,
        per_page: 100
      });

      // Fetch summary activities first (fast, minimal API usage)
      const summaryActivities = await stravaAPI.getActivities({
        after: fetchAfter,
        before: fetchBefore,
        per_page: 100
      });
      
      console.log('refreshData: Summary activities fetched', {
        summaryCount: summaryActivities.length,
        activityTypes: [...new Set(summaryActivities.map(a => a.type))],
        dateRange: {
          earliest: summaryActivities.length > 0 ? new Date(Math.min(...summaryActivities.map(a => new Date(a.start_date)))).toISOString() : 'none',
          latest: summaryActivities.length > 0 ? new Date(Math.max(...summaryActivities.map(a => new Date(a.start_date)))).toISOString() : 'none'
        }
      });

      // Use smart cache to get complete activity data with minimal API calls
      let detailedActivities = [];
      let useSimpleFallback = false;
      
      // Check if we should use simple fallback (for testing/debugging)
      const urlParams = new URLSearchParams(window.location.search);
      const forceSimple = urlParams.get('simple') === 'true';
      
      if (forceSimple) {
        console.log('refreshData: Using simple fallback due to URL parameter');
        useSimpleFallback = true;
      }
      
      if (!useSimpleFallback && smartCache) {
        try {
          console.log('refreshData: Starting smart cache loading...');
          detailedActivities = await smartCache.loadActivitiesWithPrivateNotes(summaryActivities);
          console.log('refreshData: Smart cache loading complete', {
            inputSummaries: summaryActivities.length,
            outputDetailed: detailedActivities.length,
            activitiesWithNotes: detailedActivities.filter(a => a.private_note).length
          });
          
          // Check if smart cache failed to return reasonable results
          if (detailedActivities.length === 0 && summaryActivities.length > 0) {
            console.warn('refreshData: Smart cache returned no results, switching to simple fallback');
            useSimpleFallback = true;
          }
          
        } catch (smartCacheError) {
          console.error('refreshData: Smart cache failed, falling back to direct API calls', {
            error: smartCacheError.message,
            stack: smartCacheError.stack,
            summaryCount: summaryActivities.length
          });
          useSimpleFallback = true;
        }
      } else if (!smartCache) {
        console.log('refreshData: Smart cache not available, using simple fallback');
        useSimpleFallback = true;
      }
      
      if (useSimpleFallback) {
        console.log('refreshData: Using simple fallback - direct API calls for each activity');
        
        // Simple approach: fetch each activity individually
        detailedActivities = [];
        const maxActivities = Math.min(summaryActivities.length, 50); // Limit to avoid hitting rate limits
        
        for (let i = 0; i < maxActivities; i++) {
          const activity = summaryActivities[i];
          try {
            console.log(`refreshData: Fetching activity ${i + 1}/${maxActivities}`, {
              activityId: activity.id,
              name: activity.name
            });
            
            const detailedActivity = await stravaAPI.getActivity(activity.id);
            detailedActivities.push(detailedActivity);
            
            console.log('refreshData: Successfully fetched activity', {
              activityId: activity.id,
              hasPrivateNote: !!detailedActivity.private_note
            });
            
            // Small delay to be gentle on the API
            if (i < maxActivities - 1) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            
          } catch (activityError) {
            console.warn('refreshData: Failed to fetch detailed data for activity', {
              activityId: activity.id,
              error: activityError.message
            });
            detailedActivities.push(activity); // Use summary data as fallback
          }
        }
        
        console.log('refreshData: Simple fallback complete', {
          totalActivities: detailedActivities.length,
          activitiesWithNotes: detailedActivities.filter(a => a.private_note).length
        });
      }

      // Get cache statistics
      let stats = null;
      if (!useSimpleFallback && smartCache) {
        try {
          stats = await smartCache.getStats();
          setCacheStats(stats);
        } catch (statsError) {
          console.warn('refreshData: Failed to get cache stats', statsError);
        }
      }
      
      console.log('refreshData: Setting activities state', {
        activitiesCount: detailedActivities.length,
        useSimpleFallback,
        sampleActivity: detailedActivities[0] ? {
          id: detailedActivities[0].id,
          name: detailedActivities[0].name,
          hasPrivateNote: !!detailedActivities[0].private_note
        } : null
      });
      
      setActivities(detailedActivities);
      setIsRealData(true);
      
      // Update the loaded date range
      if (dateRange.from && dateRange.to) {
        setLoadedDateRange({ from: dateRange.from, to: dateRange.to });
      } else {
        // If no specific range was requested, set the range based on fetched data
        if (detailedActivities.length > 0) {
          const dates = detailedActivities.map(a => new Date(a.start_date));
          setLoadedDateRange({
            from: new Date(Math.min(...dates)),
            to: new Date(Math.max(...dates))
          });
        }
      }
      
      // Show success message with cache efficiency info
      if (useSimpleFallback) {
        toast.success(
          `Loaded ${detailedActivities.length} activities using direct API calls`,
          { duration: 5000 }
        );
      } else {
        const apiCallsMade = stats?.session?.apiCalls || 0;
        const cacheHits = stats?.session?.cacheHits || 0;
        const hitRate = stats?.session?.hitRate || 0;
        
        toast.success(
          `Loaded ${detailedActivities.length} activities! Cache efficiency: ${hitRate}% (${apiCallsMade} API calls, ${cacheHits} cache hits)`,
          { duration: 5000 }
        );
      }
      
    } catch (error) {
      console.error('refreshData: Failed to load activities', {
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // Try to load from smart cache database first
      if (smartCache) {
        try {
          console.log('refreshData: API failed, trying to load from database cache');
          const cachedActivities = await smartCache.database.getAllActivities();
          if (cachedActivities && cachedActivities.length > 0) {
            console.log('refreshData: Loaded from database cache after API failure', {
              cachedCount: cachedActivities.length,
              withPrivateNotes: cachedActivities.filter(a => a.private_note).length
            });
            setActivities(cachedActivities);
            setIsRealData(true);
            toast.info(`Loaded ${cachedActivities.length} activities from cache (API temporarily unavailable due to rate limits)`);
            
            // Update loaded date range based on cached data
            if (cachedActivities.length > 0) {
              const dates = cachedActivities.map(a => new Date(a.start_date));
              setLoadedDateRange({
                from: new Date(Math.min(...dates)),
                to: new Date(Math.max(...dates))
              });
            }
            
            return; // Exit early with cached data
          }
        } catch (cacheError) {
          console.warn('refreshData: Failed to load from database cache', {
            error: cacheError.message
          });
        }
      }
      
      // Fallback: Try to load from old cache system
      const cachedActivities = activityCache.getAllCachedActivities();
      if (cachedActivities && cachedActivities.length > 0) {
        console.log('refreshData: Loaded from old cache after API failure', {
          cachedCount: cachedActivities.length
        });
        setActivities(cachedActivities);
        setIsRealData(true);
        toast.info(`Loaded ${cachedActivities.length} activities from cache (API temporarily unavailable)`);
      } else {
        console.log('refreshData: No cache available, loading demo data');
        await loadDemoData();
        toast.error('Failed to load activities from Strava. Showing demo data.');
      }
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
      // Check cache first
      const cachedActivity = activityCache.getCachedActivity(activity.id);
      if (cachedActivity) {
        console.log('handleActivitySelect: Using cached activity data');
        setSelectedActivityDetails(cachedActivity);
        setIsLoadingDetails(false);
        return;
      }

      const stravaAPI = new StravaAPI(accessToken);
      const details = await stravaAPI.getActivity(activity.id);
      
      // Cache the detailed data
      activityCache.setCachedActivity(activity.id, details);
      
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
      const cache = new SmartActivityCache(accessToken);
      setSmartCache(cache);
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
      activitiesCount: activities.length,
      isRealData,
      timestamp: new Date().toISOString()
    });
    
    const loadInitialData = async () => {
      if (accessToken) {
        // If we have an access token, always fetch real data
        console.log('useEffect: Access token available, fetching real data');
        await refreshData();
      } else if (activities.length === 0) {
        // Only load demo data if no access token and no activities
        console.log('useEffect: No access token, loading demo data');
        await loadDemoData();
      }
    };
    
    loadInitialData();
  }, [accessToken]); // Removed isRealData from dependencies to avoid redundant calls

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