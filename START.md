# Halal Map – Start / Run Commands

Run from **repo root** (`/halalMap`) unless noted. Use `pnpm` (or `npm run`).

## Mobile first (Expo)

1. `pnpm install`
2. `cp apps/mobile/.env.example apps/mobile/.env` — set `EXPO_PUBLIC_API_URL`. **Hosted API (viewers / demos):** `https://halalmap.onrender.com`. **Local API:** `http://127.0.0.1:4000` (simulator) or `http://YOUR_LAN_IP:4000` (device on same Wi‑Fi).
3. `pnpm dev:mobile` — or `cd apps/mobile && pnpm exec expo start --clear` if you need a clean cache.
4. Open via Expo Go (QR) or from `apps/mobile`: `pnpm ios` / `pnpm android` / `pnpm web`.

**Viewers + hosted API:** in `apps/mobile/.env` use `EXPO_PUBLIC_API_URL=https://halalmap.onrender.com`, restart Metro, then from repo root run `pnpm dev:mobile:tunnel` and share the QR (Expo Go). See [README.md](README.md) (“Sharing the Expo app with viewers”).

---

## Mobile (`apps/mobile`)

| Command | What it does |
|--------|----------------|
| `pnpm dev` | Start Expo dev server |
| `pnpm exec expo start --tunnel` | Tunnel URL for QR (viewers not on your LAN; may prompt Expo login) |
| `pnpm exec expo start --clear` | Start Expo with cleared cache |
| `pnpm android` | Start and open Android |
| `pnpm ios` | Start and open iOS |
| `pnpm web` | Start Expo for web |

**Note:** Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env`. Use `https://halalmap.onrender.com` for the deployed API; use `http://YOUR_LAN_IP:4000` for a local API on a physical device.

---

## From root

| Command | What it does |
|--------|----------------|
| `pnpm dev:api` | Start API dev server (Express on port 4000, bind 0.0.0.0) |
| `pnpm dev:mobile` | Start Expo dev server (customer app) |
| `pnpm dev:mobile:tunnel` | Same as `dev:mobile` but `--tunnel` (share QR with viewers off your LAN) |
| `pnpm dev:restaurant` | Start restaurant dashboard (Vite) |
| `pnpm dev:admin` | Start admin panel (Vite) |
| `pnpm build:api` | Build API (TypeScript → `dist/`) |
| `pnpm build:restaurant` | Build restaurant dashboard |
| `pnpm build:admin` | Build admin panel |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run Prisma migrations (dev) |
| `pnpm db:push` | Push schema to DB (no migration files) |
| `pnpm db:seed` | Run seed script |
| `pnpm db:studio` | Open Prisma Studio |

---

## API (`apps/api`)

| Command | What it does |
|--------|----------------|
| `pnpm dev` | Start API with watch (`node --import tsx --watch src/index.ts`) |
| `pnpm start` | Run built API (`node dist/index.js`) – run `pnpm build` first |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Migrate dev |
| `pnpm db:push` | Push schema |
| `pnpm db:seed` | Seed database |
| `pnpm db:studio` | Prisma Studio |

**Note:** API listens on `0.0.0.0:4000` so your phone can use your machine’s LAN IP (e.g. `http://192.168.x.x:4000`).

---

## Restaurant dashboard (`apps/restaurant-dashboard`)

| Command | What it does |
|--------|----------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |

---

## Admin (`apps/admin`)

| Command | What it does |
|--------|----------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |

---

## Seed / test logins

Created by `pnpm db:seed` (run from root or from `apps/api`).

| App | Email | Password |
|-----|-------|----------|
| **Admin panel** | `admin@halalmap.com` | `admin123` |
| **Restaurant dashboard** | `owner@halalmap.com` | `owner123` |

---

## Typical dev setup

1. **Terminal 1 – Mobile**  
   `pnpm dev:mobile`  
   (or `cd apps/mobile && pnpm exec expo start --clear`)

2. **Terminal 2 – API**  
   `pnpm dev:api`  
   (or `cd apps/api && pnpm dev`)

3. **Optional – Restaurant / Admin**  
   `pnpm dev:restaurant` and/or `pnpm dev:admin`

Ensure `apps/api/.env` and `apps/mobile/.env` (and any `.env.example`s) are set as needed (DB URL, JWT secret, `EXPO_PUBLIC_API_URL`, etc.).
