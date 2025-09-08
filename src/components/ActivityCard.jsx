import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistance, formatDuration, formatElevation, formatPace } from '@/lib/strava-api';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, TrendingUp } from 'lucide-react';

export function ActivityCard({ activity, onClick, units = 'metric' }) {
  const getActivityIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'run':
      case 'virtualrun':
        return '🏃‍♂️';
      case 'ride':
      case 'virtualride':
        return '🚴‍♂️';
      case 'swim':
        return '🏊‍♂️';
      case 'walk':
      case 'hike':
        return '🚶‍♂️';
      default:
        return '⚡';
    }
  };

  const getActivityTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'run':
      case 'virtualrun':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'ride':
      case 'virtualride':
        return 'bg-accent/10 text-accent border-accent/20';
      case 'swim':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card
      className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] border-2 hover:border-primary/20"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getActivityIcon(activity.type)}</span>
            <div>
              <CardTitle className="text-lg font-semibold line-clamp-1">{activity.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {format(new Date(activity.start_date), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          </div>
          <Badge className={getActivityTypeColor(activity.type)}>{activity.sport_type || activity.type}</Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">Distance</span>
            </div>
            <span className="text-lg font-bold text-primary">{formatDistance(activity.distance, units)}</span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Time</span>
            </div>
            <span className="text-lg font-bold">{formatDuration(activity.moving_time)}</span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Pace</span>
            </div>
            <span className="text-lg font-bold text-accent">
              {formatPace(activity.distance, activity.moving_time, units)}
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <span className="text-sm">⛰️ Elevation</span>
            </div>
            <span className="text-lg font-bold text-success">
              {formatElevation(activity.total_elevation_gain, units)}
            </span>
          </div>
        </div>

        {/* Private Notes Preview */}
        <div className="mt-4 pt-3 border-t">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 dark:bg-blue-950/30 dark:border-blue-800/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-blue-600 dark:text-blue-400">📝</span>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Private Notes</span>
            </div>
            <p className="text-xs text-blue-900 dark:text-blue-100 line-clamp-2">
              {activity.private_note
                ? activity.private_note.length > 80
                  ? `${activity.private_note.substring(0, 80)}...`
                  : activity.private_note
                : 'N/A'}
            </p>
          </div>
        </div>

        {activity.achievement_count > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
            <span className="text-sm text-muted-foreground">Achievements:</span>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
              🏆 {activity.achievement_count}
            </Badge>
            {activity.kudos_count > 0 && (
              <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                ❤️ {activity.kudos_count}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
