---
name: ""
overview: ""
todos: []
isProject: false
---

# Local search: radius, distance sorting, and location sources

## Overview

Add location-based restaurant search: **single list sorted by distance** (closest first). When user has a location (device / address / manual), API returns all restaurants with coordinates, sorted by distance, with `distanceMiles` per item. **Radius is UX-only** in the app (e.g. default 5 mi for labeling/sections like "Within 5 mi" / "5–10 mi"); no radius filter is sent to the API so users always see the next-closest places after scrolling through nearby ones.

## Current state

- **API** ([apps/api/src/routes/restaurants.ts](apps/api/src/routes/restaurants.ts)): `GET /restaurants` supports `halalStatuses` and `search` only; results ordered by name. No location params.
- **Schema**: Restaurant has `latitude` / `longitude` (Float?, optional) but never set. Address has no lat/lng.
- **Mobile** ([apps/mobile/src/screens/Home.tsx](apps/mobile/src/screens/Home.tsx)): Calls `/restaurants` with halal + search only; no location or distance UI.

## Architecture (high level)

```mermaid
sequenceDiagram
  participant App as Mobile App
  participant API as API
  participant DB as DB

  App->>App: Resolve location (device / address / manual)
  App->>API: GET /restaurants?lat=&lng=&...
  API->>DB: Query all with coords, order by distance
  DB-->>API: Restaurants + distanceMiles
  API-->>App: JSON with distanceMiles per restaurant
  App->>App: Single list closest first; radius for labels/sections
```



## 1. API: location-based list (no radius filter)

### 1.1 GET /restaurants – optional location params

- Add optional query params: `lat`, `lng` (no `radiusMiles` filter).
- When **both** `lat` and `lng` are present:
  - Restrict to restaurants that have non-null `latitude` and `longitude`.
  - **Sort by distance ascending** (Haversine).
  - Include `distanceMiles` in each returned restaurant object (rounded to 1–2 decimals).
  - Return **all** such restaurants (no distance cutoff).
- When lat/lng are **not** provided: keep current behavior (no distance sort, no `distanceMiles`).
- Existing filters (`halalStatuses`, `search`) continue to apply. Implement distance via raw SQL Haversine in `$queryRaw` (or equivalent) and merge with existing where conditions.

### 1.2 Populate restaurant coordinates (geocoding)

- Add geocoding helper (e.g. [apps/api/src/lib/geocode.ts](apps/api/src/lib/geocode.ts)): address string → `{ latitude, longitude }` or null. Use Nominatim (free) or Google Geocoding (env key) behind a single interface.
- On restaurant **create** and **update** (PATCH): after validating address, geocode and set `latitude` / `longitude`. On failure, save restaurant without coords.
- Optional: backfill script or admin endpoint for existing restaurants with address but null lat/lng.

### 1.3 DB seed – set coordinates on seeded restaurants

- Update [apps/api/prisma/seed.ts](apps/api/prisma/seed.ts) so the seeded restaurant(s) include **latitude** and **longitude**. Use fixed coordinates (e.g. for “123 Main St, City” use a known point such as 37.7749, -122.4194 or any city you prefer) so that:
  - After `pnpm db:seed`, location-based search returns the sample restaurant when the client sends lat/lng.
  - No geocoding call in the seed (avoids external API dependency and rate limits during seed).
- If you add a seeded customer with an address later, set lat/lng on that address too for testing “use my address.”

### 1.4 User addresses: lat/lng for “use my address”

- Add `latitude` and `longitude` (Float?, optional) to `Address` in [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma); migration.
- On address **create** and **update** in [apps/api/src/routes/users.ts](apps/api/src/routes/users.ts): build full address, geocode, store lat/lng. Expose lat/lng in address GET responses.

## 2. Mobile app: location source and radius as UX only

### 2.1 Dependencies and permissions

- Add **expo-location** for device location. Request permissions; handle deny/unavailable for fallbacks.

### 2.2 Search origin (priority order)

1. **Device location** – use as `lat`/`lng` when permission granted.
2. **Default address** – if user has default address with lat/lng, use that.
3. **Manual entry** – “Search near this address”; geocode (e.g. via API endpoint) and use result.
4. If no coords: call API without lat/lng (current behavior); show hint: “Enable location or add an address to see nearby restaurants.”

### 2.3 Radius = UX only (no filter)

- **Do not send** `radiusMiles` to the API. API always returns all restaurants with coords, sorted by distance.
- In the app, use a **default radius** (e.g. 5 miles) only for **presentation**:
  - Option A: **Sections** – e.g. “Within 5 mi”, “5–10 mi”, “10+ mi” based on `distanceMiles`.
  - Option B: **Badges** – show “X.X mi” on each card and optionally highlight or group the first N that fall within 5 mi.
- User can change “focus” (e.g. 5 / 10 / 25 mi) to control how sections or labels are drawn; list content and order stay “closest first” with no cutoff.

### 2.4 Home screen integration

- Resolve location (device → default address → manual). Call `GET /restaurants` with `lat`, `lng` when available (no radius param).
- List type includes optional `distanceMiles`. Render single list; show distance on cards; use radius only for section headers or visual grouping (e.g. “Within 5 mi” then “5–10 mi”).

## 3. Edge cases and suggestions

- Restaurants without coordinates: excluded when lat/lng are sent (location-based list); still appear when no location (current list by name).
- Geocoding failures: save without lat/lng; don’t block create/update.
- Privacy: don’t persist device location on server; only use it client-side to form the request.

## 4. Files to touch (summary)


| Area   | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API    | [apps/api/src/routes/restaurants.ts](apps/api/src/routes/restaurants.ts) (list: lat/lng params, sort by distance, distanceMiles in response); [apps/api/src/routes/users.ts](apps/api/src/routes/users.ts) (address create/patch: geocode, store lat/lng); new `apps/api/src/lib/geocode.ts`; restaurant create/patch (geocode); [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma) (Address lat/lng); [apps/api/prisma/seed.ts](apps/api/prisma/seed.ts) (set latitude/longitude on seeded restaurant); migration |
| Mobile | [apps/mobile/package.json](apps/mobile/package.json) (expo-location); [apps/mobile/src/screens/Home.tsx](apps/mobile/src/screens/Home.tsx) (location resolution, pass lat/lng only, single list by distance, radius for sections/labels and distance on cards); optional hook for location resolution                                                                                                                                                                                                                          |


## 5. Testing

- API: GET /restaurants with/without lat/lng; verify sort order and `distanceMiles`; no radius filter.
- Mobile: location on/off, default address, manual address; single list closest first; radius used only for sections/badges.

