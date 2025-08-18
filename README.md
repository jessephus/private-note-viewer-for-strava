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
git clone https://github.com/jessephus/strava-activity-dash.git
cd strava-activity-dash
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