# Uthao — IntelliJ Setup, Eureka, Database & Postman Testing

This guide covers opening the monorepo in IntelliJ, running every microservice, verifying Eureka and PostgreSQL, and testing the full flow with Postman (including RabbitMQ event side effects).

---

## Prerequisites

| Tool | Version / notes |
|------|-----------------|
| JDK | **21** (Temurin/OpenJDK) |
| IntelliJ IDEA | Community or Ultimate |
| Docker Desktop | For Postgres + RabbitMQ |
| Postman | For API testing |
| Maven | Bundled with IntelliJ is fine (`mvnw` not required; each service has its own `pom.xml`) |

Confirm in a terminal:

```bash
java -version          # should show 21
docker compose version
```

---

## 1. Open the project and set up IntelliJ

### 1.1 Open the repo

1. Start **IntelliJ IDEA**.
2. **File → Open…**
3. Select the repo root folder: `Uthao` (the folder that contains `docker-compose.yml`, `eureka-server/`, `api-gateway/`, etc.).
4. Click **OK** / **Open**.
5. When prompted, choose **Open as Project** (not “Attach”).
6. Wait for IntelliJ to index. If it asks to **Load Maven projects**, accept / click **Import**.

You should see modules such as:

- `eureka-server`
- `api-gateway`
- `identity-service`
- `rider-service`
- `driver-service`
- `matching-service`
- `trip-service`
- `payment-service`
- `notification-service`

### 1.2 Configure JDK 21

1. **File → Project Structure…** (or `Ctrl+Alt+Shift+S`).
2. Under **Project**:
   - **SDK:** Java 21
   - **Language level:** 21
3. Under **Modules**, ensure each service module uses the same SDK.
4. Apply → OK.

### 1.3 Enable annotation processing (Lombok)

1. **Settings → Build, Execution, Deployment → Compiler → Annotation Processors**
2. Check **Enable annotation processing**.
3. Install the **Lombok** plugin if IntelliJ prompts for it (**Settings → Plugins → Lombok**).

### 1.4 Start infrastructure (Postgres + RabbitMQ)

From the repo root in a terminal (or IntelliJ’s Terminal tool window):

```bash
docker compose up -d
```

Verify:

| Service | Check |
|---------|--------|
| PostgreSQL | `localhost:5433` — user `postgres` / password `postgres` |
| RabbitMQ Management UI | http://localhost:15672 — `guest` / `guest` |

Databases are created by `init-db.sql` on first Postgres start:

- `identity_db`, `rider_db`, `driver_db`, `matching_db`, `trip_db`, `payment_db`, `notification_db`

If databases are missing (volume already existed without the script):

```bash
docker compose down -v
docker compose up -d
```

Leave Docker running while you develop and test.

### 1.5 Create Run Configurations for each service

Each service is a normal Spring Boot app. For every folder below, find the main class and create a run config:

| Folder | Main class (approx.) | Port |
|--------|----------------------|------|
| `eureka-server` | `…EurekaServerApplication` | 8761 |
| `identity-service` | `…IdentityServiceApplication` | 8081 |
| `rider-service` | `…RiderServiceApplication` | 8082 |
| `driver-service` | `…DriverServiceApplication` | 8083 |
| `matching-service` | `…MatchingServiceApplication` | 8084 |
| `trip-service` | `…TripApplication` / `TripServiceApplication` | 8085 |
| `payment-service` | `…PaymentServiceApplication` | 8086 |
| `notification-service` | `…NotificationServiceApplication` | 8087 |
| `api-gateway` | `…GatewayApplication` | 8080 |

**How to create one run config:**

1. In the Project tree, open the `*Application.java` file for that service.
2. Click the green ▶ next to `public static void main`, or right-click → **Run**.
3. IntelliJ creates a Spring Boot run configuration. Rename it to the service name (e.g. `eureka-server`).
4. Repeat for all 9 apps.

**Optional — Compound configuration (recommended):**

1. **Run → Edit Configurations…**
2. **+ → Compound**
3. Name it `Uthao — All Services`
4. Add all 9 configs.
5. Start **eureka-server first** manually once, then use the compound — or always start Eureka alone before the rest.

### 1.6 Startup order (important)

```text
1. docker compose up -d          # Postgres + RabbitMQ
2. eureka-server                 # MUST be first
3. identity, rider, driver, matching, trip, payment, notification   # any order
4. api-gateway                   # LAST
```

Wait until Eureka shows services registered before starting the gateway (or restart the gateway if it started too early).

---

## 2. How to test the Eureka server

### 2.1 Start Eureka only

1. Run the `eureka-server` configuration.
2. Wait for the console to show the app started on port **8761**.
3. Open a browser: **http://localhost:8761**

You should see the Eureka dashboard. At first the **Instances currently registered** list may be empty — that is normal.

### 2.2 Register the other services

1. Start each business service (`identity-service` … `notification-service`).
2. Refresh http://localhost:8761 every few seconds.
3. Confirm these application names appear (names come from `spring.application.name` in each `application.yml`):

| Expected name |
|---------------|
| `IDENTITY-SERVICE` |
| `RIDER-SERVICE` |
| `DRIVER-SERVICE` |
| `MATCHING-SERVICE` |
| `TRIP-SERVICE` |
| `PAYMENT-SERVICE` |
| `NOTIFICATION-SERVICE` |
| `API-GATEWAY` (after you start the gateway) |

Status should be **UP**.

### 2.3 What “Eureka works” means for this project

- Clients call **http://localhost:8080** (API Gateway).
- Gateway routes use Eureka service discovery, e.g. `lb://identity-service`.
- If a service is **not** registered, Postman through the gateway often returns **503 Service Unavailable** for that path.

**Quick Eureka failure test:**

1. Stop `rider-service` in IntelliJ.
2. Wait until it disappears from the Eureka dashboard.
3. Call any `/api/riders/**` request via the gateway → expect **503** (or similar routing failure).
4. Start `rider-service` again → it reappears on Eureka → same request should work.

---

## 3. How to test that database operations are happening

Each service owns **one** Postgres database. Writes happen when you hit APIs (or when RabbitMQ listeners create rows).

### 3.1 Option A — Watch SQL in the IntelliJ console

Most services have:

```yaml
spring.jpa.hibernate.ddl-auto: update
spring.jpa.show-sql: true
```

When you call an endpoint that saves data, the service’s Run console should print SQL such as `insert into …` / `update …` / `select …`.

Example:

- Register a user → watch **identity-service** console for inserts into `users`.
- Create a ride request → watch **rider-service** for inserts into `ride_requests`.
- Complete a trip → watch **payment-service** for an insert into `payments` (triggered by RabbitMQ, not by a direct Postman POST).

### 3.2 Option B — Query Postgres with Docker / psql

List databases:

```bash
docker exec -it uthao-postgres psql -U postgres -c "\l"
```

Connect to a specific DB and list tables / rows:

```bash
# Identity users
docker exec -it uthao-postgres psql -U postgres -d identity_db -c "SELECT id, email, role FROM users;"

# Ride requests
docker exec -it uthao-postgres psql -U postgres -d rider_db -c "SELECT * FROM ride_requests;"

# Drivers / status
docker exec -it uthao-postgres psql -U postgres -d driver_db -c "SELECT * FROM drivers;"
docker exec -it uthao-postgres psql -U postgres -d driver_db -c "SELECT * FROM driver_status;"

# Matches
docker exec -it uthao-postgres psql -U postgres -d matching_db -c "SELECT * FROM match_requests;"
docker exec -it uthao-postgres psql -U postgres -d matching_db -c "SELECT * FROM match_history;"

# Trips
docker exec -it uthao-postgres psql -U postgres -d trip_db -c "SELECT id, status, rider_id, driver_id, fare FROM trips;"
docker exec -it uthao-postgres psql -U postgres -d trip_db -c "SELECT * FROM trip_status_history;"

# Payments
docker exec -it uthao-postgres psql -U postgres -d payment_db -c "SELECT * FROM payments;"

# Notifications
docker exec -it uthao-postgres psql -U postgres -d notification_db -c "SELECT * FROM notifications;"
```

### 3.3 Option C — IntelliJ Database tool window (optional)

1. **View → Tool Windows → Database**
2. **+ → Data Source → PostgreSQL**
3. Host `localhost`, port `5432`, user `postgres`, password `postgres`
4. Add each database (`identity_db`, …) as needed
5. After Postman calls, refresh tables and inspect rows

### 3.4 Suggested DB checks mapped to API steps

| After this Postman action | Look in DB | Expect |
|---------------------------|------------|--------|
| Register rider / driver | `identity_db.users` | New rows; password hashed (not plaintext) |
| Register driver profile + vehicle | `driver_db.drivers`, `vehicles` | New rows |
| Driver → AVAILABLE | `driver_db.driver_status` | `status = AVAILABLE`, lat/lng set |
| Create ride request | `rider_db.ride_requests` | `status = REQUESTED` |
| Find driver (matched) | `matching_db.match_requests`, `match_history` | `MATCHED` + history row |
| Trip created (async) | `trip_db.trips` | `status = MATCHED` |
| Start / complete trip | `trip_db.trips`, `trip_status_history` | `ONGOING` then `COMPLETED` |
| After complete | `payment_db.payments` | New payment `SUCCESS` |
| After match / complete / pay | `notification_db.notifications` | Several rows for the rider (and often driver on match) |

### 3.5 Confirm RabbitMQ is driving some DB writes

Some DB rows are **not** created by a direct REST call:

| Event | Publisher | Consumer that writes DB |
|-------|-----------|-------------------------|
| `driver.assigned` | matching-service | trip-service (creates trip), driver-service (driver trip history), notification-service |
| `trip.completed` | trip-service | payment-service (creates payment), notification-service |
| `payment.completed` | payment-service | notification-service |
| `trip.cancelled` | trip-service | notification-service |

**How to verify RabbitMQ:**

1. Open http://localhost:15672 → login `guest` / `guest`
2. **Exchanges → `uthao.events`**
3. After Find Driver / Complete Trip, check **Queues** for message activity (e.g. `trip.driver-assigned.queue`, `payment.trip-completed.queue`)
4. Also watch consumer service consoles for log lines like `received driver.assigned` / `received trip.completed`

---

## 4. How to test using Postman

### 4.1 Import the collection

1. Open Postman.
2. **Import** → choose `postman/Uthao.postman_collection.json`
3. Confirm collection variable `baseUrl` = `http://localhost:8080`  
   (all traffic goes through the **API Gateway**, which uses Eureka)

### 4.2 Before you click Send

Checklist:

- [ ] `docker compose up -d` is running
- [ ] Eureka dashboard open and healthy: http://localhost:8761
- [ ] All 7 business services registered
- [ ] `api-gateway` running on port 8080

### 4.3 Run order (do not skip folders)

The collection is one **end-to-end sequence**. Run top to bottom:

| Folder | Purpose |
|--------|---------|
| `01 - Identity` | Register rider + driver, get JWTs |
| `02 - Driver Onboarding` | Driver profile + vehicle |
| `03 - Driver Goes Available` | Status → AVAILABLE |
| `04 - Rider Requests a Ride` | Ride request + matching |
| `05 - Trip Lifecycle` | Poll trip, start, complete (plus negative tests) |
| `06 - Payment` | Read payment created by Rabbit listener |
| `07 - Notifications` | Read notification rows |

**Collection Runner (recommended):**

1. Click the collection → **Run**
2. Keep request order as-is
3. Run

Tokens and IDs (`riderToken`, `driverToken`, `riderId`, `driverId`, `rideRequestId`, `tripId`, `paymentId`, …) are saved automatically by test scripts. You normally do **not** edit JSON bodies between requests.

### 4.4 Important async step

After **Find Driver**:

- Matching publishes `driver.assigned` over RabbitMQ
- Trip-service creates the trip **asynchronously**

So **Get Trip By Ride Request** may return **404** once or twice. Wait 1–2 seconds and click **Send** again until you get **200**.

### 4.5 Auth header behavior

- `/api/auth/**` — no token required
- Everything else — `Authorization: Bearer <token>`
- Start / complete trip must use the **driver** token (rider gets **403** — covered by negative tests in folder `05`)

### 4.6 Manual smoke (if you prefer clicking one by one)

Base: `http://localhost:8080`

1. `POST /api/auth/register` — role `RIDER` → save token / userId  
2. `POST /api/auth/register` — role `DRIVER` → save token / userId  
3. `POST /api/drivers` — body includes `userId` from driver register  
4. `POST /api/drivers/{driverId}/vehicles`  
5. `PATCH /api/drivers/{driverId}/status` — `AVAILABLE` with lat/lng near `23.8103`, `90.4125`  
6. `POST /api/riders/requests` — pickup/drop coords near the same area  
7. `POST /api/matching/find-driver` — expect `MATCHED` or `NO_DRIVER_FOUND`  
8. Poll `GET /api/trips/by-request/{rideRequestId}` until 200  
9. Driver token: `POST /api/trips/{tripId}/start` then `/complete`  
10. `GET /api/payments/trip/{tripId}`  
11. `GET /api/notifications/user/{riderId}`

### 4.7 Expected success signals

| Check | Healthy result |
|-------|----------------|
| Register | `201` + JWT in body |
| Protected route without token | `401` from gateway |
| Find driver (driver online nearby) | `MATCHED` + driver fields |
| Find driver (none available) | `NO_DRIVER_FOUND` (not a 500) |
| Trip after match | Row in `trip_db`, status `MATCHED` |
| Complete trip | Payment row appears; notifications grow |
| Eureka | All services UP |
| RabbitMQ | Messages on `uthao.events`, queues not stuck unacked |

---

## 5. Troubleshooting

| Problem | What to try |
|---------|-------------|
| Service won’t start / DB error | Is Docker up? Correct DB name in that service’s `application.yml`? |
| Port already in use | Stop the other IntelliJ run config or process using 808x / 8761 |
| Eureka empty | Service started before Eureka — restart that service |
| Gateway `503` | Target service not registered at http://localhost:8761 |
| Gateway `401` | Missing/invalid Bearer token; re-login / re-run Identity folder |
| Matching finds no drivers | Status must be `AVAILABLE`; lat/lng within radius (~5 km) |
| Trip 404 after match | Wait and retry; confirm RabbitMQ is up and trip-service is running |
| No payment after complete | Check trip-service published `trip.completed`; payment-service logs / `payment_db` |
| Lombok / compile errors | Enable annotation processing; install Lombok plugin; JDK 21 |

---

## 6. Useful local URLs

| Resource | URL |
|----------|-----|
| API Gateway (Postman base) | http://localhost:8080 |
| Eureka Dashboard | http://localhost:8761 |
| RabbitMQ Management | http://localhost:15672 |
| Contracts (ports, JWT, events) | `Docs/CONTRACTS.md` |

---

## Quick start (cheat sheet)

```text
1. docker compose up -d
2. IntelliJ: run eureka-server
3. Open http://localhost:8761
4. Run all 7 *-service apps → confirm registered on Eureka
5. Run api-gateway
6. Postman: import postman/Uthao.postman_collection.json
7. Run collection 01 → 07 (retry Get Trip if 404)
8. Optional: psql / Database tool to confirm rows; RabbitMQ UI for events
```
