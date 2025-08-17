# Strava API Interface App

A comprehensive web application that connects with Strava's API to display and analyze athletic activities, providing users with insights into their fitness data and performance metrics.

**Experience Qualities**:
1. **Connected** - Seamlessly integrates with Strava to provide real-time athletic data and statistics
2. **Insightful** - Transforms raw activity data into meaningful visualizations and performance analytics  
3. **Performance-focused** - Emphasizes speed, efficiency, and responsiveness for athletes who value their time

**Complexity Level**: Light Application (multiple features with basic state)
- The app handles OAuth authentication, data fetching, visualization, and basic filtering/sorting functionality while maintaining a focused scope on Strava integration

## Essential Features

### Strava OAuth Authentication
- **Functionality**: Secure authentication flow with Strava using OAuth 2.0
- **Purpose**: Enables access to user's private Strava data while maintaining security
- **Trigger**: User clicks "Connect with Strava" button on landing page
- **Progression**: Landing page → OAuth redirect → Strava auth → Callback → Dashboard
- **Success criteria**: User successfully authenticates and tokens are stored securely

### Activity Dashboard  
- **Functionality**: Display recent activities with key metrics (distance, time, pace, elevation)
- **Purpose**: Provides quick overview of recent training and performance
- **Trigger**: Successful authentication or app reload for authenticated users
- **Progression**: Authentication → API fetch → Data parsing → Dashboard display
- **Success criteria**: Activities load within 2 seconds and display accurate metrics

### Activity Detail View
- **Functionality**: Detailed view of individual activities with maps, splits, and performance data
- **Purpose**: Deep dive analysis for specific workouts and training sessions
- **Trigger**: User clicks on activity card from dashboard
- **Progression**: Activity card click → Detail fetch → Map/chart rendering → Full detail display
- **Success criteria**: All activity data renders correctly including route visualization

### Performance Analytics
- **Functionality**: Charts and visualizations showing trends over time (weekly/monthly distance, pace trends)
- **Purpose**: Help athletes track progress and identify training patterns
- **Trigger**: User navigates to analytics tab or section
- **Progression**: Analytics tab → Date range selection → Data aggregation → Chart rendering
- **Success criteria**: Charts accurately represent data and update smoothly with date changes

## Edge Case Handling

- **Authentication Failure**: Clear error message with retry option and troubleshooting steps
- **API Rate Limiting**: Graceful degradation with cached data and retry mechanism
- **Network Connectivity**: Offline mode with cached activities and sync when reconnected
- **Empty Activity Data**: Encouraging empty state with tips to start tracking activities
- **Invalid/Revoked Tokens**: Automatic re-authentication flow with user notification
- **Large Activity Lists**: Pagination and virtual scrolling for performance optimization

## Design Direction

The design should feel athletic, modern, and performance-driven like a premium fitness tracking device - clean interfaces with bold data visualization that motivates and informs serious athletes.

## Color Selection

Triadic color scheme using energetic athletic colors that convey movement, achievement, and performance data clarity.

- **Primary Color**: Athletic Orange (oklch(0.72 0.15 45)) - Communicates energy, motivation, and athletic achievement
- **Secondary Colors**: Deep Navy (oklch(0.25 0.08 240)) for stability and professionalism, Fresh Green (oklch(0.65 0.12 135)) for growth and progress indicators
- **Accent Color**: Vibrant Electric Blue (oklch(0.6 0.18 240)) - Attention-grabbing highlight for CTAs, active states, and key metrics
- **Foreground/Background Pairings**:
  - Background (White oklch(1 0 0)): Foreground Dark Navy (oklch(0.2 0.05 240)) - Ratio 10.5:1 ✓
  - Card (Light Gray oklch(0.98 0.01 240)): Foreground Dark Navy (oklch(0.2 0.05 240)) - Ratio 9.8:1 ✓
  - Primary (Athletic Orange oklch(0.72 0.15 45)): White text (oklch(1 0 0)) - Ratio 4.8:1 ✓
  - Secondary (Deep Navy oklch(0.25 0.08 240)): White text (oklch(1 0 0)) - Ratio 8.2:1 ✓
  - Accent (Electric Blue oklch(0.6 0.18 240)): White text (oklch(1 0 0)) - Ratio 4.9:1 ✓

## Font Selection

Bold, athletic typography that conveys precision and performance using Inter for its excellent readability at all sizes and technical/data-focused character.

- **Typographic Hierarchy**:
  - H1 (App Title): Inter Bold/32px/tight letter spacing
  - H2 (Section Headers): Inter Semibold/24px/normal spacing
  - H3 (Activity Titles): Inter Medium/18px/normal spacing
  - Body (Metrics/Data): Inter Regular/16px/normal spacing
  - Small (Timestamps/Labels): Inter Medium/14px/wide spacing
  - Data Large (Key Metrics): Inter Bold/28px/tight spacing

## Animations

Purposeful motion that feels responsive and athletic - quick, precise animations that enhance usability without delaying the user's workflow.

- **Purposeful Meaning**: Smooth transitions between data views reinforce the connected nature of athletic performance, while quick micro-interactions provide immediate feedback for an app that respects athletes' time
- **Hierarchy of Movement**: Primary focus on data loading states and metric highlights, secondary focus on navigation transitions, minimal decorative animation

## Component Selection

- **Components**: 
  - Cards for activity display with hover states
  - Buttons (primary/secondary) for authentication and actions
  - Tabs for navigation between dashboard/analytics/profile
  - Progress indicators for data loading
  - Charts (recharts) for performance visualization
  - Avatar for user profile display
  - Badges for activity types and achievements
  - Skeleton loaders for data fetching states

- **Customizations**: 
  - Custom activity card component with integrated metrics display
  - Strava-branded authentication button
  - Performance chart wrapper with athletic styling
  - Map integration component for route visualization

- **States**: 
  - Buttons: Default (solid primary), Hover (slight scale + shadow), Active (pressed inset), Focused (ring), Disabled (muted)
  - Cards: Default (subtle shadow), Hover (elevated shadow + scale), Selected (border accent)
  - Data elements: Loading (skeleton), Error (muted + icon), Success (normal), Updated (brief highlight)

- **Icon Selection**: 
  - Phosphor icons for consistency: Activity, TrendUp, MapPin, Timer, Lightning for various metrics and states
  - Custom Strava logo for branding elements

- **Spacing**: 
  - Consistent 4px base unit: p-4 (16px), gap-6 (24px), m-8 (32px) for generous breathing room around athletic data
  - Tight spacing (gap-2) for related metrics, generous spacing (gap-8) between distinct activity cards

- **Mobile**: 
  - Mobile-first responsive design with stacked cards on small screens
  - Simplified navigation using bottom tabs on mobile
  - Touch-optimized activity cards with larger tap targets
  - Horizontal scroll for activity metrics on mobile to maintain readability