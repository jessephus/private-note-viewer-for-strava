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
import { Activity, TrendingUp, User, LogOut, RefreshCw, TableProperties } from 'lucide-react';
import { formatDistance, formatDuration, formatSpeed, formatElevation, StravaAPI } from '@/lib/strava-api';
import { toast } from 'sonner';

export function Dashboard({ onLogout, accessToken }) {
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
  
  // Initialize activity cache with 60 minute TTL
  const activityCache = useActivityCache(60);

  // Filtered activities based on current filters
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Filter by activity type
    if (filters.activityType && filters.activityType !== 'all') {
      filtered = filtered.filter(activity => 
        activity.type === filters.activityType || activity.sport_type === filters.activityType
      );
    }

    // Filter by distance range
    if (filters.minDistance) {
      const minDistanceM = parseFloat(filters.minDistance) * 1000; // Convert km to meters
      filtered = filtered.filter(activity => activity.distance >= minDistanceM);
    }
    
    if (filters.maxDistance) {
      const maxDistanceM = parseFloat(filters.maxDistance) * 1000; // Convert km to meters
      filtered = filtered.filter(activity => activity.distance <= maxDistanceM);
    }

    // Filter by title keywords
    if (filters.titleKeywords) {
      const keywords = filters.titleKeywords.toLowerCase().split(' ').filter(k => k.trim());
      filtered = filtered.filter(activity => 
        keywords.some(keyword => 
          activity.name.toLowerCase().includes(keyword)
        )
      );
    }

    // Filter by notes keywords
    if (filters.notesKeywords) {
      const keywords = filters.notesKeywords.toLowerCase().split(' ').filter(k => k.trim());
      filtered = filtered.filter(activity => 
        activity.private_note && keywords.some(keyword => 
          activity.private_note.toLowerCase().includes(keyword)
        )
      );
    }

    // Filter by date range (for display)
    if (dateRange.from) {
      filtered = filtered.filter(activity => 
        new Date(activity.start_date) >= dateRange.from
      );
    }
    
    if (dateRange.to) {
      // Set to end of day for the 'to' date
      const endOfDay = new Date(dateRange.to);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(activity => 
        new Date(activity.start_date) <= endOfDay
      );
    }

    return filtered;
  }, [activities, filters, dateRange]);

  // Get available activity types for filter dropdown
  const availableActivityTypes = useMemo(() => {
    const types = new Set();
    activities.forEach(activity => {
      types.add(activity.type);
      if (activity.sport_type && activity.sport_type !== activity.type) {
        types.add(activity.sport_type);
      }
    });
    return Array.from(types).sort();
  }, [activities]);

  // Generate demo data for the demo mode
  const generateDemoActivities = () => {
    const types = ['Run', 'Ride', 'Swim', 'Hike'];
    const names = [
      'Morning Run', 'Evening Ride', 'Lunch Break Run', 'Weekend Long Ride',
      'Hill Intervals', 'Recovery Swim', 'Trail Run', 'Commute Ride',
      'Speed Work', 'Base Building Run', 'Mountain Hike', 'Track Session'
    ];
    
    const privateNotes = [
      'Felt really strong today! Weather was perfect and I maintained a good pace throughout.',
      'Struggled a bit with the hills but pushed through. Need to work on climbing strength.',
      'Great recovery session. Took it easy and focused on form.',
      null, // Some activities won't have notes
      'Amazing trail conditions. Saw some wildlife and took photos at the summit!',
      null,
      'New route today - loved the variety. Will definitely do this again.',
      'Commute was smooth but traffic was heavy. Good to get some exercise in.',
      null,
      'Base building week - keeping effort sustainable. Good consistency.',
      'Challenging hike but the views were worth it! Met some friendly hikers.',
      null
    ];

    return Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      name: names[i % names.length],
      distance: Math.random() * 25000 + 2000, // 2-27km
      moving_time: Math.random() * 7200 + 1800, // 30min - 2.5h
      elapsed_time: Math.random() * 8000 + 2000,
      total_elevation_gain: Math.random() * 800 + 50,
      type: types[Math.floor(Math.random() * types.length)],
      sport_type: types[Math.floor(Math.random() * types.length)],
      start_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      start_date_local: new Date().toISOString(),
      timezone: 'Europe/London',
      average_speed: Math.random() * 8 + 2,
      max_speed: Math.random() * 15 + 8,
      average_heartrate: Math.random() * 50 + 120,
      max_heartrate: Math.random() * 30 + 170,
      achievement_count: Math.floor(Math.random() * 3),
      kudos_count: Math.floor(Math.random() * 10),
      comment_count: Math.floor(Math.random() * 3),
      photo_count: Math.floor(Math.random() * 2),
      trainer: Math.random() > 0.8,
      commute: Math.random() > 0.7,
      private_note: privateNotes[i % privateNotes.length], // Add private notes to demo data
    }));
  };

  const loadDemoData = () => {
    setIsLoading(true);
    setTimeout(() => {
      const demoActivities = generateDemoActivities();
      setActivities(demoActivities);
      setIsRealData(false);
      setIsLoading(false);
      toast.success('Demo activities loaded!');
    }, 1000);
  };

  const loadRealData = async () => {
    if (!accessToken) {
      console.log('loadRealData: No access token available, falling back to demo data');
      loadDemoData();
      return;
    }

    console.log('loadRealData: Starting to load real Strava data', {
      hasToken: !!accessToken,
      tokenPrefix: accessToken.substring(0, 8) + '...',
      timestamp: new Date().toISOString()
    });

    setIsLoading(true);
    try {
      const stravaAPI = new StravaAPI(accessToken);
      const realActivities = await stravaAPI.getActivities(1, 30);
      
      console.log('loadRealData: Successfully loaded real Strava data', {
        activitiesCount: realActivities.length,
        firstActivityDate: realActivities[0]?.start_date,
        lastActivityDate: realActivities[realActivities.length - 1]?.start_date
      });
      
      // Set initial activities data immediately so the UI shows something
      setActivities(realActivities);
      setIsRealData(true);
      toast.success(`Loaded ${realActivities.length} activities from Strava!`);
      
      // Now preload detailed data for all activities to get private notes
      console.log('loadRealData: Starting to preload private notes for all activities');
      
      const detailedActivities = await Promise.all(
        realActivities.map(async (activity) => {
          try {
            // Check cache first
            const cachedActivity = activityCache.getCachedActivity(activity.id);
            if (cachedActivity) {
              console.log('loadRealData: Using cached detailed data for activity', {
                activityId: activity.id,
                hasPrivateNote: !!cachedActivity.private_note
              });
              return cachedActivity;
            }
            
            // Fetch detailed activity data including private notes
            const detailedActivity = await stravaAPI.getActivity(activity.id);
            
            // Cache the detailed data
            activityCache.setCachedActivity(activity.id, detailedActivity);
            
            console.log('loadRealData: Loaded detailed data for activity', {
              activityId: activity.id,
              hasPrivateNote: !!detailedActivity.private_note,
              privateNoteLength: detailedActivity.private_note ? detailedActivity.private_note.length : 0
            });
            
            return detailedActivity;
          } catch (error) {
            console.warn('loadRealData: Failed to load detailed data for activity, using summary', {
              activityId: activity.id,
              error: error.message
            });
            // Return summary data if detailed fetch fails
            return activity;
          }
        })
      );
      
      console.log('loadRealData: Successfully preloaded private notes', {
        totalActivities: detailedActivities.length,
        activitiesWithNotes: detailedActivities.filter(a => a.private_note).length
      });
      
      // Update activities with detailed data including private notes
      setActivities(detailedActivities);
      setIsLoading(false);
      
    } catch (error) {
      console.error('loadRealData: Failed to load real activities', {
        error: error.message,
        errorType: error.constructor.name,
        hasToken: !!accessToken,
        tokenPrefix: accessToken ? accessToken.substring(0, 8) + '...' : 'none',
        timestamp: new Date().toISOString(),
        isAuthError: error.message.includes('Unauthorized') || error.message.includes('401')
      });
      
      setIsLoading(false);
      
      // Check if it's an auth error
      if (error.message.includes('Unauthorized') || error.message.includes('401')) {
        console.warn('loadRealData: Authentication error detected, logging user out', {
          error: error.message,
          willLogout: true
        });
        toast.error('Your Strava session has expired. Please sign in again.');
        onLogout(); // This will clear the invalid token
        return;
      }
      
      console.warn('loadRealData: Non-auth error, falling back to demo data', {
        error: error.message,
        fallbackAction: 'loading demo data'
      });
      
      toast.error('Failed to load Strava data, showing demo instead');
      // Fallback to demo data if API fails
      loadDemoData();
    }
  };

  const fetchActivityDetails = async (activity) => {
    // If we're in demo mode or don't have access token, use the summary data
    if (!accessToken || !isRealData) {
      setSelectedActivity(activity);
      setSelectedActivityDetails(activity);
      return;
    }

    setSelectedActivity(activity);
    setIsLoadingDetails(true);
    
    try {
      // Check cache first
      const cachedActivity = activityCache.getCachedActivity(activity.id);
      
      if (cachedActivity) {
        console.log('fetchActivityDetails: Using cached activity data', {
          activityId: activity.id,
          hasPrivateNote: !!cachedActivity.private_note,
          privateNoteLength: cachedActivity.private_note ? cachedActivity.private_note.length : 0
        });
        
        setSelectedActivityDetails(cachedActivity);
        setIsLoadingDetails(false);
        return;
      }
      
      // Cache miss - fetch from API
      console.log('fetchActivityDetails: Cache miss, fetching from API', {
        activityId: activity.id
      });
      
      const stravaAPI = new StravaAPI(accessToken);
      const detailedActivity = await stravaAPI.getActivity(activity.id);
      
      console.log('fetchActivityDetails: Successfully loaded detailed activity data from API', {
        activityId: activity.id,
        hasPrivateNote: !!detailedActivity.private_note,
        privateNoteLength: detailedActivity.private_note ? detailedActivity.private_note.length : 0
      });
      
      // Cache the result
      activityCache.setCachedActivity(activity.id, detailedActivity);
      
      setSelectedActivityDetails(detailedActivity);
    } catch (error) {
      console.error('fetchActivityDetails: Failed to load detailed activity', {
        activityId: activity.id,
        error: error.message,
        errorType: error.constructor.name
      });
      
      // Fall back to summary data if detailed fetch fails
      setSelectedActivityDetails(activity);
      toast.error('Could not load activity details, showing summary data');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      // Always load real data when we have a token
      // Clear any cached demo data first
      if (!isRealData) {
        setActivities([]);
        // Clear cache when switching from demo to real data
        activityCache.clearCache();
      }
      loadRealData();
    } else if (activities.length === 0) {
      // Only load demo data if we have no activities and no token
      loadDemoData();
    }
  }, [accessToken]);

  // Periodic cache cleanup every 5 minutes
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      activityCache.cleanupExpiredEntries();
    }, 5 * 60 * 1000); // 5 minutes

    // Initial cleanup on mount
    activityCache.cleanupExpiredEntries();

    return () => clearInterval(cleanupInterval);
  }, [activityCache]);

  const refreshData = () => {
    // Clear activity details cache when refreshing data
    activityCache.clearCache();
    
    if (accessToken) {
      loadRealData();
    } else {
      loadDemoData();
    }
  };

  const getTotalStats = () => {
    const totalDistance = filteredActivities.reduce((sum, act) => sum + act.distance, 0);
    const totalTime = filteredActivities.reduce((sum, act) => sum + act.moving_time, 0);
    const totalElevation = filteredActivities.reduce((sum, act) => sum + act.total_elevation_gain, 0);
    const totalActivities = filteredActivities.length;

    return { totalDistance, totalTime, totalElevation, totalActivities };
  };

  const getActivityTypeStats = () => {
    const typeStats = {};
    
    filteredActivities.forEach(activity => {
      const type = activity.type;
      if (!typeStats[type]) {
        typeStats[type] = { count: 0, distance: 0, time: 0 };
      }
      typeStats[type].count++;
      typeStats[type].distance += activity.distance;
      typeStats[type].time += activity.moving_time;
    });

    return typeStats;
  };

  const { totalDistance, totalTime, totalElevation, totalActivities } = getTotalStats();
  const activityTypeStats = getActivityTypeStats();

  if (selectedActivity) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedActivity(null);
                setSelectedActivityDetails(null);
              }}
              className="mb-4"
            >
              ← Back to Dashboard
            </Button>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>

          <Card className="border-2">
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
                      <div className="text-3xl font-bold">
                        {formatElevation(selectedActivityDetails.total_elevation_gain, units)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Elevation</div>
                    </div>
                  </div>

                  {selectedActivityDetails.average_heartrate && (
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-card rounded-lg border">
                        <div className="text-2xl font-bold text-red-500">
                          {Math.round(selectedActivityDetails.average_heartrate)} bpm
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">Avg Heart Rate</div>
                      </div>
                      <div className="text-center p-4 bg-card rounded-lg border">
                        <div className="text-2xl font-bold text-red-600">
                          {Math.round(selectedActivityDetails.max_heartrate)} bpm
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">Max Heart Rate</div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6">
                    <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Strava Dashboard</h1>
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
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <div className="text-2xl font-bold">{totalActivities}</div>
              </div>
              <div className="text-sm text-muted-foreground">Total Activities</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div className="text-2xl font-bold">{formatDistance(totalDistance, units)}</div>
              </div>
              <div className="text-sm text-muted-foreground">Total Distance</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <div className="text-2xl font-bold">{formatDuration(totalTime)}</div>
              </div>
              <div className="text-sm text-muted-foreground">Total Time</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div className="text-2xl font-bold">{formatElevation(totalElevation, units)}</div>
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
              onDateRangeChange={setDateRange}
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
                  Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))
                )}
              </div>
            ) : (
              <>
                {filteredActivities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No activities match your current filters.
                    </p>
                  </div>
                ) : viewMode === 'table' ? (
                  <ActivityTable
                    activities={filteredActivities}
                    onClick={(activity) => fetchActivityDetails(activity)}
                    units={units}
                  />
                ) : (
                  <div className="grid gap-4">
                    {filteredActivities.map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        onClick={() => fetchActivityDetails(activity)}
                        units={units}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
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
    </div>
  );
}
