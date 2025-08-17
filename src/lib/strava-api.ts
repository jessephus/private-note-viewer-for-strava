import { StravaActivity, StravaAthlete, StravaAuthToken, StravaStats } from './strava-types';

const STRAVA_CLIENT_ID = '138637'; // Demo client ID - in production this would be configurable
const STRAVA_REDIRECT_URI = window.location.origin;
const STRAVA_SCOPE = 'read,activity:read';

export class StravaAPI {
  private accessToken: string | null = null;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || null;
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      redirect_uri: STRAVA_REDIRECT_URI,
      response_type: 'code',
      scope: STRAVA_SCOPE,
      state: 'strava_auth'
    });
    
    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<StravaAuthToken> {
    // In a real app, this would go through your backend
    // For demo purposes, we'll simulate the token exchange
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: 'your_client_secret', // This should be on your backend
        code,
        grant_type: 'authorization_code'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    return response.json();
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async makeAuthenticatedRequest<T>(endpoint: string): Promise<T> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(`https://www.strava.com/api/v3${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized - token may be expired');
      }
      throw new Error(`Strava API error: ${response.status}`);
    }

    return response.json();
  }

  async getAthlete(): Promise<StravaAthlete> {
    return this.makeAuthenticatedRequest<StravaAthlete>('/athlete');
  }

  async getActivities(page = 1, perPage = 30): Promise<StravaActivity[]> {
    return this.makeAuthenticatedRequest<StravaActivity[]>(
      `/athlete/activities?page=${page}&per_page=${perPage}`
    );
  }

  async getActivity(id: number): Promise<StravaActivity> {
    return this.makeAuthenticatedRequest<StravaActivity>(`/activities/${id}`);
  }

  async getAthleteStats(id: number): Promise<StravaStats> {
    return this.makeAuthenticatedRequest<StravaStats>(`/athletes/${id}/stats`);
  }
}

export const formatDistance = (distance: number): string => {
  const km = distance / 1000;
  return `${km.toFixed(1)} km`;
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const formatPace = (distance: number, time: number): string => {
  if (distance === 0) return '--';
  const pace = time / (distance / 1000); // seconds per km
  const minutes = Math.floor(pace / 60);
  const seconds = Math.floor(pace % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
};

export const formatSpeed = (speed: number): string => {
  return `${(speed * 3.6).toFixed(1)} km/h`;
};

export const formatElevation = (elevation: number): string => {
  return `${Math.round(elevation)}m`;
};