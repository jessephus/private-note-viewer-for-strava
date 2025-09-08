import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistance, formatDuration, formatElevation, formatPace } from '@/lib/strava-api';
import { format } from 'date-fns';

export function ActivityTable({ activities, onClick, units = 'metric' }) {
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
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No activities found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Type</TableHead>
            <TableHead className="min-w-[200px]">Activity</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Distance</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Pace</TableHead>
            <TableHead>Elevation</TableHead>
            <TableHead className="min-w-[250px]">Private Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity) => (
            <TableRow
              key={activity.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onClick && onClick(activity)}
            >
              <TableCell>
                <span className="text-lg">{getActivityIcon(activity.type)}</span>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium text-sm leading-tight">{activity.name}</div>
                  <Badge className={`text-xs ${getActivityTypeColor(activity.type)}`} variant="outline">
                    {activity.sport_type || activity.type}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-sm">{format(new Date(activity.start_date), 'MMM dd, yyyy')}</TableCell>
              <TableCell className="text-sm font-medium text-primary">
                {formatDistance(activity.distance, units)}
              </TableCell>
              <TableCell className="text-sm font-medium">{formatDuration(activity.moving_time)}</TableCell>
              <TableCell className="text-sm font-medium">
                {formatPace(activity.distance, activity.moving_time, units)}
              </TableCell>
              <TableCell className="text-sm font-medium text-success">
                {formatElevation(activity.total_elevation_gain, units)}
              </TableCell>
              <TableCell>
                <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs dark:bg-blue-950/30 dark:border-blue-800/50">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-blue-600 dark:text-blue-400">📝</span>
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Notes</span>
                  </div>
                  <p className="text-blue-900 dark:text-blue-100 leading-tight">
                    {truncateText(activity.private_note, 60)}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
