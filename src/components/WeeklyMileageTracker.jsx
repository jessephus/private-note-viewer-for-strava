import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  CalendarDays, 
  TrendingUp, 
  Activity, 
  Timer, 
  Mountain,
  Play,
  Pause,
  Database,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { WeeklyMileageCalculator } from '@/lib/weekly-mileage-calculator';
import { WeeklyMileageDatabase } from '@/lib/weekly-mileage-database';
import { formatDistance, formatDuration } from '@/lib/strava-api';
import { toast } from 'sonner';

export function WeeklyMileageTracker({ accessToken, smartCache }) {
  const [units, setUnits] = useState('imperial'); // Default to imperial
  const [weeklyData, setWeeklyData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationStats, setCalculationStats] = useState(null);
  const [databaseStats, setDatabaseStats] = useState(null);
  const [calculator, setCalculator] = useState(null);
  const [database] = useState(new WeeklyMileageDatabase());
  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  // Initialize calculator when dependencies are ready
  useEffect(() => {
    if (accessToken && smartCache && !calculator) {
      console.log('WeeklyMileageTracker: Initializing calculator');
      const calc = new WeeklyMileageCalculator(accessToken, smartCache);
      setCalculator(calc);
    }
  }, [accessToken, smartCache, calculator]);

  // Load existing weekly data on component mount
  useEffect(() => {
    loadWeeklyData();
    loadDatabaseStats();
  }, []);

  // Auto-start calculation when calculator is ready
  useEffect(() => {
    if (calculator && !hasAutoStarted && !isCalculating) {
      console.log('WeeklyMileageTracker: Auto-starting calculation');
      setHasAutoStarted(true);
      startCalculation();
    }
  }, [calculator, hasAutoStarted, isCalculating]);

  // Auto-refresh data every 5 seconds during calculation
  useEffect(() => {
    let interval;
    if (isCalculating) {
      interval = setInterval(() => {
        loadWeeklyData();
        loadDatabaseStats();
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCalculating]);

  const loadWeeklyData = async () => {
    try {
      setIsLoading(true);
      const data = await database.getAllWeeklyMileage();
      setWeeklyData(data);
      console.log('WeeklyMileageTracker: Loaded weekly data', {
        weeks: data.length,
        completeWeeks: data.filter(w => w.isComplete).length
      });
    } catch (error) {
      console.error('WeeklyMileageTracker: Failed to load weekly data', error);
      toast.error('Failed to load weekly mileage data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDatabaseStats = async () => {
    try {
      const stats = await database.getStats();
      setDatabaseStats(stats);
    } catch (error) {
      console.error('WeeklyMileageTracker: Failed to load database stats', error);
    }
  };

  const startCalculation = async () => {
    if (!calculator) {
      toast.error('Calculator not ready. Please wait a moment.');
      return;
    }

    if (isCalculating) {
      toast.warning('Calculation already in progress');
      return;
    }

    try {
      setIsCalculating(true);
      toast.info('Starting weekly mileage calculation...');
      
      const stats = await calculator.calculateWeeklyMileage();
      setCalculationStats(stats);
      
      // Reload data after calculation
      await loadWeeklyData();
      await loadDatabaseStats();
      
      if (stats.rateLimitReached) {
        toast.warning(
          `Calculation stopped due to rate limits. Processed ${stats.weeksProcessed} weeks.`,
          { duration: 6000 }
        );
      } else {
        toast.success(
          `Calculation complete! Processed ${stats.weeksProcessed} weeks with ${stats.apiCallsMade} API calls.`,
          { duration: 5000 }
        );
      }
      
    } catch (error) {
      console.error('WeeklyMileageTracker: Calculation failed', error);
      toast.error(`Calculation failed: ${error.message}`);
    } finally {
      setIsCalculating(false);
    }
  };

  const formatWeekRange = (weekStart, weekEnd) => {
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    const options = { month: 'short', day: 'numeric' };
    
    if (start.getFullYear() !== end.getFullYear()) {
      return `${start.toLocaleDateString('en-US', { ...options, year: 'numeric' })} - ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
    }
    
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const getWeekStatus = (week) => {
    if (week.isComplete) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Complete
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <XCircle className="w-3 h-3 mr-1" />
          Incomplete
        </Badge>
      );
    }
  };

  const calculateAverages = () => {
    const completeWeeks = weeklyData.filter(w => w.isComplete);
    if (completeWeeks.length === 0) return null;

    const totalDistance = completeWeeks.reduce((sum, w) => sum + w.totalDistance, 0);
    const totalTime = completeWeeks.reduce((sum, w) => sum + w.totalTime, 0);
    const totalRuns = completeWeeks.reduce((sum, w) => sum + w.runCount, 0);

    return {
      avgDistance: totalDistance / completeWeeks.length,
      avgTime: totalTime / completeWeeks.length,
      avgRuns: totalRuns / completeWeeks.length,
      totalWeeks: completeWeeks.length
    };
  };

  const averages = calculateAverages();

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Weekly Mileage Tracker</h2>
          <p className="text-muted-foreground">
            Track your weekly running distance with smart caching
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Units Toggle */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="units-toggle" className="text-sm font-medium">
              Metric
            </Label>
            <Switch
              id="units-toggle"
              checked={units === 'imperial'}
              onCheckedChange={(checked) => setUnits(checked ? 'imperial' : 'metric')}
            />
            <Label htmlFor="units-toggle" className="text-sm font-medium">
              Imperial
            </Label>
          </div>
          
          {/* Calculation Status */}
          {isCalculating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              Calculating...
            </div>
          )}
        </div>
      </div>

      {/* Database Stats */}
      {databaseStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-primary" />
                <div className="text-2xl font-bold">{databaseStats.totalWeeks}</div>
              </div>
              <div className="text-sm text-muted-foreground">Total Weeks</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div className="text-2xl font-bold">{databaseStats.completeWeeks}</div>
              </div>
              <div className="text-sm text-muted-foreground">Complete Weeks</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary" />
                <div className="text-2xl font-bold">{databaseStats.totalRuns}</div>
              </div>
              <div className="text-sm text-muted-foreground">Total Runs</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div className="text-2xl font-bold">
                  {formatDistance(databaseStats.averageWeeklyDistance, units)}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">Avg Weekly</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calculation Stats */}
      {calculationStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Last Calculation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">Weeks Processed</div>
                <div className="text-2xl font-bold text-primary">{calculationStats.weeksProcessed}</div>
              </div>
              <div>
                <div className="font-medium">API Calls</div>
                <div className="text-2xl font-bold text-orange-600">{calculationStats.apiCallsMade}</div>
              </div>
              <div>
                <div className="font-medium">Cache Hits</div>
                <div className="text-2xl font-bold text-green-600">{calculationStats.cacheHits}</div>
              </div>
              <div>
                <div className="font-medium">Status</div>
                <div className="text-sm">
                  {calculationStats.rateLimitReached ? (
                    <Badge variant="destructive">Rate Limited</Badge>
                  ) : (
                    <Badge variant="default">Complete</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Averages Display */}
      {averages && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Averages ({averages.totalWeeks} complete weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {formatDistance(averages.avgDistance, units)}
                </div>
                <div className="text-sm text-muted-foreground">Average Distance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {formatDuration(averages.avgTime)}
                </div>
                <div className="text-sm text-muted-foreground">Average Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {averages.avgRuns.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Average Runs</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Mileage History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading weekly data...</p>
            </div>
          ) : weeklyData.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No weekly data available yet</p>
              <p className="text-sm text-muted-foreground">Calculation will start automatically...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Week</th>
                    <th className="text-left py-2">Date Range</th>
                    <th className="text-right py-2">Distance</th>
                    <th className="text-right py-2">Time</th>
                    <th className="text-right py-2">Runs</th>
                    <th className="text-right py-2">Elevation</th>
                    <th className="text-center py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyData.map((week) => (
                    <tr key={week.weekId} className="border-b hover:bg-muted/50">
                      <td className="py-3 font-medium">{week.weekId}</td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {formatWeekRange(week.weekStart, week.weekEnd)}
                      </td>
                      <td className="py-3 text-right">
                        <span className="font-medium">
                          {formatDistance(week.totalDistance, units)}
                        </span>
                      </td>
                      <td className="py-3 text-right text-sm">
                        {formatDuration(week.totalTime)}
                      </td>
                      <td className="py-3 text-right">
                        <span className="font-medium">{week.runCount}</span>
                      </td>
                      <td className="py-3 text-right text-sm">
                        {units === 'metric' 
                          ? `${Math.round(week.totalElevation)}m`
                          : `${Math.round(week.totalElevation * 3.28084)}ft`
                        }
                      </td>
                      <td className="py-3 text-center">
                        {getWeekStatus(week)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}