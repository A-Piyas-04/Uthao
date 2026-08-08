# Uthao Frontend — Getting Started

You've been given this `uthao-frontend/` folder on its own. This doc gets it running
and talking to the backend — nothing else needed beyond what's listed here.

> Full design write-up (why every file exists, every endpoint mapped to its API
> function): `Docs/Frontend_React_Guide.md` / `.pdf`, if you have the full repo. Not
> required to get running — this doc is enough on its own.

---

## 1. Requirements

| Tool | Version |
|------|---------|
| Node.js | 18+ (20 LTS recommended) |
| npm | 9+ |
| A running Uthao backend | see §2 — this is the part people usually skip and then wonder why nothing works |

Confirm Node/npm:

```bash
node -v
npm -v
```

---

## 2. You need the backend too — and it must be recent enough

This frontend is not a static demo — it makes real HTTP calls to the Uthao backend
through the API Gateway (`http://localhost:8080`). Without the backend running, **all
you'll see is a login screen that never succeeds.**

You need the **`Chishti` branch of the Uthao backend repo, at commit `0d2807e` or
later.** This frontend was built against — and depends on — backend endpoints and
fixes that don't exist on `main` or on older commits:

| What the frontend needs | Why it breaks without it |
|---|---|
| CORS enabled on `api-gateway` (`CorsConfig.java`) | Without it, **every** request from the browser fails at the CORS preflight stage — registration, login, everything. curl/Postman still "work" in this state, which is exactly why it's easy to miss. |
| `GET /api/drivers/by-user/{userId}` | Without it, a driver logging back in (not right after registering) can never reach their dashboard — the frontend has no way to resolve their `driverId`. |
| `GET /api/drivers/{driverId}/status` | Without it, "Go available" always shows offline again on refresh — the frontend can't read back the real status. |
| `GET /api/trips/by-request/{rideRequestId}` | Without it, a rider who gets matched with a driver never reaches the trip screen — there's no way to resolve the `tripId`. |
| Role/state checks on trip start/complete/cancel | Without it, the app still *runs*, but the driver-only restriction the frontend UI enforces isn't backed up server-side. |

If you only have the frontend folder and not the backend, get the backend folder too
(same repo, same branch/commit) before going further.

### Starting the backend

From the **backend** repo root (not this folder):

```bash
docker compose up -d          # Postgres + RabbitMQ
```

Then, in order — Eureka first, then the seven services (any order among themselves),
then the gateway last, each in its own terminal:

```bash
cd eureka-server && mvn spring-boot:run
```

```bash
cd identity-service && mvn spring-boot:run
cd rider-service && mvn spring-boot:run
cd driver-service && mvn spring-boot:run
cd matching-service && mvn spring-boot:run
cd trip-service && mvn spring-boot:run
cd payment-service && mvn spring-boot:run
cd notification-service && mvn spring-boot:run
```

```bash
cd api-gateway && mvn spring-boot:run
```

Confirm it's all up: Eureka dashboard at `http://localhost:8761` should list all 8
services (7 + gateway), and `http://localhost:8080` should be reachable.

**Optional but recommended:** import `postman/Uthao.postman_collection.json` and run
it (Collection Runner, top to bottom) before touching the frontend at all. It's a
self-contained end-to-end test — register, onboard a driver, match a ride, run the
trip lifecycle, pay, refund — including the exact role/state checks listed above. If
that collection passes, the backend is definitely ready for this frontend.

---

## 3. Set up the frontend

```bash
cd uthao-frontend
npm install
```

Check `.env` (already present in this folder):

```
VITE_API_BASE_URL=http://localhost:8080/api
```

Only edit this if your gateway isn't on `localhost:8080`.

---

## 4. Run it

```bash
npm run dev
```

Open **http://localhost:5173**.

---

## 5. Try the full flow

1. Register once as a **RIDER**, once as a **DRIVER** — two browser windows, or one
   normal + one incognito, since both stay logged in via `localStorage`.
2. As the driver: finish onboarding (profile + vehicle), then toggle **"Go available"**
   — the browser will ask for location permission; allow it.
3. As the rider: **"Request a ride"** → tap a pickup point on the map (or "use current
   location"), tap a drop-off point, then **"Request ride"**.
4. You should land on a trip screen automatically once matched. As the driver, open
   the same trip from your dashboard's trip history and click **"Start trip"**, then
   **"Complete trip"**. As the rider, you'll see the fare and can request a refund.

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Register/login does nothing, browser console shows a CORS error | Backend is older than commit `0d2807e` — no `CorsConfig.java` | Update the backend, restart `api-gateway` |
| Driver dashboard redirects to onboarding every time you log back in | Backend missing `GET /drivers/by-user/{userId}` | Update `driver-service`, restart it |
| "Go available" reverts to offline on refresh | Backend missing `GET /drivers/{driverId}/status` | Update `driver-service`, restart it |
| Rider never leaves the "Finding a driver…" screen after a match | Backend missing `GET /trips/by-request/{rideRequestId}`, or no driver is actually `AVAILABLE` nearby | Update `trip-service`; confirm a driver toggled available within 5km of the pickup point |
| `401 Unauthorized` on everything | Not logged in, or backend JWT secret doesn't match — check `jwt.secret` is identical (`uthao-super-secret-jwt-key-2024-extended-256bit`) across `api-gateway`, `identity-service`, and `trip-service` | Re-login; check backend config |
| `npm run build` fails on a Leaflet import | Dependencies out of sync | `rm -rf node_modules package-lock.json && npm install` |

---

## 7. Verify without running the dev server

```bash
npm run build    # production bundle to dist/ — also catches import/JSX errors
npm run preview  # serve that production build locally
```
