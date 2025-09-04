// Debug: Test authentication state
console.log('=== Authentication Debug ===');
console.log('localStorage contents:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key.includes('strava')) {
    const value = localStorage.getItem(key);
    console.log(`${key}:`, value);
  }
}

// Test if we can reach the backend
fetch('http://localhost:3001/api/health')
  .then(response => response.json())
  .then(data => {
    console.log('Backend health check:', data);
  })
  .catch(error => {
    console.error('Backend connection failed:', error);
  });
