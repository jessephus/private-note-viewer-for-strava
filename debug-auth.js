#!/usr/bin/env node

// Debug script to test Strava API connection
import { StravaAPI } from './src/lib/strava-api.js';

async function testStravaConnection() {
  console.log('🔍 Testing Strava API Connection...\n');

  try {
    // Test 1: Backend connectivity
    console.log('1. Testing backend connection...');
    const stravaAPI = new StravaAPI();
    const health = await stravaAPI.testBackendConnection();
    console.log('✅ Backend connection successful:', health);

    // Test 2: Get auth URL
    console.log('\n2. Testing auth URL generation...');
    const authUrl = stravaAPI.getAuthUrl();
    console.log('✅ Auth URL generated:', authUrl);

    // Test 3: Test with mock token (this will fail, but shows if API calls work)
    console.log('\n3. Testing API call with mock token...');
    const stravaAPIWithToken = new StravaAPI('mock-token');
    try {
      await stravaAPIWithToken.getAthlete();
    } catch (error) {
      console.log('⚠️ Expected failure with mock token:', error.message);
    }

    console.log('\n✅ All basic tests completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Open browser and go to auth URL');
    console.log('2. Check browser console logs when app loads');
    console.log('3. Check if authentication flow completes');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testStravaConnection();
