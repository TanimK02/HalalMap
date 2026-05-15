# Halal Map — MVP

Halal food delivery marketplace: customer app (React Native), restaurant dashboard, admin panel, and shared Node/Express API.

Command cheat sheet: [START.md](START.md).

## Live demo (add your links)

- **Restaurant dashboard**: <add link>
- **Admin panel**: <add link>
- **API health**: <add link to `/health`>

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

   - **iOS Simulator:** `http://127.0.0.1:4000` (matches the example file).
   - **Physical device on the same Wi‑Fi:** `http://<your-computer-LAN-IP>:4000` (the API listens on `0.0.0.0:4000`; see [START.md](START.md)).
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

API runs at `http://localhost:4000`.

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
