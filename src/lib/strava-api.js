const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID || '173282'; // Will be loaded from backend
const STRAVA_REDIRECT_URI = window.location.origin;
const STRAVA_SCOPE = 'read,activity:read';
const BACKEND_URL = 'http://localhost:3001';

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
    try {
      // Call our backend to exchange the code for tokens
      const response = await fetch(`${BACKEND_URL}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to exchange code for token');
      }

      const tokenData = await response.json();
      
      // Store the access token for future use
      this.setAccessToken(tokenData.access_token);
      
      return tokenData;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
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
