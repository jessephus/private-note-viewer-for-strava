import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { ActivityCard } from './ActivityCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, TrendingUp, User, LogOut, RefreshCw } from 'lucide-react';
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
      
      setActivities(realActivities);
      setIsRealData(true);
      setIsLoading(false);
      toast.success(`Loaded ${realActivities.length} activities from Strava!`);
    } catch (error) {
      console.error('loadRealData: Failed to load real activities', {
        error: error.message,
        errorType: error.constructor.name,
        hasToken: !!accessToken,
        tokenPrefix: accessToken ? accessToken.substring(0, 8) + '...' : 'none',
        timestamp: new Date().toISOString(),
        isAuthError: error.message.includes('Unauthorized') || error.message.includes('401')
      });
      
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
      const stravaAPI = new StravaAPI(accessToken);
      const detailedActivity = await stravaAPI.getActivity(activity.id);
      
      console.log('fetchActivityDetails: Successfully loaded detailed activity data', {
        activityId: activity.id,
        hasPrivateNote: !!detailedActivity.private_note,
        privateNoteLength: detailedActivity.private_note ? detailedActivity.private_note.length : 0
      });
      
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
      }
      loadRealData();
    } else if (activities.length === 0) {
      // Only load demo data if we have no activities and no token
      loadDemoData();
    }
  }, [accessToken]);

  const refreshData = () => {
    if (accessToken) {
      loadRealData();
    } else {
      loadDemoData();
    }
  };

  const getTotalStats = () => {
    const totalDistance = activities.reduce((sum, act) => sum + act.distance, 0);
    const totalTime = activities.reduce((sum, act) => sum + act.moving_time, 0);
    const totalElevation = activities.reduce((sum, act) => sum + act.total_elevation_gain, 0);
    const totalActivities = activities.length;

    return { totalDistance, totalTime, totalElevation, totalActivities };
  };

  const getActivityTypeStats = () => {
    const typeStats = {};
    
    activities.forEach(activity => {
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-card rounded-lg border">
                  <div className="text-3xl font-bold text-primary">
                    {formatDistance(selectedActivity.distance, units)}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
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
                <div className="text-center p-4 bg-card rounded-lg border">
                  <div className="text-3xl font-bold text-success">
                    {formatSpeed(selectedActivity.average_speed || 0, units)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Avg Speed</div>
                </div>
                <div className="text-center p-4 bg-card rounded-lg border">
                  <div className="text-3xl font-bold">
                    {formatElevation(selectedActivity.total_elevation_gain, units)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Elevation</div>
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
          <TabsList>
            <TabsTrigger value="activities">Recent Activities</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="activities" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4">
                {activities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onClick={() => setSelectedActivity(activity)}
                    units={units}
                  />
                ))}
              </div>
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
