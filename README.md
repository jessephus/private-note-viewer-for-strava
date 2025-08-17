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

The built files will be in the `dist` directory, ready for deployment to GitHub Pages or any static hosting provider.

## Deployment

This project is configured for automatic deployment to GitHub Pages using GitHub Actions. When you push to the main branch, the app will be automatically built and deployed.

### Manual Deployment

You can also deploy the built files manually to any static hosting service:

- **GitHub Pages**: Enable Pages in repository settings and point to the `dist` folder
- **Netlify**: Drag and drop the `dist` folder
- **Vercel**: Connect your repository for automatic deployments

## Usage

### Demo Mode
Click "Try Demo Mode" to explore the dashboard with sample activity data.

### Strava Integration
1. Click "Connect with Strava"
2. Authorize the application in your Strava account
3. View your real activity data in the dashboard

**Note**: This demo uses a placeholder Strava client ID. For production use, you'll need to:
1. Register your application with Strava
2. Update the `STRAVA_CLIENT_ID` in `src/lib/strava-api.js`
3. Implement proper backend token exchange

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