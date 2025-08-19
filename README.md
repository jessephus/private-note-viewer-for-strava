# Strava Activity Dashboard

A modern web application for visualizing and analyzing your Strava activities. Built with React and JavaScript, this dashboard provides comprehensive insights into your athletic performance.

## Features

- 🏃‍♂️ **Activity Dashboard**: View your recent activities with detailed metrics
- 📊 **Performance Analytics**: Visualize training trends and performance metrics  
- 🎯 **Statistics**: Track totals by activity type, distance, time, and elevation
- 🔒 **Secure Authentication**: OAuth 2.0 integration with Strava
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- ⚡ **Demo Mode**: Try the dashboard with sample data without connecting to Strava

## Technologies

- **React 19** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible UI components
- **Lucide React** - Beautiful icons
- **JavaScript** - No TypeScript dependencies

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jessephus/private-note-viewer-for-strava.git
cd private-note-viewer-for-strava
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:5173 in your browser

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment to any static hosting provider.

## Local Development

This application is configured to run locally with a backend server for proper OAuth authentication.

### Running the Full Application

1. Start the backend server:
```bash
npm run server
```

2. In a new terminal, start the frontend development server:
```bash
npm run dev
```

3. Open http://localhost:5173 in your browser

The backend server will run on http://localhost:3001 and handle OAuth token exchange securely.

## Usage

### Demo Mode
Click "Try Demo Mode" to explore the dashboard with sample activity data.

### Strava Integration
1. Click "Connect with Strava"
2. Authorize the application in your Strava account
3. View your real activity data in the dashboard

**Note**: To use real Strava data, you'll need to:
1. Register your application with Strava
2. Create a `.env` file with your Strava credentials:
   ```
   STRAVA_CLIENT_ID=your_client_id
   STRAVA_CLIENT_SECRET=your_client_secret
   ```
3. The backend server will handle secure OAuth token exchange

## Troubleshooting

### Authentication Errors

If you encounter authentication errors like "Failed to fetch" or "ERR_CONNECTION_REFUSED":

1. **Check Backend Server Status**
   ```bash
   # Verify the backend server is running on port 3001
   curl http://localhost:3001/api/health
   ```

2. **Environment Configuration**
   - Create a `.env` file based on `.env.example`
   - Ensure `STRAVA_CLIENT_SECRET` is set (required for OAuth)
   - Check that `VITE_BACKEND_URL` matches your backend server URL

3. **Port Conflicts**
   - Backend runs on port 3001 by default
   - Frontend runs on port 5173 by default  
   - Change ports in `.env` if needed:
     ```
     PORT=3001                    # Backend port
     VITE_BACKEND_URL=http://localhost:3001  # Frontend backend URL
     ```

4. **Network Issues**
   - Ensure no firewall is blocking connections
   - Try running both servers on the same machine
   - Check browser console for detailed error messages

5. **Strava API Configuration**
   - Verify your Strava app is configured at https://www.strava.com/settings/api
   - Ensure the redirect URI in your Strava app matches your frontend URL
   - Check that your `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` are correct

### Common Error Messages

- **"Cannot connect to backend server"**: Backend server is not running or wrong URL
- **"Authentication server is unavailable"**: Network connectivity issues
- **"Failed to exchange code for token"**: Invalid Strava credentials or configuration
- **"Your Strava session has expired"**: Token validation failed, sign in again

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── AuthLanding.jsx # Authentication landing page
│   ├── Dashboard.jsx   # Main dashboard component
│   └── ActivityCard.jsx # Individual activity display
├── hooks/              # Custom React hooks
│   ├── use-local-storage.js # localStorage hook
│   └── use-mobile.js   # Mobile detection hook
├── lib/                # Utility libraries
│   ├── utils.js        # General utilities
│   └── strava-api.js   # Strava API integration
└── styles/             # CSS and styling
```

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request