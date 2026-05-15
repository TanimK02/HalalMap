# Halal Map — MVP

Halal food delivery marketplace: customer app (React Native), restaurant dashboard, admin panel, and shared Node/Express API.

Command cheat sheet: [START.md](START.md).

## Live demo (add your links)

- **Restaurant dashboard**: <add link>
- **Admin panel**: <add link>
- **API (hosted):** https://halalmap.onrender.com — health check: https://halalmap.onrender.com/health

## Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (local or hosted) — required when you run the API
- [Expo Go](https://expo.dev/go) on a physical phone (optional; simulators/emulators work without it)

### 1. Quick start: Expo mobile app

From the **repository root**:

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Environment**

   Copy [apps/mobile/.env.example](apps/mobile/.env.example) to `apps/mobile/.env` and set `EXPO_PUBLIC_API_URL`:

   - **Hosted API (viewers, demos, or when you are not running the API locally):** set exactly:

     ```
     EXPO_PUBLIC_API_URL=https://halalmap.onrender.com
     ```

     Restart Metro after changing this file.

   - **iOS Simulator with a local API:** `http://127.0.0.1:4000`.
   - **Physical device on the same Wi‑Fi as your dev machine:** `http://<your-computer-LAN-IP>:4000` (the API listens on `0.0.0.0:4000`; see [START.md](START.md)).
   - Optional: `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` when you test payments (dev builds / EAS later).

3. **Start Expo**

   ```bash
   pnpm dev:mobile
   ```

   If the bundler misbehaves, clear the cache:

   ```bash
   cd apps/mobile && pnpm exec expo start --clear
   ```

4. **Open the app**

   - Scan the QR code with **Expo Go** (physical device), or
   - From `apps/mobile`: `pnpm ios`, `pnpm android`, or `pnpm web`.

**Backend:** Sign-in and most flows need the API. When you are ready, start it in another terminal (see **2. Backend (API)** below). For Stripe payments you will need a development build (EAS Build) later.

### 2. Backend (API)

```bash
cd apps/api
cp .env.example .env
# Edit .env: set DATABASE_URL (PostgreSQL), JWT_SECRET (min 32 chars), optional STRIPE_* and upload keys
pnpm exec prisma migrate dev   # create DB and run migrations
pnpm exec prisma db seed       # optional: seed admin + sample restaurant
pnpm dev
```

API runs at `http://localhost:4000` when you develop locally. The hosted instance is **https://halalmap.onrender.com** (set `EXPO_PUBLIC_API_URL` there for the mobile app to use it).

### 3. Shared package

```bash
cd packages/shared && pnpm build
```

### 4. Restaurant dashboard

Create `apps/restaurant-dashboard/.env` (optional):

```
VITE_API_URL=http://localhost:4000
```

Then:

```bash
pnpm --filter restaurant-dashboard dev
```

Runs at `http://localhost:5173`. Uses API proxy when `VITE_API_URL` is unset (dev only).

### 5. Admin panel

Create `apps/admin/.env` (optional):

```
VITE_API_URL=http://localhost:4000
```

Then:

```bash
pnpm --filter admin dev
```

Runs at `http://localhost:5174`.

### Sharing the Expo app with viewers (live API data)

The deployed API for this project is **`https://halalmap.onrender.com`**. Viewers should use **`EXPO_PUBLIC_API_URL=https://halalmap.onrender.com`** in `apps/mobile/.env` (see [apps/mobile/.env.example](apps/mobile/.env.example)), then restart Metro.

Viewers install [Expo Go](https://expo.dev/go) and load **your** dev bundle; the app calls whatever URL is in `EXPO_PUBLIC_API_URL`, so that variable must point at the hosted API if they should see that data (not your laptop).

1. In `apps/mobile/.env`, set `EXPO_PUBLIC_API_URL=https://halalmap.onrender.com` (no trailing slash).
2. **Restart Expo** after editing `.env` (`pnpm dev:mobile` again).
3. **Same Wi‑Fi as you:** LAN / default mode is enough; share the QR from the terminal.
4. **Viewers anywhere (not on your network):** start with tunneling so the QR opens over the internet:

   ```bash
   pnpm dev:mobile:tunnel
   ```

   Tunnel mode may ask you to log in with an Expo account the first time. Viewers scan the QR in Expo Go; their phones call **Render** at `EXPO_PUBLIC_API_URL` for API data.

Treat a tunnel + public API like a **public demo**: expect anyone with the QR while the server runs to reach your backend.

If you run the API **locally** for development, switch `EXPO_PUBLIC_API_URL` back to `http://127.0.0.1:4000` or your LAN IP as needed.

## Monorepo layout

- `apps/api` — Express + Prisma + PostgreSQL
- `apps/mobile` — React Native (Expo) customer app
- `apps/restaurant-dashboard` — Vite + React restaurant dashboard
- `apps/admin` — Vite + React admin panel
- `packages/shared` — Types and brand tokens

## Seed users

After `prisma db seed`:

- **Admin:** `admin@halalmap.com` / `admin123`
- **Restaurant owner:** `owner@halalmap.com` / `owner123`

Create a customer account via the mobile app or `POST /auth/register`.

## Deploy readiness

- **API:** Set `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, and CORS origins. Run `prisma migrate deploy` and `node dist/index.js` (or your process manager).
- **Restaurant / Admin:** Build with `pnpm build`; serve the `dist/` folder. Set `VITE_API_URL` to your API URL at build time.
- **Mobile:** Use EAS Build for iOS/Android; set `EXPO_PUBLIC_API_URL` to your API URL. Add app icons and splash in `apps/mobile/assets` when ready.
