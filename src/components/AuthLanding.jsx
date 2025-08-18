import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, Users, Zap, Loader2 } from 'lucide-react';
import { StravaAPI } from '@/lib/strava-api';
import { toast } from 'sonner';

export function AuthLanding({ onAuthSuccess }) {
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  const handleStravaAuth = async () => {
    setIsCheckingConnection(true);
    
    try {
      const stravaAPI = new StravaAPI();
      
      // Test backend connection first
      await stravaAPI.testBackendConnection();
      
      // If connection is successful, redirect to Strava
      window.location.href = stravaAPI.getAuthUrl();
    } catch (error) {
      console.error('Failed to connect to backend before OAuth:', error);
      toast.error('Connection Error: ' + error.message);
      setIsCheckingConnection(false);
    }
  };

  const handleDemoMode = () => {
    // For demo purposes, simulate successful auth
    onAuthSuccess();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Activity className="h-16 w-16 text-primary mr-4" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Strava Connect
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your athletic data into powerful insights. Connect with Strava to visualize your performance and track your progress.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="border-2 hover:border-primary/20 transition-colors">
            <CardHeader className="text-center">
              <TrendingUp className="h-12 w-12 text-accent mx-auto mb-4" />
              <CardTitle>Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Visualize your training trends, pace improvements, and performance metrics over time
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/20 transition-colors">
            <CardHeader className="text-center">
              <Activity className="h-12 w-12 text-success mx-auto mb-4" />
              <CardTitle>Activity Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                View your recent activities with detailed metrics, routes, and achievements in one place
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/20 transition-colors">
            <CardHeader className="text-center">
              <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Real-time Sync</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Seamless integration with Strava ensures your latest activities are always up to date
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            onClick={handleStravaAuth}
            className="bg-[#FC4C02] hover:bg-[#E8440A] text-white px-8 py-3 text-lg font-semibold"
            size="lg"
            disabled={isCheckingConnection}
          >
            {isCheckingConnection ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Activity className="mr-2 h-5 w-5" />
                Connect with Strava
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleDemoMode}
            size="lg"
            className="px-8 py-3 text-lg"
            disabled={isCheckingConnection}
          >
            Try Demo Mode
          </Button>
        </div>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Secure OAuth 2.0 authentication • Read-only access to your activities</p>
        </div>
      </div>
    </div>
  );
}