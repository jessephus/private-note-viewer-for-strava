import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';

import App from './App.jsx';
import { ErrorFallback } from './ErrorFallback.jsx';

import './main.css';
import './styles/theme.css';

createRoot(document.getElementById('root')).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
  </ErrorBoundary>,
);
