import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { AuthLanding } from '@/components/AuthLanding';
import { Dashboard } from '@/components/Dashboard';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { StravaAPI } from '@/lib/strava-api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useLocalStorage('strava-authenticated', false);
  const [accessToken, setAccessToken] = useLocalStorage('strava-access-token', null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
      handleTokenExchange(code);
    } else {
      // If we have a stored token, validate it
      validateStoredToken();
    }
  }, []);

  const validateStoredToken = async () => {
    if (!accessToken) {
      console.log('validateStoredToken: No access token found, skipping validation');
      setIsLoading(false);
      return;
    }

    console.log('validateStoredToken: Starting token validation with stored token');
    
    try {
      // Try to make a simple API call to validate the token
      const stravaAPI = new StravaAPI(accessToken);
      const athlete = await stravaAPI.getAthlete();
      // Token is valid, keep authentication state
      console.log('validateStoredToken: Token validation successful', {
        athleteId: athlete?.id,
        username: athlete?.username
      });
      setIsLoading(false);
    } catch (error) {
      console.error('validateStoredToken: Token validation failed', {
        error: error.message,
        errorType: error.constructor.name,
        hasToken: !!accessToken,
        tokenPrefix: accessToken ? accessToken.substring(0, 8) + '...' : 'none',
        timestamp: new Date().toISOString()
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
      timestamp: new Date().toISOString()
    });
    
    try {
      const stravaAPI = new StravaAPI();
      const tokenData = await stravaAPI.exchangeCodeForToken(code);
      
      console.log('handleTokenExchange: Token exchange successful', {
        hasAccessToken: !!tokenData.access_token,
        tokenType: tokenData.token_type,
        scopes: tokenData.scope,
        athleteId: tokenData.athlete?.id,
        expiresAt: tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toISOString() : 'unknown'
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
        stack: error.stack
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

  const handleLogout = () => {
    console.log('handleLogout: User logout initiated', {
      wasAuthenticated: isAuthenticated,
      hadToken: !!accessToken,
      timestamp: new Date().toISOString()
    });
    
    setIsAuthenticated(false);
    setAccessToken(null);
    // Clear any stored data
    localStorage.clear();
    
    console.log('handleLogout: Authentication state cleared');
    toast.success('Successfully logged out');
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
        <Dashboard onLogout={handleLogout} accessToken={accessToken} />
      ) : (
        <AuthLanding onAuthSuccess={handleAuthSuccess} />
      )}
      <Toaster />
    </>
  );
}

export default App;