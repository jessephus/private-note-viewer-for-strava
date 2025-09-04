import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CalendarDays, 
  TrendingUp, 
  Activity, 
  Timer, 
  Mountain,
  Play,
  Pause,
  RefreshCw,
  Database,
  CheckCircle,
  XCircle,
  BarChart3,
  LineChart
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
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

  // Chart configuration state
  const [chartTimeRange, setChartTimeRange] = useState('6months'); // 6months, 1year, 2years
  const [chartMetric, setChartMetric] = useState('distance'); // distance, elevation, time
  const [chartType, setChartType] = useState('line'); // line, bar
  const [rollingAverage1, setRollingAverage1] = useState(4); // weeks, 0 for disabled
  const [rollingAverage2, setRollingAverage2] = useState(12); // weeks, 0 for disabled
  const [showRollingAvg1, setShowRollingAvg1] = useState(true);
  const [showRollingAvg2, setShowRollingAvg2] = useState(false);

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

  // Chart data processing functions
  const getTimeRangeWeeks = () => {
    const now = new Date();
    const weeksBack = {
      '6months': 26,
      '1year': 52,
      '2years': 104
    }[chartTimeRange];
    
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - (weeksBack * 7));
    
    return weeklyData
      .filter(week => new Date(week.weekStart) >= cutoffDate)
      .sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
  };

  const groupWeeksBy4WeekPeriods = (weeks) => {
    const periods = [];
    const sortedWeeks = [...weeks].sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
    
    for (let i = 0; i < sortedWeeks.length; i += 4) {
      const periodWeeks = sortedWeeks.slice(i, i + 4);
      if (periodWeeks.length === 0) continue;
      
      const firstWeek = periodWeeks[0];
      const lastWeek = periodWeeks[periodWeeks.length - 1];
      
      // Calculate totals for the period
      const totalDistance = periodWeeks.reduce((sum, w) => sum + w.totalDistance, 0);
      const totalTime = periodWeeks.reduce((sum, w) => sum + w.totalTime, 0);
      const totalElevation = periodWeeks.reduce((sum, w) => sum + w.totalElevation, 0);
      
      // Create period label (month/year of the middle of the period)
      const midDate = new Date(firstWeek.weekStart);
      midDate.setDate(midDate.getDate() + 14); // roughly middle of 4-week period
      const periodLabel = midDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      periods.push({
        period: periodLabel,
        distance: units === 'metric' ? totalDistance / 1000 : totalDistance / 1609.34, // km or miles
        time: totalTime / 3600, // hours
        elevation: units === 'metric' ? totalElevation : totalElevation * 3.28084, // m or ft
        weekStart: firstWeek.weekStart,
        weekEnd: lastWeek.weekEnd,
        weekCount: periodWeeks.length
      });
    }
    
    return periods;
  };

  const calculateRollingAverage = (data, windowSize, metric) => {
    if (windowSize === 0 || !data.length) return data;
    
    return data.map((point, index) => {
      const start = Math.max(0, index - windowSize + 1);
      const window = data.slice(start, index + 1);
      const average = window.reduce((sum, p) => sum + p[metric], 0) / window.length;
      
      return {
        ...point,
        [`${metric}_avg_${windowSize}w`]: average
      };
    });
  };

  const getMetricLabel = () => {
    switch (chartMetric) {
      case 'distance':
        return units === 'metric' ? 'Distance (km)' : 'Distance (mi)';
      case 'time':
        return 'Time (hours)';
      case 'elevation':
        return units === 'metric' ? 'Elevation (m)' : 'Elevation (ft)';
      default:
        return 'Value';
    }
  };

  const chartData = useMemo(() => {
    const filteredWeeks = getTimeRangeWeeks();
    const groupedData = groupWeeksBy4WeekPeriods(filteredWeeks);
    
    let processedData = [...groupedData];
    
    // Add rolling averages
    if (showRollingAvg1 && rollingAverage1 > 0) {
      processedData = calculateRollingAverage(processedData, rollingAverage1, chartMetric);
    }
    if (showRollingAvg2 && rollingAverage2 > 0) {
      processedData = calculateRollingAverage(processedData, rollingAverage2, chartMetric);
    }
    
    return processedData;
  }, [weeklyData, chartTimeRange, chartMetric, showRollingAvg1, showRollingAvg2, rollingAverage1, rollingAverage2, units]);

  const averages = calculateAverages();

  return (
    <div className="container mx-auto p-4">
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

        {/* Second Row: Averages and Graph Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Averages Display */}
          {averages && (
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Weekly Averages</CardTitle>
                <div className="text-sm text-muted-foreground">{averages.totalWeeks} complete weeks</div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <div className="text-left">
                    <div className="text-2xl font-bold text-primary">
                      {formatDistance(averages.avgDistance, units)}
                    </div>
                    <div className="text-sm text-muted-foreground">Average Distance</div>
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold text-primary">
                      {formatDuration(averages.avgTime)}
                    </div>
                    <div className="text-sm text-muted-foreground">Average Time</div>
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold text-primary">
                      {averages.avgRuns.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">Average Runs</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interactive Chart */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Weekly Progress Chart
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {/* Chart Controls Sidebar */}
                <div className="flex-shrink-0 w-48 space-y-4">
                  {/* Time Range */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Time Range</Label>
                    <Select value={chartTimeRange} onValueChange={setChartTimeRange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6months">6 Months</SelectItem>
                        <SelectItem value="1year">1 Year</SelectItem>
                        <SelectItem value="2years">2 Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Metric */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Metric</Label>
                    <Select value={chartMetric} onValueChange={setChartMetric}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="distance">Distance</SelectItem>
                        <SelectItem value="time">Time</SelectItem>
                        <SelectItem value="elevation">Elevation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Chart Type */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Chart Type</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={chartType === 'line' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setChartType('line')}
                      >
                        <LineChart className="h-4 w-4 mr-1" />
                        Line
                      </Button>
                      <Button
                        variant={chartType === 'bar' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setChartType('bar')}
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Bar
                      </Button>
                    </div>
                  </div>

                  {/* Rolling Averages */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Rolling Averages</Label>
                    
                    {/* First Rolling Average */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={showRollingAvg1}
                          onCheckedChange={setShowRollingAvg1}
                        />
                        <Label className="text-sm">Short WMA</Label>
                      </div>
                      {showRollingAvg1 && (
                        <Select 
                          value={rollingAverage1.toString()} 
                          onValueChange={(v) => setRollingAverage1(parseInt(v))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 week</SelectItem>
                            <SelectItem value="3">3 week</SelectItem>
                            <SelectItem value="4">4 week</SelectItem>
                            <SelectItem value="6">6 week</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Second Rolling Average */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={showRollingAvg2}
                          onCheckedChange={setShowRollingAvg2}
                        />
                        <Label className="text-sm">Long WMA</Label>
                      </div>
                      {showRollingAvg2 && (
                        <Select 
                          value={rollingAverage2.toString()} 
                          onValueChange={(v) => setRollingAverage2(parseInt(v))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="8">8 week</SelectItem>
                            <SelectItem value="12">12 week</SelectItem>
                            <SelectItem value="16">16 week</SelectItem>
                            <SelectItem value="20">20 week</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chart Area */}
                <div className="flex-1 min-h-[400px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="period" 
                          fontSize={12}
                        />
                        <YAxis 
                          fontSize={12}
                          label={{ value: getMetricLabel(), angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          formatter={(value, name) => [
                            typeof value === 'number' ? value.toFixed(2) : value,
                            name
                          ]}
                          labelFormatter={(label) => `Period: ${label}`}
                        />
                        <Legend />
                        
                        {/* Main data */}
                        {chartType === 'line' ? (
                          <Line
                            type="monotone"
                            dataKey={chartMetric}
                            stroke="#8884d8"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            name={getMetricLabel()}
                          />
                        ) : (
                          <Bar
                            dataKey={chartMetric}
                            fill="#8884d8"
                            name={getMetricLabel()}
                          />
                        )}
                        
                        {/* Rolling averages */}
                        {showRollingAvg1 && (
                          <Line
                            type="monotone"
                            dataKey={`${chartMetric}_avg_${rollingAverage1}w`}
                            stroke="#82ca9d"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 2 }}
                            name={`${rollingAverage1}-period avg`}
                          />
                        )}
                        
                        {showRollingAvg2 && (
                          <Line
                            type="monotone"
                            dataKey={`${chartMetric}_avg_${rollingAverage2}w`}
                            stroke="#ffc658"
                            strokeWidth={2}
                            strokeDasharray="3 3"
                            dot={{ r: 2 }}
                            name={`${rollingAverage2}-period avg`}
                          />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20">
                      <div className="text-center text-muted-foreground">
                        <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No data available for chart</p>
                        <p className="text-xs">Complete some weeks to see progress</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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

        {/* Last Calculation Results - Moved to Bottom */}
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
      </div>
    </div>
  );
}