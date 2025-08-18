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
      setIsLoading(false);
      return;
    }

    try {
      // Try to make a simple API call to validate the token
      const stravaAPI = new StravaAPI(accessToken);
      await stravaAPI.getAthlete();
      // Token is valid, keep authentication state
      setIsLoading(false);
    } catch (error) {
      console.error('Token validation failed:', error);
      // Token is invalid, clear authentication state
      setIsAuthenticated(false);
      setAccessToken(null);
      toast.error('Your Strava session has expired. Please sign in again.');
      setIsLoading(false);
    }
  };

  const handleTokenExchange = async (code) => {
    try {
      const stravaAPI = new StravaAPI();
      const tokenData = await stravaAPI.exchangeCodeForToken(code);
      
      // Store token and mark as authenticated
      setAccessToken(tokenData.access_token);
      setIsAuthenticated(true);
      
      toast.success('Successfully connected to Strava!');
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('Authentication error:', error);
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
    setIsAuthenticated(false);
    setAccessToken(null);
    // Clear any stored data
    localStorage.clear();
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