const STRAVA_CLIENT_ID = '173282'; // Demo client ID - in production this would be configurable
const STRAVA_REDIRECT_URI = window.location.origin;
const STRAVA_SCOPE = 'read,activity:read';

export class StravaAPI {
  constructor(accessToken) {
    this.accessToken = accessToken || null;
  }

  getAuthUrl() {
    const params = new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      redirect_uri: STRAVA_REDIRECT_URI,
      response_type: 'code',
      scope: STRAVA_SCOPE,
      state: 'strava_auth'
    });
    
    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code) {
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

  setAccessToken(token) {
    this.accessToken = token;
  }

  async makeAuthenticatedRequest(endpoint) {
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

  async getAthlete() {
    return this.makeAuthenticatedRequest('/athlete');
  }

  async getActivities(page = 1, perPage = 30) {
    return this.makeAuthenticatedRequest(
      `/athlete/activities?page=${page}&per_page=${perPage}`
    );
  }

  async getActivity(id) {
    return this.makeAuthenticatedRequest(`/activities/${id}`);
  }

  async getAthleteStats(id) {
    return this.makeAuthenticatedRequest(`/athletes/${id}/stats`);
  }
}

export const formatDistance = (distance) => {
  const km = distance / 1000;
  return `${km.toFixed(1)} km`;
};

export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const formatPace = (distance, time) => {
  if (distance === 0) return '--';
  const pace = time / (distance / 1000); // seconds per km
  const minutes = Math.floor(pace / 60);
  const seconds = Math.floor(pace % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
};

export const formatSpeed = (speed) => {
  return `${(speed * 3.6).toFixed(1)} km/h`;
};

export const formatElevation = (elevation) => {
  return `${Math.round(elevation)}m`;
};
