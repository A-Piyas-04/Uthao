# Uthao Frontend

Minimal, Uber-style React frontend for the Uthao ride-sharing backend. Vite + React 18 +
react-router-dom + axios + Context API + Tailwind CSS v4 — no component UI kit, no
TypeScript.

Full design write-up (project structure, why each piece exists, every endpoint mapped to
its API function): [`../Docs/Frontend_React_Guide.md`](../Docs/Frontend_React_Guide.md) /
`.pdf`.

## How to run it

1. **Start the backend first.** From the repo root: `docker compose up -d` (Postgres +
   RabbitMQ), then start `eureka-server`, then every `*-service`, then `api-gateway` last
   (each `mvn spring-boot:run` in its own terminal — see the root `README.md` for the
   exact order). The gateway must be reachable at `http://localhost:8080`.
2. **Install dependencies** (only needed once, or after pulling changes that touch
   `package.json`):
   ```bash
   cd uthao-frontend
   npm install
   ```
3. **Start the dev server:**
   ```bash
   npm run dev
   ```
4. Open **http://localhost:5173** in your browser.

`uthao-frontend/.env` already points `VITE_API_BASE_URL` at
`http://localhost:8080/api` — only edit it if your gateway runs somewhere else.

To try the full flow: register a RIDER and a DRIVER (two browser windows / one
incognito), finish driver onboarding, toggle the driver `AVAILABLE`, then request a ride
as the rider.

## Build / verify without running the dev server

```bash
npm run build    # production bundle to dist/ — also catches import/JSX errors
npm run preview  # serve that production build locally
```

## What's implemented

- **Auth** — register/login as RIDER or DRIVER, JWT persisted in `localStorage`,
  auto-attached to every request, auto-logout on 401.
- **Rider** — create a ride request by tapping pickup/drop points on a map (Leaflet +
  OpenStreetMap, no API key — see `LocationPickerModal.jsx`) that opens centered on
  the rider's actual detected location (blue dot) rather than a hardcoded city
  center, see nearby *available* drivers on a live-refreshing map before submitting
  (`NearbyDriversMap.jsx`), live-poll for the match and the resulting trip, ride
  history with cancel.
- **Driver** — onboarding (profile + vehicle), availability toggle (geolocation-based)
  that keeps pushing fresh location every 20s while `AVAILABLE` (not just once at
  toggle time), trip history with drill-down into each trip.
- **Trip** — view status; start/complete are driver-only (both in the UI and enforced
  server-side by trip-service — see below), cancel is rider-or-driver but only before
  a trip starts, view payment once completed, request a refund.
- **Notifications** — list + mark-as-read.

## Backend changes that shipped alongside this frontend

Small read endpoints were added to make the UI actually work — the existing backend
had no way to answer any of these:

- **`GET /api/trips/by-request/{rideRequestId}`** (trip-service) — resolves the tripId
  trip-service creates *asynchronously* after a match, since `find-driver`'s response
  never carries one. The rider UI polls this after a match; the driver UI calls it on
  demand from trip history.
- **`GET /api/drivers/by-user/{userId}`** (driver-service) — resolves a driver's own
  `driverId` (driver-service's primary key) from their identity-service `userId`. Every
  other driver-service endpoint (`status`, `trips`, `vehicles`) is keyed by `driverId`,
  not `userId`, so this is required for a driver to use the app again after their first
  session ends.
- **`GET /api/drivers/{driverId}/status`** (driver-service) — the backend originally
  only let you *set* status (`PATCH .../status`), never read it back, so
  `DriverDashboard.jsx` hardcoded `OFFLINE` on every mount and a page refresh always
  showed offline regardless of the real server-side state. Defaults to `OFFLINE`
  (not 404) when no status has ever been set for that driver.
- **CORS on api-gateway** (`api-gateway/.../config/CorsConfig.java`) — the gateway had
  no CORS configuration at all, so the browser blocked every request from
  `http://localhost:5173` at the preflight `OPTIONS` stage (curl/Postman worked fine
  since they don't send preflight requests, which is why this wasn't caught earlier).
  A `CorsWebFilter` bean now allows any `localhost:*` origin. **Restart `api-gateway`**
  after pulling this change — there's no devtools hot-reload in this project.

**Restart `driver-service`** after pulling the `getDriverStatus` change too, for the
same reason (no devtools hot-reload).

- **Trip start/complete/cancel authorization** (trip-service) — before this, **no
  downstream service parsed the JWT at all**; the gateway only checked the token was
  validly signed, not who it belonged to, so a rider could call
  `POST /trips/{tripId}/start` directly and it would just work. Added
  `com.uthao.trip.security.JwtUtil` (mirrors identity-service's own), the `jjwt`
  dependency, and `jwt.secret` config — none of which trip-service had before.
  `start`/`complete` now require `role == "DRIVER"` (403 otherwise); `cancel` now
  requires `status == "MATCHED"` (409 otherwise — a trip can only be cancelled before
  it starts). Verified live with real tokens, not just compiled: rider → 403, driver →
  passes through, cancel-after-start → 409. **Restart `trip-service`** after pulling
  this change.

## Known limitations (by design, for this phase)

- No live/WebSocket trip tracking — the rider's post-match screen and the driver's trip
  history both use short polling, not push. See §16 of the full guide.
- `POST /drivers` has no uniqueness check on `userId` at the database level, so nothing
  stops two driver profiles being created for the same user if `/drivers/by-user/{id}`
  is called concurrently with two onboarding submissions. The onboarding page guards
  against the common case (redirects away if `driverId` is already known), but this
  isn't a database-level constraint.
- No token refresh — the backend JWT has no expiry in this phase.
