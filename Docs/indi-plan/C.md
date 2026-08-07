# Person C — Driver Service + Matching Service

**Owns:** `driver-service` (8083), `matching-service` (8084)  
**Branch:** `feature/driver-matching`  
**Do not edit:** other service folders (ask the owner + update `Docs/CONTRACTS.md` first)

> Read this after [`Docs/CONTRACTS.md`](../CONTRACTS.md) and the root [`README.md`](../../README.md).  
> Full plan context: [`Docs/Uthao_Development_Plan.md`](../Uthao_Development_Plan.md) § Person C.

---

## What is already done in the repo

Both services are scaffolded and compile. Matching already calls Driver over HTTP and publishes `driver.assigned`.

### `driver-service`

| Piece | Status |
|-------|--------|
| `Driver`, `Vehicle`, `DriverStatus` entities | Done |
| Register driver, add vehicle, update status, get by id | Done |
| `GET /drivers/available?lat=&lng=&radiusKm=` (Euclidean ≈ km) | Done |
| Sorted nearest-first `NearbyDriverDto` list | Done |
| Port 8083, `driver_db`, Eureka client | Done |

### `matching-service`

| Piece | Status |
|-------|--------|
| `MatchRequest`, `MatchHistory` entities | Done |
| `POST /matching/find-driver` | Done |
| `RestTemplate` call to `http://localhost:8083/drivers/available?...` | Done |
| `NO_DRIVER_FOUND` vs `MATCHED` paths | Done |
| Publish `driver.assigned` to `uthao.events` (includes pickup/drop for Trip) | Done |
| Port 8084, `matching_db`, RabbitMQ | Done |

**Important contract:** Person D’s trip listener expects `driver.assigned` with at least `rideRequestId`, `riderId`, `driverId`, `driverName`, `eta` (scaffold also sends lat/lng — keep them).

---

## Sequential steps (follow in order)

### Step 0 — Setup (15–20 min)

1. Branch:
   ```bash
   git checkout -b feature/driver-matching
   ```
2. `docker compose up -d` (need Postgres + RabbitMQ).
3. Confirm Eureka is running (Person B) before you expect service registration.

---

### Step 1 — Driver first: walk the code (30–40 min)

Read in order:

1. `DriverController` — all endpoints.
2. `DriverService.updateStatus` — upserts `DriverStatus`.
3. `DriverService.getNearbyAvailableDrivers` — filters `AVAILABLE`, distance `sqrt(Δlat²+Δlng²)` vs `radiusKm/111`, sorts by km.
4. Status values you will use in demos: `OFFLINE`, `AVAILABLE`, `BUSY`.

**Acceptance:** You can explain why a driver outside the radius never appears.

---

### Step 2 — Test Driver alone in Postman (45–60 min)

Run:

```bash
cd driver-service && mvn spring-boot:run
```

Use **direct** port 8083:

1. **Register driver**
   ```http
   POST http://localhost:8083/drivers
   {
     "userId": 2,
     "name": "Karim Driver",
     "email": "karim@example.com",
     "phone": "01700000000",
     "licenseNumber": "LIC-001"
   }
   ```
2. **Add vehicle**
   ```http
   POST http://localhost:8083/drivers/1/vehicles
   {
     "make": "Toyota",
     "model": "Corolla",
     "plateNumber": "DHA-1234",
     "color": "White"
   }
   ```
3. **Go AVAILABLE near Dhaka coords**
   ```http
   PATCH http://localhost:8083/drivers/1/status
   {
     "status": "AVAILABLE",
     "currentLat": 23.8110,
     "currentLng": 90.4130
   }
   ```
4. **Nearby search**
   ```http
   GET http://localhost:8083/drivers/available?lat=23.8103&lng=90.4125&radiusKm=5
   ```
5. Negative check: set status `OFFLINE` or move far away → list empty.

**Acceptance:** Available endpoint returns plate + distance; empty when offline.

---

### Step 3 — Harden Driver (1–1.5 h, as needed)

Sequential improvements if Step 2 shows gaps:

1. Reject unknown status strings; normalize to uppercase.
2. Ensure vehicle plate is returned for nearby DTOs (scaffold uses `findFirstByDriverId`).
3. Optional: mark driver `BUSY` helper — not required if Matching/Trip don’t call it yet.
4. Skip file-upload `documents` table (plan says enum/status only if needed).
5. Do **not** add real PostGIS / Haversine unless you finish everything else.

---

### Step 4 — Walk Matching code (30–40 min)

1. `MatchingController` → `findDriver`.
2. `MatchingService.findDriver`:
   - Calls Driver available API.
   - Empty → save `MatchRequest` with `NO_DRIVER_FOUND`, return that status.
   - Else take index `0` (nearest), save `MATCHED` + `MatchHistory`, publish `driver.assigned`.
3. `AppConfig` `RestTemplate` bean.
4. `RabbitMQConfig` exchange bean.

Note: call is currently **hardcoded** to `localhost:8083` (fine for solo day; Eureka `lb://` is optional stretch).

---

### Step 5 — Test Matching against your Driver (45–60 min)

With Driver still running:

```bash
cd matching-service && mvn spring-boot:run
```

1. With a driver AVAILABLE nearby:
   ```http
   POST http://localhost:8084/matching/find-driver
   {
     "rideRequestId": 1,
     "riderId": 1,
     "pickupLat": 23.8103,
     "pickupLng": 90.4125,
     "dropLat": 23.7808,
     "dropLng": 90.4074
   }
   ```
   Expect `status: MATCHED`, `driverId`, `vehiclePlate`, `eta: "5 mins"`.

2. With no available drivers → `NO_DRIVER_FOUND` (must not 500).

3. Check `matching_db` tables `match_requests` / `match_history`.

4. In RabbitMQ UI, confirm message on routing key `driver.assigned` (bind a temporary queue if needed). Payload should include fields Person D needs.

**Acceptance:** Happy path + empty path both return clean JSON; event published on match.

---

### Step 6 — Coordinate event payload with Person D (15–20 min)

Before changing field names:

1. Open `Docs/CONTRACTS.md` § events.
2. Confirm your published map still has: `rideRequestId`, `riderId`, `driverId`, `driverName`, `eta`.
3. Keep `pickupLat` / `pickupLng` / `dropLat` / `dropLng` if present — Trip uses them for later fare/distance.
4. If you rename anything, update CONTRACTS **and** tell Person D in the same message.

---

### Step 7 — Gateway smoke (with Person A) (20–30 min)

```http
PATCH http://localhost:8080/api/drivers/1/status
Authorization: Bearer <token>

POST http://localhost:8080/api/matching/find-driver
Authorization: Bearer <token>
```

Fix only your services if routing works but business logic fails.

---

### Step 8 — End-to-end slice you own (30–45 min)

Practice this mini-flow alone (no Trip required):

1. Register driver + vehicle  
2. Status `AVAILABLE`  
3. `find-driver` → `MATCHED`  
4. Event visible in RabbitMQ  

When Person D is ready, they should see a trip created automatically from your event.

---

### Step 9 — Postman + PR

1. Update **driver-service** and **matching-service** folders in the shared Postman collection.
2. Open PR `feature/driver-matching` → `main`.

---

## Files you should touch

```text
driver-service/
  src/main/java/com/uthao/driver/...
  src/main/resources/application.yml
  pom.xml

matching-service/
  src/main/java/com/uthao/matching/...
  src/main/resources/application.yml
  pom.xml
```

---

## Done checklist

- [ ] Driver register / vehicle / status work
- [ ] Nearby available returns nearest drivers only
- [ ] Matching returns `MATCHED` or `NO_DRIVER_FOUND`
- [ ] `driver.assigned` published with contract fields
- [ ] Works through gateway with JWT
- [ ] Postman folders updated
- [ ] PR opened

---

## Out of scope for you

JWT issuance, Eureka server code, Rider cancel logic, Trip start/complete, Payment fare math, Notification listeners. Do not put matching algorithms inside Driver beyond “available near.”
