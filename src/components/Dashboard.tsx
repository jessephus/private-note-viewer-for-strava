import { useState, useEffect } from 'react';
import { useKV } from '@github/spark/hooks';
import { StravaActivity } from '@/lib/strava-types';
import { ActivityCard } from './ActivityCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, TrendingUp, User, SignOut, RefreshCw } from '@phosphor-icons/react';
import { formatDistance, formatDuration } from '@/lib/strava-api';
import { toast } from 'sonner';

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [activities, setActivities] = useKV<StravaActivity[]>('strava-activities', []);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<StravaActivity | null>(null);

  // Generate demo data for the demo mode
  const generateDemoActivities = (): StravaActivity[] => {
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
    const typeStats: Record<string, { count: number; distance: number; time: number }> = {};
    
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
              <SignOut className="mr-2 h-4 w-4" />
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
                  <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-600">
                      {Math.round(selectedActivity.average_heartrate)} bpm
                    </div>
                    <div className="text-sm text-red-600 mt-1">Avg Heart Rate</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-600">
                      {Math.round(selectedActivity.max_heartrate || 0)} bpm
                    </div>
                    <div className="text-sm text-red-600 mt-1">Max Heart Rate</div>
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Activity Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={refreshData} variant="outline" disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={onLogout}>
              <SignOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Activity className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{totalActivities}</p>
                      <p className="text-sm text-muted-foreground">Total Activities</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏃‍♂️</span>
                    <div>
                      <p className="text-2xl font-bold text-primary">{formatDistance(totalDistance)}</p>
                      <p className="text-sm text-muted-foreground">Total Distance</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⏱️</span>
                    <div>
                      <p className="text-2xl font-bold text-accent">{formatDuration(totalTime)}</p>
                      <p className="text-sm text-muted-foreground">Total Time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⛰️</span>
                    <div>
                      <p className="text-2xl font-bold text-success">{Math.round(totalElevation)}m</p>
                      <p className="text-sm text-muted-foreground">Total Elevation</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Recent Activities</h2>
              {isLoading ? (
                <div className="grid gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-[250px]" />
                            <Skeleton className="h-4 w-[200px]" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4">
                  {activities.map(activity => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      onClick={() => setSelectedActivity(activity)}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Activity Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(activityTypeStats).map(([type, stats]) => (
                    <div key={type} className="flex items-center justify-between p-4 bg-card rounded-lg border">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {type === 'Run' ? '🏃‍♂️' : type === 'Ride' ? '🚴‍♂️' : '⚡'}
                        </span>
                        <div>
                          <p className="font-semibold">{type}</p>
                          <p className="text-sm text-muted-foreground">{stats.count} activities</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatDistance(stats.distance)}</p>
                        <p className="text-sm text-muted-foreground">{formatDuration(stats.time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}