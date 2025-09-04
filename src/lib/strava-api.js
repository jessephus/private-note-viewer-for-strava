const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID || '173282'; // Will be loaded from backend
const STRAVA_REDIRECT_URI = window.location.origin;
const STRAVA_SCOPE = 'read,activity:read';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

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

  /**
   * Test connection to backend server
   */
  async testBackendConnection() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Backend server returned ${response.status}: ${response.statusText}`);
      }

      const healthData = await response.json();
      console.log('StravaAPI.testBackendConnection: Backend connection successful', {
        status: healthData.status,
        hasStravaConfig: healthData.environment?.hasStravaClientId && healthData.environment?.hasStravaClientSecret,
        backendUrl: BACKEND_URL
      });

      return healthData;
    } catch (error) {
      console.error('StravaAPI.testBackendConnection: Backend connection failed', {
        error: error.message,
        errorType: error.constructor.name,
        backendUrl: BACKEND_URL,
        timestamp: new Date().toISOString()
      });
      
      // Provide user-friendly error messages
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`Cannot connect to backend server at ${BACKEND_URL}. Please ensure the server is running.`);
      }
      
      throw error;
    }
  }

  async exchangeCodeForToken(code) {
    console.log('StravaAPI.exchangeCodeForToken: Starting token exchange request', {
      hasCode: !!code,
      codeLength: code ? code.length : 0,
      backendUrl: BACKEND_URL,
      timestamp: new Date().toISOString()
    });
    
    try {
      // First test backend connection
      await this.testBackendConnection();
      
      // Call our backend to exchange the code for tokens
      const response = await fetch(`${BACKEND_URL}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ code })
      });

      console.log('StravaAPI.exchangeCodeForToken: Backend response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('StravaAPI.exchangeCodeForToken: Backend returned error', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          timestamp: new Date().toISOString()
        });
        throw new Error(errorData.error || 'Failed to exchange code for token');
      }

      const tokenData = await response.json();
      
      console.log('StravaAPI.exchangeCodeForToken: Token exchange successful', {
        hasAccessToken: !!tokenData.access_token,
        tokenType: tokenData.token_type,
        scopes: tokenData.scope,
        athleteId: tokenData.athlete?.id,
        expiresAt: tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toISOString() : 'unknown'
      });
      
      // Store the access token for future use
      this.setAccessToken(tokenData.access_token);
      
      return tokenData;
    } catch (error) {
      console.error('StravaAPI.exchangeCodeForToken: Token exchange failed', {
        error: error.message,
        errorType: error.constructor.name,
        hasCode: !!code,
        backendUrl: BACKEND_URL,
        timestamp: new Date().toISOString(),
        stack: error.stack
      });

      // Provide user-friendly error messages for common issues
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`Cannot connect to authentication server at ${BACKEND_URL}. Please ensure the server is running and try again.`);
      }
      
      if (error.message.includes('NetworkError') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        throw new Error(`Authentication server is unavailable. Please check your network connection and try again.`);
      }
      
      throw error;
    }
  }

  setAccessToken(token) {
    this.accessToken = token;
  }

  async makeAuthenticatedRequest(endpoint) {
    if (!this.accessToken) {
      console.error('StravaAPI.makeAuthenticatedRequest: No access token available', {
        endpoint,
        timestamp: new Date().toISOString()
      });
      throw new Error('No access token available');
    }

    console.log('StravaAPI.makeAuthenticatedRequest: Making authenticated request', {
      endpoint,
      hasToken: !!this.accessToken,
      tokenPrefix: this.accessToken.substring(0, 8) + '...',
      url: `https://www.strava.com/api/v3${endpoint}`
    });

    const response = await fetch(`https://www.strava.com/api/v3${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('StravaAPI.makeAuthenticatedRequest: Strava API response received', {
      endpoint,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: {
        'content-type': response.headers.get('content-type'),
        'x-ratelimit-limit': response.headers.get('x-ratelimit-limit'),
        'x-ratelimit-usage': response.headers.get('x-ratelimit-usage')
      }
    });

    if (!response.ok) {
      const errorMessage = `Strava API error: ${response.status} ${response.statusText}`;
      
      if (response.status === 401) {
        console.error('StravaAPI.makeAuthenticatedRequest: Authentication failed (401)', {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          tokenPrefix: this.accessToken.substring(0, 8) + '...',
          timestamp: new Date().toISOString()
        });
        throw new Error('Unauthorized - token may be expired');
      }
      
      console.error('StravaAPI.makeAuthenticatedRequest: API request failed', {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('StravaAPI.makeAuthenticatedRequest: Request successful', {
      endpoint,
      dataType: Array.isArray(data) ? 'array' : typeof data,
      arrayLength: Array.isArray(data) ? data.length : undefined
    });

    return data;
  }

  async getAthlete() {
    return this.makeAuthenticatedRequest('/athlete');
  }

  async getActivities(optionsOrPage = 1, perPage = 30, before = null, after = null) {
    // Handle both object and individual parameter formats
    let page, actualPerPage, actualBefore, actualAfter;
    
    if (typeof optionsOrPage === 'object' && optionsOrPage !== null) {
      // Object format: getActivities({ page: 1, per_page: 30, before: timestamp, after: timestamp })
      const options = optionsOrPage;
      page = options.page || 1;
      actualPerPage = options.per_page || 30;
      actualBefore = options.before;
      actualAfter = options.after;
    } else {
      // Individual parameter format: getActivities(page, perPage, before, after)
      page = optionsOrPage;
      actualPerPage = perPage;
      actualBefore = before;
      actualAfter = after;
    }
    
    let params = `page=${page}&per_page=${actualPerPage}`;
    
    if (actualBefore) {
      // If it's already a Unix timestamp, use it directly; otherwise convert
      const beforeTimestamp = typeof actualBefore === 'number' ? actualBefore : Math.floor(new Date(actualBefore).getTime() / 1000);
      params += `&before=${beforeTimestamp}`;
    }
    
    if (actualAfter) {
      // If it's already a Unix timestamp, use it directly; otherwise convert
      const afterTimestamp = typeof actualAfter === 'number' ? actualAfter : Math.floor(new Date(actualAfter).getTime() / 1000);
      params += `&after=${afterTimestamp}`;
    }
    
    console.log('StravaAPI.getActivities: Making request with params', {
      page,
      per_page: actualPerPage,
      before: actualBefore,
      after: actualAfter,
      paramsString: params,
      hasAccessToken: !!this.accessToken
    });
    
    return this.makeAuthenticatedRequest(
      `/athlete/activities?${params}`
    );
  }

  async getActivity(id) {
    return this.makeAuthenticatedRequest(`/activities/${id}`);
  }

  async getAthleteStats(id) {
    return this.makeAuthenticatedRequest(`/athletes/${id}/stats`);
  }
}

export const formatDistance = (distance, units = 'metric') => {
  if (units === 'imperial') {
    const miles = (distance / 1000) * 0.621371;
    return `${miles.toFixed(1)} mi`;
  }
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

export const formatPace = (distance, time, units = 'metric') => {
  if (distance === 0) return '--';
  
  if (units === 'imperial') {
    const miles = distance / 1000 * 0.621371;
    const pace = time / miles; // seconds per mile
    const minutes = Math.floor(pace / 60);
    const seconds = Math.floor(pace % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/mi`;
  }
  
  const pace = time / (distance / 1000); // seconds per km
  const minutes = Math.floor(pace / 60);
  const seconds = Math.floor(pace % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
};

export const formatSpeed = (speed, units = 'metric') => {
  if (units === 'imperial') {
    const mph = (speed * 3.6) * 0.621371; // Convert m/s to km/h then to mph
    return `${mph.toFixed(1)} mph`;
  }
  return `${(speed * 3.6).toFixed(1)} km/h`;
};

export const formatElevation = (elevation, units = 'metric') => {
  if (units === 'imperial') {
    const feet = elevation * 3.28084;
    return `${Math.round(feet)}ft`;
  }
  return `${Math.round(elevation)}m`;
};
