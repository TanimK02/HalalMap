# Halal Map — testing checklist

This document lists what to verify on the platform: automated tests you already have, gaps to fill, end-to-end coverage, and manual checks (including real phones). Use it as a release or regression guide.

---

## 1. How the repo is split (what you are testing)

| Surface | Tech | Typical URL / run |
|--------|------|-------------------|
| **API** | Express + Prisma + PostgreSQL | `http://localhost:4000` |
| **Customer app** | React Native (Expo) | Expo Go / dev build |
| **Restaurant dashboard** | Vite + React | `http://localhost:5173` |
| **Admin panel** | Vite + React | `http://localhost:5174` |

Root script today: `pnpm test:api` → Jest in `apps/api`.

---

## 2. Automated tests you have today (API)

Run: `pnpm test:api` (from repo root) or `pnpm test:run` in `apps/api`.

| Area | File(s) | What they exercise |
|------|---------|---------------------|
| Health | `health.test.ts` | `GET /health` |
| Auth | `auth.test.ts` | Register, login, JWT behavior |
| Users | `users.test.ts` | Profile, addresses, favorites (customer flows backed by `/users`) |
| Restaurants | `restaurants.test.ts` | Listing, detail, menu, public vs owner |
| Orders | `orders.test.ts` | Cart → checkout-related API, statuses |
| Admin | `admin.test.ts` | Admin-only routes |
| Webhooks | `webhooks.test.ts` | Stripe webhook handling (signatures, idempotency as implemented) |
| Auth middleware | `middleware/auth.test.ts` | Token validation / role checks |
| Fees | `lib/fees.test.ts` | Platform / pickup / delivery fee math |
| Tax | `lib/tax.test.ts` | Tax calculation rules |

**Gaps to consider adding (unit / integration):**

- `GET /config` — client-visible flags and keys (no secrets leaked).
- `GET /geocode` and `limit` query — success, 400 on missing address, 404 when not found, cap on `limit`.
- `lib/geocode.js` — mock HTTP and test parsing / errors if logic grows.
- `lib/config.js` — env parsing and defaults.
- Any S3 presign or upload helpers — signed URL expiry, content-type, unauthorized paths.
- Prisma-heavy edge cases: unique constraints (`User.email`, favorites), `OrderItem` uniqueness, cascade deletes.
- Rate limiting — optional supertest checks that burst traffic returns 429 (may need test-only limiter config).

---

## 3. Automated tests you do not have yet (frontends & mobile)

There are **no** Jest/Vitest/Playwright suites in `apps/restaurant-dashboard`, `apps/admin`, or `apps/mobile` in this repo today. When you add them, prioritize:

### 3.1 Restaurant dashboard (Vite + React)

- **Unit / component:** form validation (login, profile, menu CRUD), price inputs, hour pickers if any.
- **Integration (with MSW or mocked `fetch`):** auth token attached to API calls; 401 → redirect to login.
- **E2E (e.g. Playwright):** login as seeded owner → dashboard loads → open Menu → create category/item → see it listed → open Orders → change status if applicable.

### 3.2 Admin panel (Vite + React)

- **E2E:** login as admin → moderation queue → approve/reject → add restaurant → list users/orders/analytics pages load without console errors.

### 3.3 Mobile (Expo / React Native)

- **Unit:** cart math, fee/tax display if duplicated client-side, reducers or context pure logic.
- **Component:** `@testing-library/react-native` for critical screens (Login, Cart checkout button states).
- **E2E:** Maestro, Detox, or Expo + development build against a staging API — full journey: register → browse → restaurant detail → add to cart → address → pay (Stripe test mode) → order appears in history.

---

## 4. End-to-end (full stack) scenarios

Run these against a **clean DB** (migrate + seed or fixtures), **Stripe test mode**, and consistent `CLIENT_ORIGIN_*` / CORS settings.

### 4.1 Customer (mobile)

1. Register new customer; log out; log in with wrong password (error); log in successfully.
2. Home: list shows only approved restaurants; pull-to-refresh if implemented.
3. Restaurant detail: menu loads; unavailable items hidden or disabled; halal badges match API.
4. Favorites: add/remove; persists after app restart (token same).
5. Cart: multiple items, quantity change, remove line; totals match API/order preview if present.
6. Delivery vs pickup: address required for delivery; pickup path skips invalid address states.
7. Checkout: PaymentSheet or redirect completes with test card; order created with `PENDING` or post-payment state as designed.
8. Orders list and order detail: status updates when restaurant/admin changes order (if real-time, verify refresh).

### 4.2 Restaurant owner (dashboard)

1. Login as owner; cannot access admin routes via URL guessing (API should 403).
2. Profile: update phone, hours, halal fields, pickup/delivery flags; save and reload.
3. Menu: CRUD categories and items; images if applicable; toggles `isAvailable` / pickup-delivery flags.
4. Orders: see new order after customer checkout; accept → prepare → ready → complete (or your state machine); cancel path and customer visibility.

### 4.3 Admin

1. Login as admin; restaurant moderation approve/unapprove reflects in mobile list.
2. Add restaurant / assign owner if flows exist.
3. Users list: no PII leaks in network tab beyond what product requires.
4. Orders: filter or search if present; support actions.

### 4.4 API / integrations

1. **Stripe:** payment intent creation, Connect destination charges (if used), webhook delivery in test mode (Stripe CLI forward to local `/webhooks`).
2. **Idempotency:** duplicate webhook events do not double-charge or duplicate order transitions.
3. **CORS:** mobile origin, `5173`, `5174` allowed; random origin blocked.
4. **Rate limit:** aggressive client gets throttled (adjust limits in test env if needed).

---

## 5. Manual and device testing (phones, tablets, browsers)

### 5.1 Phones (iOS and Android)

- Install via **Expo Go** or **development build**; confirm `EXPO_PUBLIC_API_URL` reaches API (LAN IP, not `localhost`, on physical device).
- **Keyboard:** login, register, address fields — submit, dismiss keyboard, no covered inputs.
- **Safe areas / notches:** headers and tab bar not clipped.
- **Deep links / Stripe return:** after 3DS or redirect, app returns to correct screen (per `StripeRedirectHandler` / linking config).
- **Offline / flaky network:** graceful errors; no white screen; retry where implemented.
- **Background:** return to app mid-checkout — cart and auth state still correct.
- **Permissions:** location if used for address; photo picker for uploads.

### 5.2 Tablets and small laptops

- Restaurant and admin **responsive layouts**: sidebar, tables, modals usable at ~768px width.

### 5.3 Desktop browsers (dashboard + admin)

- **Chrome, Safari, Firefox** (at least one WebKit): login, primary workflows, file upload if any.
- **Private/incognito:** session storage / cookies behavior matches expectations.

### 5.4 Accessibility (quick pass)

- Tab order and focus visible on web apps; form labels; color contrast on primary actions.
- Screen reader spot-check on one critical flow (login + one main task).

---

## 6. Non-functional and “beyond E2E”

| Category | What to verify |
|----------|----------------|
| **Performance** | API p95 for menu and order list; mobile scroll on long menus; no huge images without resize. |
| **Security** | JWT expiry/refresh behavior; passwords never in logs; admin routes reject customer tokens; SQL injection / XSS sanity (framework defaults + no `dangerouslySetInnerHTML`). |
| **Data** | Migrations apply on empty DB; seed is idempotent or documented; backup/restore drill if you rely on hosted Postgres. |
| **Observability** | Errors logged with request id if added; health check used by deploy platform. |
| **Compliance / product** | Halal status labels and certificate expiry (if shown) match business rules; fee and tax breakdown on receipt/order detail. |

---

## 7. Suggested minimal release smoke (15–20 minutes)

1. `pnpm test:api` passes.
2. API `GET /health` and `GET /config` OK on target environment.
3. Mobile: login, one browse-to-checkout path with Stripe test card.
4. Restaurant: one menu edit visible on mobile after refresh.
5. Admin: one moderation or visibility change reflected on mobile.

---

## 8. Environment checklist (before any serious test pass)

- [ ] `DATABASE_URL` points to intended DB (not production for destructive tests).
- [ ] `JWT_SECRET` set; Stripe keys are **test** keys where appropriate.
- [ ] `CLIENT_ORIGIN_MOBILE`, `CLIENT_ORIGIN_RESTAURANT`, `CLIENT_ORIGIN_ADMIN` match actual dev/staging URLs.
- [ ] Mobile `.env` uses reachable API URL for the device (not `localhost` on a physical phone).

---

*Last aligned with repo layout: API Jest suites under `apps/api/src`, apps `mobile`, `restaurant-dashboard`, `admin`. Update this file when you add new routes, payment flows, or CI jobs.*
