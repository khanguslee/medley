import type { StravaConfig } from './client.js';

export function loadStravaConfig(): StravaConfig {
  const missing: string[] = [];

  const clientId = process.env.VITE_STRAVA_CLIENT_ID;
  const clientSecret = process.env.VITE_STRAVA_CLIENT_SECRET;
  const redirectUri = process.env.VITE_STRAVA_REDIRECT_URI;

  if (!clientId) missing.push('VITE_STRAVA_CLIENT_ID');
  if (!clientSecret) missing.push('VITE_STRAVA_CLIENT_SECRET');
  if (!redirectUri) missing.push('VITE_STRAVA_REDIRECT_URI');

  if (missing.length > 0) {
    throw new Error(
      `Missing required Strava environment variables: ${missing.join(', ')}`,
    );
  }

  return {
    clientId: clientId!,
    clientSecret: clientSecret!,
    redirectUri: redirectUri!,
  };
}
