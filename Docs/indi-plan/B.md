# Person B — Eureka Server + Rider Service

**Owns:** `eureka-server` (8761), `rider-service` (8082)  
**Branch:** `feature/rider-eureka`  
**Do not edit:** other service folders (ask the owner + update `Docs/CONTRACTS.md` first)

> Read this after [`Docs/CONTRACTS.md`](../CONTRACTS.md) and the root [`README.md`](../../README.md).  
> Full plan context: [`Docs/Uthao_Development_Plan.md`](../Uthao_Development_Plan.md) § Person B.

---

## What is already done in the repo

You are **not** scaffolding Eureka or Rider from scratch. Both compile and are wired.

### `eureka-server`

| Piece | Status |
|-------|--------|
| `@EnableEurekaServer` app | Done |
| Port 8761, does not register itself | Done |

### `rider-service`

| Piece | Location | Status |
|-------|----------|--------|
| App + Eureka client | `RiderServiceApplication.java` | Done |
| `Rider`, `RideRequest` entities | `model/` | Done |
| Repositories | `RiderRepository`, `RideRequestRepository` | Done |
| Create / list / cancel requests | `RideRequestService` + `RiderController` | Done |
| Publish `ride.requested` to `uthao.events` | `RideRequestService` + `RabbitMQConfig` | Done |
| Config | port 8082, `rider_db`, RabbitMQ | Done |

**Endpoints already present**

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/riders/requests` | status `REQUESTED` + publish event |
| `GET` | `/riders/{riderId}/requests` | list by rider |
| `POST` | `/riders/requests/{requestId}/cancel` | status `CANCELLED` |

---

## Sequential steps (follow in order)

### Step 0 — Setup (15–20 min)

1. Pull the monorepo and create your branch:
   ```bash
   git checkout -b feature/rider-eureka
   ```
2. Start infra:
   ```bash
   docker compose up -d
   ```
3. Confirm `rider_db` exists and RabbitMQ UI is up (http://localhost:15672, `guest`/`guest`).

---

### Step 1 — Bring Eureka up first and keep it running (20–30 min)

Eureka is tiny and **the whole team depends on you**.

1. Open `eureka-server` and skim `EurekaServerApplication` + `application.yml`.
2. Run:
   ```bash
   cd eureka-server
   mvn spring-boot:run
   ```
3. Open http://localhost:8761 — dashboard must load.
4. Leave this process running for the day (or use an IDE run config).

**Acceptance:** Teammates can register their services against `http://localhost:8761/eureka`.

Tell the team in chat: “Eureka is up.”

---

### Step 2 — Walk Rider code (30–40 min)

Read in this order:

1. `model/RideRequest` — fields + statuses (`REQUESTED`, `MATCHED`, `CANCELLED` in design; create uses `REQUESTED`).
2. `RideRequestService.createRequest` — save, then `convertAndSend("uthao.events", "ride.requested", payload)`.
3. `RideRequestService.cancelRequest` / `getRequestsByRider`.
4. `RabbitMQConfig` — topic exchange `uthao.events` + JSON converter.
5. Note: `Rider` entity/repo exist, but there is **no** register-rider REST endpoint yet — ride requests use `riderId` from the client (typically Identity `userId`). That matches the current scaffold; don’t invent matching logic here.

**Rule:** Rider owns rider-side data only. Matching stays in Person C’s service.

---

### Step 3 — Run Rider alone and test REST (45–60 min)

1. With Eureka + Docker up:
   ```bash
   cd rider-service
   mvn spring-boot:run
   ```
2. Confirm Rider appears on the Eureka dashboard.
3. Test **direct** (port 8082), not gateway:

   **Create request**
   ```http
   POST http://localhost:8082/riders/requests
   Content-Type: application/json

   {
     "riderId": 1,
     "pickupLat": 23.8103,
     "pickupLng": 90.4125,
     "dropLat": 23.7808,
     "dropLng": 90.4074
   }
   ```

   **List**
   ```http
   GET http://localhost:8082/riders/1/requests
   ```

   **Cancel**
   ```http
   POST http://localhost:8082/riders/requests/1/cancel
   ```

4. Check `rider_db` → `ride_requests` rows and status changes.

**Acceptance:** CRUD-ish flow works without Gateway.

---

### Step 4 — Verify the `ride.requested` event (30–45 min)

1. Open RabbitMQ UI → Exchanges → `uthao.events`.
2. Create a temporary test queue bound with routing key `ride.requested` (or use the “Publish message” / Get messages tools after binding).
3. Create another ride request from Postman.
4. Confirm a JSON payload with at least: `id`, `riderId`, pickup/drop coords, `status`, `createdAt` (see `CONTRACTS.md`).

If the exchange is missing, check that Rider started cleanly and `RabbitMQConfig` loaded.

**Acceptance:** Publishing works; Person C can optionally consume later (not required for your core demo).

---

### Step 5 — Harden Rider behavior (1–2 h)

Improve **existing** code; don’t rebuild.

Suggested sequential fixes:

1. Cancel only if status is `REQUESTED` (reject cancel of already cancelled / matched if you want clearer demos).
2. Return `404` when `requestId` does not exist (scaffold already does this).
3. Optional: `POST /riders` to create a `Rider` profile row linked to Identity `userId` (entity already exists) — nice for demos, not required by contracts.
4. Optional from the development plan: local “trip history” via listening to `driver.assigned` / `trip.completed` — **only if you finish early**; do not call Trip Service synchronously.
5. Skip `saved_locations` unless you have spare time.

Commit after each working improvement.

---

### Step 6 — Gateway path smoke (with Person A) (30 min)

1. Ensure Person A’s gateway is running.
2. With a JWT from Identity, call:
   ```http
   POST http://localhost:8080/api/riders/requests
   Authorization: Bearer <token>
   ```
3. If `401` → token/gateway issue (Person A).  
   If `503` → Eureka registration (your service name must be `rider-service`).

**Acceptance:** Rider works through `/api/riders/**`.

---

### Step 7 — Postman + docs (20–30 min)

1. Update the **rider-service** folder in `postman/Uthao.postman_collection.json` if paths or sample bodies need tweaks.
2. Do not change event field names without telling Person C / D and updating `CONTRACTS.md`.

---

### Step 8 — Integration window

1. Keep Eureka up for the whole integration call.
2. Help anyone whose service doesn’t appear on the dashboard (common: wrong `spring.application.name`, Eureka not started first).
3. In the end-to-end flow, your step is: after rider is registered (Identity), **create ride request** before matching.
4. Open PR `feature/rider-eureka` → `main`.

---

## Files you should touch

```text
eureka-server/
  src/main/java/com/uthao/eureka/...
  src/main/resources/application.yml
  pom.xml

rider-service/
  src/main/java/com/uthao/rider/...
  src/main/resources/application.yml
  pom.xml
```

Also OK: Postman rider folder; `CONTRACTS.md` only with team agreement.

---

## Done checklist

- [ ] Eureka dashboard stable at `:8761`
- [ ] Rider registers with Eureka
- [ ] Create / list / cancel ride requests work
- [ ] `ride.requested` visible on `uthao.events`
- [ ] Works through gateway `/api/riders/**` with JWT
- [ ] Postman rider requests OK
- [ ] PR opened

---

## Out of scope for you

JWT filter / Identity auth, Driver nearby search, Matching “find driver”, Trip/Payment/Notification listeners, changing shared JWT secret or ports alone.
