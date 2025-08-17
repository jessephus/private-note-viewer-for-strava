import { useState, useEffect } from 'react';
import { useKV } from '@github/spark/hooks';
import { AuthLanding } from '@/components/AuthLanding';
import { Dashboard } from '@/components/Dashboard';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useKV('strava-authenticated', false);
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
      // In a real app, you would exchange the code for tokens here
      // For demo purposes, we'll just mark as authenticated
      setIsAuthenticated(true);
      toast.success('Successfully connected to Strava!');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    setIsLoading(false);
  }, [setIsAuthenticated]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    toast.success('Welcome to Strava Connect!');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    // Clear any stored data
    localStorage.clear(); // For demo purposes
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
        <Dashboard onLogout={handleLogout} />
      ) : (
        <AuthLanding onAuthSuccess={handleAuthSuccess} />
      )}
      <Toaster />
    </>
  );
}

export default App;