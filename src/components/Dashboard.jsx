import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { ActivityCard } from './ActivityCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, TrendingUp, User, LogOut, RefreshCw } from 'lucide-react';
import { formatDistance, formatDuration } from '@/lib/strava-api';
import { toast } from 'sonner';

export function Dashboard({ onLogout }) {
  const [activities, setActivities] = useLocalStorage('strava-activities', []);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  // Generate demo data for the demo mode
  const generateDemoActivities = () => {
    const types = ['Run', 'Ride', 'Swim', 'Hike'];
    const names = [
      'Morning Run', 'Evening Ride', 'Lunch Break Run', 'Weekend Long Ride',
      'Hill Intervals', 'Recovery Swim', 'Trail Run', 'Commute Ride',
      'Speed Work', 'Base Building Run', 'Mountain Hike', 'Track Session'
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
    }));
  };

  const loadDemoData = () => {
    setIsLoading(true);
    setTimeout(() => {
      const demoActivities = generateDemoActivities();
      setActivities(demoActivities);
      setIsLoading(false);
      toast.success('Demo activities loaded!');
    }, 1000);
  };

  useEffect(() => {
    if (activities.length === 0) {
      loadDemoData();
    }
  }, []);

  const refreshData = () => {
    loadDemoData();
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
              onClick={() => setSelectedActivity(null)}
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-card rounded-lg border">
                  <div className="text-3xl font-bold text-primary">
                    {formatDistance(selectedActivity.distance)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Distance</div>
                </div>
                <div className="text-center p-4 bg-card rounded-lg border">
                  <div className="text-3xl font-bold text-accent">
                    {formatDuration(selectedActivity.moving_time)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Moving Time</div>
                </div>
                <div className="text-center p-4 bg-card rounded-lg border">
                  <div className="text-3xl font-bold text-success">
                    {((selectedActivity.average_speed || 0) * 3.6).toFixed(1)} km/h
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Avg Speed</div>
                </div>
                <div className="text-center p-4 bg-card rounded-lg border">
                  <div className="text-3xl font-bold">
                    {Math.round(selectedActivity.total_elevation_gain)}m
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Elevation</div>
                </div>
              </div>

              {selectedActivity.average_heartrate && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-card rounded-lg border">
                    <div className="text-2xl font-bold text-red-500">
                      {Math.round(selectedActivity.average_heartrate)} bpm
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Avg Heart Rate</div>
                  </div>
                  <div className="text-center p-4 bg-card rounded-lg border">
                    <div className="text-2xl font-bold text-red-600">
                      {Math.round(selectedActivity.max_heartrate)} bpm
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Max Heart Rate</div>
                  </div>
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
          </div>
          <div className="flex items-center gap-2">
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
                <div className="text-2xl font-bold">{formatDistance(totalDistance)}</div>
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
                <div className="text-2xl font-bold">{Math.round(totalElevation)}m</div>
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
                          {formatDistance(stats.distance)}
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