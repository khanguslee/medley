# Medley

A local React web app that connects to the Strava API and lists your recent activities.

**Stack:** Vite + React + TypeScript + pnpm

## Setup

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Create a Strava API application at [strava.com/settings/api](https://www.strava.com/settings/api) and set the **Authorization Callback Domain** to `localhost`.

3. Copy `.env.example` to `.env` and fill in your credentials:

   ```sh
   cp .env.example .env
   ```

   ```
   VITE_STRAVA_CLIENT_ID=<your client id>
   VITE_STRAVA_CLIENT_SECRET=<your client secret>
   VITE_STRAVA_REDIRECT_URI=http://localhost:5173/auth/callback
   ```

## Development

```sh
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173), click **Connect with Strava**, and authorize the app to see your activities.

## Build

```sh
pnpm build
pnpm preview
```
