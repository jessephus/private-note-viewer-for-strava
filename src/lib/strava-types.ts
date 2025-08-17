export interface StravaAthlete {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  profile_medium: string;
  profile: string;
  city: string;
  state: string;
  country: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  elev_high?: number;
  elev_low?: number;
  map?: {
    summary_polyline: string;
    resource_state: number;
  };
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  photo_count: number;
  trainer: boolean;
  commute: boolean;
}

export interface StravaAuthToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
}

export interface StravaStats {
  recent_run_totals: ActivityTotal;
  recent_ride_totals: ActivityTotal;
  ytd_run_totals: ActivityTotal;
  ytd_ride_totals: ActivityTotal;
  all_run_totals: ActivityTotal;
  all_ride_totals: ActivityTotal;
}

interface ActivityTotal {
  count: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  elevation_gain: number;
  achievement_count: number;
}