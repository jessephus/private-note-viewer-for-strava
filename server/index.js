import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5174', // Add additional port
    ],
    credentials: true,
  }),
);
app.use(express.json());

// Environment validation
const requiredEnvVars = ['STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`Warning: ${envVar} environment variable is not set`);
  }
}

// OAuth token exchange endpoint
app.post('/api/oauth/token', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
      return res.status(500).json({
        error: 'Server configuration error: Strava credentials not configured',
      });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Strava token exchange failed:', tokenData);
      return res.status(400).json({
        error: 'Failed to exchange authorization code',
        details: tokenData.message || 'Unknown error',
      });
    }

    // Return the token data to the frontend
    res.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
      athlete: tokenData.athlete,
    });
  } catch (error) {
    console.error('OAuth token exchange error:', error);
    res.status(500).json({
      error: 'Internal server error during token exchange',
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      hasStravaClientId: !!process.env.STRAVA_CLIENT_ID,
      hasStravaClientSecret: !!process.env.STRAVA_CLIENT_SECRET,
    },
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`🌍 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'} and http://localhost:5174`);

  if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
    console.log('⚠️  To use Strava OAuth, create a .env file with:');
    console.log('   STRAVA_CLIENT_ID=your_client_id');
    console.log('   STRAVA_CLIENT_SECRET=your_client_secret');
  } else {
    console.log('✅ Strava OAuth configured');
  }
});
