# Uthao

Ride-sharing backend built as a Spring Boot microservices monorepo. Each service owns its own PostgreSQL database and talks over REST (via the API Gateway) or RabbitMQ events.

> **Contracts:** Before changing ports, JWT, event names, or DTO shapes, read [`Docs/CONTRACTS.md`](Docs/CONTRACTS.md). That file is the team source of truth.

---

## What’s already scaffolded

| Service | Port | Package | Your job in short |
|---------|------|---------|-------------------|
| `eureka-server` | 8761 | `com.uthao.eureka` | Service discovery |
| `api-gateway` | 8080 | `com.uthao.gateway` | JWT filter + routing |
| `identity-service` | 8081 | `com.uthao.identity` | Register / login / JWT |
| `rider-service` | 8082 | `com.uthao.rider` | Ride requests + `ride.requested` |
| `driver-service` | 8083 | `com.uthao.driver` | Drivers, vehicles, nearby search |
| `matching-service` | 8084 | `com.uthao.matching` | Find driver + `driver.assigned` |
| `trip-service` | 8085 | `com.uthao.trip` | Trip lifecycle + trip events |
| `payment-service` | 8086 | `com.uthao.payment` | Fare + payment / refund |
| `notification-service` | 8087 | `com.uthao.notification` | Event → in-app notifications |

Also included:

- `docker-compose.yml` — Postgres 16 + RabbitMQ (management UI)
- `init-db.sql` — creates one DB per service
- `postman/Uthao.postman_collection.json` — sample requests through the gateway
- `Docs/CONTRACTS.md` — ports, JWT, events, DTOs, Git workflow

Skeleton code compiles. Flesh out behavior in your assigned services; don’t redesign shared contracts without telling the team.

---

## Prerequisites

| Tool | Version |
|------|---------|
| JDK | **21** |
| Maven | **3.9+** |
| Docker Desktop | recent (for Compose) |
| Postman (optional) | for API testing |

Confirm:

```bash
java -version
mvn -version
docker compose version
```

---

## Team assignments & branches

| Person | Owns | Branch | Work in |
|--------|------|--------|---------|
| **A** | Auth + edge | `feature/identity-gateway` | `identity-service`, `api-gateway` |
| **B** | Rider + discovery | `feature/rider-eureka` | `rider-service`, `eureka-server` |
| **C** | Supply + matching | `feature/driver-matching` | `driver-service`, `matching-service` |
| **D** | Trip + pay + alerts | `feature/trip-payment-notification` | `trip-service`, `payment-service`, `notification-service` |

### Git flow

```bash
git checkout main
git pull
git checkout -b feature/<your-branch-name>
# work only in your folders
git add <your-service>/
git commit -m "Describe why, not just what"
git push -u origin HEAD
```

Then open a PR into `main`. Merge **one PR at a time** and fix conflicts together.

**Stay in your lanes.** If you need a change in someone else’s service (new field, event shape), sync with them and update `Docs/CONTRACTS.md` first.

---

## One-time local setup

### 1. Clone and start infrastructure

```bash
git clone <repo-url>
cd Uthao
docker compose up -d
```

Check:

| Thing | URL / check |
|-------|-------------|
| Postgres | `localhost:5432` — user `postgres` / `postgres` |
| RabbitMQ UI | http://localhost:15672 — `guest` / `guest` |

Databases (`identity_db`, `rider_db`, …) are created automatically via `init-db.sql` on first Postgres start.

If DBs are missing (volume already existed without the script):

```bash
docker exec -it uthao-postgres psql -U postgres -f /docker-entrypoint-initdb.d/init-db.sql
```

Or recreate volumes (wipes data):

```bash
docker compose down -v
docker compose up -d
```

### 2. Run services (order matters)

Open each service as its own Maven project (or run from that folder).

**Always start Eureka first**, then business services, then the gateway:

```bash
# Terminal 1 — discovery
cd eureka-server && mvn spring-boot:run

# Then (separate terminals / IDE run configs), any order among these:
cd identity-service && mvn spring-boot:run
cd rider-service && mvn spring-boot:run
cd driver-service && mvn spring-boot:run
cd matching-service && mvn spring-boot:run
cd trip-service && mvn spring-boot:run
cd payment-service && mvn spring-boot:run
cd notification-service && mvn spring-boot:run

# Last — gateway
cd api-gateway && mvn spring-boot:run
```

- Eureka dashboard: http://localhost:8761  
- All client traffic: **http://localhost:8080** (gateway)

You don’t need every service running while building your own — but for end-to-end demos you do.

### 3. Import Postman

1. Open Postman → Import → `postman/Uthao.postman_collection.json`
2. Click **Run collection** (Collection Runner) to fire the whole thing top-to-bottom,
   or click through folders `01` → `07` one request at a time — the collection is one
   ordered end-to-end sequence, not a flat list of examples.
3. Nothing to edit: register requests use `{{$timestamp}}`-suffixed emails so the
   collection is safe to re-run against the same database, and tokens/IDs
   (`riderToken`, `driverToken`, `riderId`, `driverId`, `rideRequestId`, `tripId`,
   `paymentId`) are captured automatically by test scripts into collection variables.
4. One manual step: **"Get Trip By Ride Request"** polls for a trip that trip-service
   creates *asynchronously* off a RabbitMQ event — if it 404s, just click Send again a
   couple of times a second or two apart.
5. The collection also includes negative tests proving driver-only trip actions and
   the cancel-before-start rule (folder `05 - Trip Lifecycle`): a rider gets `403` on
   start/complete, and `409` trying to cancel a trip that's already `ONGOING`.

Base URL is `http://localhost:8080` (gateway). Paths look like `/api/auth/register`, `/api/riders/requests`, etc.

---

## How requests flow

```
Client / Postman
      │
      ▼
api-gateway :8080          JWT required except /api/auth/**
      │  strip /api → lb://service
      ▼
identity | rider | driver | matching | trip | payment | notification
      │
      ├── PostgreSQL (own DB each)
      └── RabbitMQ exchange: uthao.events (topic)
```

**Sync call today:** matching-service → `GET http://localhost:8083/drivers/available?...`

**Events:** see routing keys and payloads in [`Docs/CONTRACTS.md`](Docs/CONTRACTS.md) §4.

---

## Per-person “day one” checklist

### Person A — Identity + Gateway

- [ ] Branch: `feature/identity-gateway`
- [ ] Run Postgres + Eureka + `identity-service` + `api-gateway`
- [ ] Register / login via gateway; confirm JWT in response
- [ ] Call a protected route **without** token → expect `401`
- [ ] Confirm JWT secret matches contracts (`uthao-super-secret-jwt-key-2024-extended-256bit`)
- [ ] Touch: `AuthController`, `AuthService`, `JwtUtil`, `JwtAuthFilter`, `RouteConfig`

### Person B — Rider + Eureka

- [ ] Branch: `feature/rider-eureka`
- [ ] Confirm Eureka starts and other services can register
- [ ] Create / list / cancel ride requests
- [ ] Confirm `ride.requested` appears in RabbitMQ (exchange `uthao.events`)
- [ ] Touch: `RiderController`, `RideRequestService`, `RabbitMQConfig`

### Person C — Driver + Matching

- [ ] Branch: `feature/driver-matching`
- [ ] Register driver → add vehicle → `PATCH` status to `AVAILABLE`
- [ ] `GET /api/drivers/available?lat=...&lng=...`
- [ ] `POST /api/matching/find-driver` → expect `MATCHED` or `NO_DRIVER_FOUND`
- [ ] Confirm `driver.assigned` is published when matched
- [ ] Touch: `DriverService`, `MatchingService`, nearby-distance logic

### Person D — Trip + Payment + Notification

- [ ] Branch: `feature/trip-payment-notification`
- [ ] After a match, confirm a trip row is created (listener on `driver.assigned`)
- [ ] Start → complete trip; confirm `trip.completed` → payment row
- [ ] Confirm notifications + console logs for assigned / completed / payment / cancelled
- [ ] Touch: listeners, `TripService`, `PaymentService` fare math, `NotificationListener`

---

## Shared rules (don’t break these)

| Rule | Value |
|------|--------|
| Java / Boot | Java 21, Spring Boot **3.2.5** |
| Build | Maven per service (`pom.xml` in each folder) |
| Auth header | `Authorization: Bearer <token>` |
| JWT secret | `uthao-super-secret-jwt-key-2024-extended-256bit` (no expiry in this phase) |
| Exchange | `uthao.events` (topic) |
| DB DDL | `spring.jpa.hibernate.ddl-auto=update` |
| Out of scope | WebSocket, live tracking, rating service, frontend |

Full tables: ports, DBs, events, DTO JSON → [`Docs/CONTRACTS.md`](Docs/CONTRACTS.md).

---

## Smoke test (full path)

Use when integrating / before merge (also in CONTRACTS §9):

1. `docker compose up -d`
2. Start Eureka → all 7 services → gateway
3. Register rider + driver (identity)
4. Register driver profile + vehicle; set status `AVAILABLE`
5. Rider creates ride request
6. Call matching `find-driver`
7. Trip appears in `trip_db`
8. Start trip → complete trip
9. Payment in `payment_db`; notifications in DB + service logs

---

## Project layout

```
Uthao/
├── Docs/
│   ├── CONTRACTS.md          ← team agreements
│   └── init.md               ← original scaffold spec
├── postman/
│   └── Uthao.postman_collection.json
├── docker-compose.yml
├── init-db.sql
├── eureka-server/
├── api-gateway/
├── identity-service/
├── rider-service/
├── driver-service/
├── matching-service/
├── trip-service/
├── payment-service/
└── notification-service/
```

Each service:

```
<service>/
├── pom.xml
└── src/main/
    ├── java/com/uthao/<pkg>/...
    └── resources/application.yml
```

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| Service won’t start / DB error | Is Docker Compose up? Is the DB name correct in `application.yml`? |
| Gateway `401` | Missing/invalid token; login again and set Postman `token` |
| Gateway `503` / can’t route | Is Eureka up? Is the target service registered at http://localhost:8761? |
| Matching finds no drivers | Driver status must be `AVAILABLE` and lat/lng within radius |
| Events not received | RabbitMQ up? Queue/binding declared in that service’s `RabbitMQConfig`? |
| Port already in use | Stop the other process or change only with team agreement |

---

## Useful links (local)

| Resource | URL |
|----------|-----|
| API Gateway | http://localhost:8080 |
| Eureka | http://localhost:8761 |
| RabbitMQ Management | http://localhost:15672 |

Questions about shared contracts → update `Docs/CONTRACTS.md` with the whole team, then code.
