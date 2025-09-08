import { AuthLanding } from '@/components/AuthLanding';
import { MainLayout } from '@/components/MainLayout';
import { PrivateNotesViewer } from '@/components/PrivateNotesViewer';
import { WeeklyMileageTracker } from '@/components/WeeklyMileageTracker';
import { Toaster } from '@/components/ui/sonner';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { SmartActivityCache } from '@/lib/smart-activity-cache';
import { StravaAPI } from '@/lib/strava-api';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useLocalStorage('strava-authenticated', false);
  const [accessToken, setAccessToken] = useLocalStorage('strava-access-token', null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentModule, setCurrentModule] = useState('private-notes');
  const [smartCache, setSmartCache] = useState(null);
  const [apiStatus, setApiStatus] = useState('available');
  const [apiStatusDetails, setApiStatusDetails] = useState(null);
  const [lastApiActivity, setLastApiActivity] = useState(null);

  // Debug: Log initial state
  console.log('App: Initial state', {
    isAuthenticated,
    hasAccessToken: !!accessToken,
    accessTokenPrefix: accessToken ? accessToken.substring(0, 8) + '...' : 'none',
    localStorageToken: localStorage.getItem('strava-access-token'),
    localStorageAuth: localStorage.getItem('strava-authenticated'),
    currentModule,
    timestamp: new Date().toISOString(),
  });

  // Function to update API status from actual API calls
  const updateApiStatus = (success, error = null) => {
    const now = Date.now();
    setLastApiActivity(now);

    if (success) {
      setApiStatus('available');
      setApiStatusDetails(null);
    } else if (error) {
      if (error.status === 429 || error.message.includes('rate') || error.message.includes('429')) {
        setApiStatus('rate-limited');
        setApiStatusDetails({
          type: 'rate-limited',
          message: 'API rate limit exceeded',
          statusCode: error.status,
          details: error.message,
        });
      } else {
        setApiStatus('error');
        setApiStatusDetails({
          type: 'error',
          message: error.message || 'Unknown API error',
          statusCode: error.status || 'Unknown',
          details: `${error.status ? `HTTP ${error.status}: ` : ''}${error.message || 'Unknown error occurred'}`,
        });
      }
    }
  };

  // Initialize smart cache when access token is available
  useEffect(() => {
    if (accessToken && !smartCache) {
      console.log('App: Initializing shared smart cache');
      const initializeSmartCache = async () => {
        try {
          const cache = new SmartActivityCache(accessToken, updateApiStatus);
          await cache.database.initPromise;
          setSmartCache(cache);
          console.log('App: Shared smart cache initialized');
        } catch (error) {
          console.error('App: Failed to initialize shared smart cache', error);
        }
      };
      initializeSmartCache();
    } else if (!accessToken && smartCache) {
      console.log('App: Clearing shared smart cache');
      setSmartCache(null);
    }
  }, [accessToken, smartCache, updateApiStatus]);

  useEffect(() => {
    const handleAuthFlow = async () => {
      // Check for OAuth callback
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      if (error) {
        toast.error('Authentication failed: ' + error);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsLoading(false);
        return;
      }

      if (code && state === 'strava_auth') {
        // Exchange code for tokens using backend
        await handleTokenExchange(code);
      } else {
        // If we have a stored token, validate it
        await validateStoredToken();
      }
    };

    // Small delay to ensure localStorage hooks have initialized
    setTimeout(handleAuthFlow, 100);
  }, []); // Keep empty dependency array but use async function inside

  const validateStoredToken = async () => {
    // Get the current token from localStorage, not from closure
    const currentToken = localStorage.getItem('strava-access-token');
    const parsedToken = currentToken ? JSON.parse(currentToken) : null;

    if (!parsedToken) {
      console.log('validateStoredToken: No access token found, skipping validation');

      // Test backend connectivity on startup for early warning
      try {
        const stravaAPI = new StravaAPI();
        await stravaAPI.testBackendConnection();
        console.log('validateStoredToken: Backend connectivity check passed');
      } catch (error) {
        console.warn('validateStoredToken: Backend connectivity check failed', {
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        // Don't show error on startup, just log it for debugging
        // Users will see the error when they try to authenticate
      }

      setIsLoading(false);
      return;
    }

    console.log('validateStoredToken: Starting token validation with stored token');

    try {
      // Try to make a simple API call to validate the token
      const stravaAPI = new StravaAPI(parsedToken);
      const athlete = await stravaAPI.getAthlete();
      // Token is valid, keep authentication state
      console.log('validateStoredToken: Token validation successful', {
        athleteId: athlete?.id,
        username: athlete?.username,
      });
      setIsLoading(false);
    } catch (error) {
      console.error('validateStoredToken: Token validation failed', {
        error: error.message,
        errorType: error.constructor.name,
        hasToken: !!parsedToken,
        tokenPrefix: parsedToken ? parsedToken.substring(0, 8) + '...' : 'none',
        timestamp: new Date().toISOString(),
      });

      // Token is invalid, clear authentication state
      console.log('validateStoredToken: Clearing invalid authentication state');
      setIsAuthenticated(false);
      setAccessToken(null);
      toast.error('Your Strava session has expired. Please sign in again.');
      setIsLoading(false);
    }
  };

  const handleTokenExchange = async (code) => {
    console.log('handleTokenExchange: Starting OAuth token exchange', {
      codeLength: code ? code.length : 0,
      hasCode: !!code,
      timestamp: new Date().toISOString(),
    });

    try {
      const stravaAPI = new StravaAPI();
      const tokenData = await stravaAPI.exchangeCodeForToken(code);

      console.log('handleTokenExchange: Token exchange successful', {
        hasAccessToken: !!tokenData.access_token,
        tokenType: tokenData.token_type,
        scopes: tokenData.scope,
        athleteId: tokenData.athlete?.id,
        expiresAt: tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toISOString() : 'unknown',
      });

      // Store token and mark as authenticated
      setAccessToken(tokenData.access_token);
      setIsAuthenticated(true);

      toast.success('Successfully connected to Strava!');

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('handleTokenExchange: Authentication failed', {
        error: error.message,
        errorType: error.constructor.name,
        hasCode: !!code,
        codeLength: code ? code.length : 0,
        timestamp: new Date().toISOString(),
        stack: error.stack,
      });
      toast.error('Authentication failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    toast.success('Welcome to Strava Connect!');
  };

  // Monitor API status with intelligent frequency
  useEffect(() => {
    if (!accessToken) return;

    const checkApiStatus = async () => {
      const now = Date.now();
      const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds

      // Only make a test call if it's been more than 15 minutes since last API activity
      if (lastApiActivity && now - lastApiActivity < fifteenMinutes) {
        console.log('API status check: Skipping test call, recent activity detected', {
          timeSinceLastActivity: Math.round((now - lastApiActivity) / 1000 / 60),
          minutesUntilNextCheck: Math.round((fifteenMinutes - (now - lastApiActivity)) / 1000 / 60),
        });
        return;
      }

      console.log('API status check: Making test call to verify API status');
      try {
        const api = new StravaAPI(accessToken);
        // Try a lightweight API call to check status
        await api.getAthlete();
        updateApiStatus(true);
      } catch (error) {
        console.error('API status check failed:', error);
        updateApiStatus(false, error);
      }
    };

    // Check status immediately and then every 5 minutes (but actual calls limited by 15-minute rule)
    checkApiStatus();
    const interval = setInterval(checkApiStatus, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [accessToken, lastApiActivity]);

  const handleLogout = () => {
    console.log('handleLogout: User logout initiated', {
      wasAuthenticated: isAuthenticated,
      hadToken: !!accessToken,
      timestamp: new Date().toISOString(),
    });

    setIsAuthenticated(false);
    setAccessToken(null);
    // Clear any stored data
    localStorage.clear();

    console.log('handleLogout: Authentication state cleared');
    toast.success('Successfully logged out');
  };

  const renderCurrentModule = () => {
    switch (currentModule) {
      case 'private-notes':
        return (
          <PrivateNotesViewer accessToken={accessToken} smartCache={smartCache} updateApiStatus={updateApiStatus} />
        );
      case 'weekly-mileage':
        return (
          <WeeklyMileageTracker accessToken={accessToken} smartCache={smartCache} updateApiStatus={updateApiStatus} />
        );
      default:
        return (
          <PrivateNotesViewer accessToken={accessToken} smartCache={smartCache} updateApiStatus={updateApiStatus} />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? (
        <MainLayout
          onLogout={handleLogout}
          currentModule={currentModule}
          onModuleChange={setCurrentModule}
          apiStatus={apiStatus}
          apiStatusDetails={apiStatusDetails}
        >
          {renderCurrentModule()}
        </MainLayout>
      ) : (
        <AuthLanding onAuthSuccess={handleAuthSuccess} />
      )}
      <Toaster />
    </>
  );
}

export default App;
