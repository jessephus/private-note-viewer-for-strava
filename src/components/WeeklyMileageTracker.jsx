import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Calendar, TrendingUp } from 'lucide-react';

export function WeeklyMileageTracker() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Coming Soon Banner */}
      <div className="text-center py-8">
        <div className="flex justify-center mb-4">
          <div className="bg-muted rounded-full p-6">
            <BarChart3 className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Weekly Mileage Tracker</h2>
        <p className="text-muted-foreground mb-4">
          Track your weekly mileage progress and set goals for your training
        </p>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          Coming Soon
        </Badge>
      </div>

      {/* Feature Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Weekly Goals</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set and track weekly mileage goals for different activity types
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Progress Tracking</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Visualize your weekly progress with charts and trends
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Historical Data</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Compare current week with previous weeks and months
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder Chart Area */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>Mileage Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded-md flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Weekly mileage chart will appear here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}