# Halal Map – Start / Run Commands

Run from **repo root** (`/halalMap`) unless noted. Use `pnpm` (or `npm run`).

---

## From root

| Command | What it does |
|--------|----------------|
| `pnpm dev:api` | Start API dev server (Express on port 4000, bind 0.0.0.0) |
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

## Mobile (`apps/mobile`)

| Command | What it does |
|--------|----------------|
| `pnpm dev` | Start Expo dev server |
| `pnpm exec expo start --clear` | Start Expo with cleared cache |
| `pnpm android` | Start and open Android |
| `pnpm ios` | Start and open iOS |
| `pnpm web` | Start Expo for web |

**Note:** Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` (e.g. `http://YOUR_LAN_IP:4000`) when using a physical device.

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

1. **Terminal 1 – API**  
   `pnpm dev:api`  
   (or `cd apps/api && pnpm dev`)

2. **Terminal 2 – Mobile**  
   `cd apps/mobile && pnpm exec expo start --clear`

3. **Optional – Restaurant / Admin**  
   `pnpm dev:restaurant` and/or `pnpm dev:admin`

Ensure `apps/api/.env` and `apps/mobile/.env` (and any `.env.example`s) are set as needed (DB URL, JWT secret, `EXPO_PUBLIC_API_URL`, etc.).
