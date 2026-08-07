# Person D — Trip + Payment + Notification

**Owns:** `trip-service` (8085), `payment-service` (8086), `notification-service` (8087)  
**Branch:** `feature/trip-payment-notification`  
**Do not edit:** other service folders (ask the owner + update `Docs/CONTRACTS.md` first)

> Read this after [`Docs/CONTRACTS.md`](../CONTRACTS.md) and the root [`README.md`](../../README.md).  
> Full plan context: [`Docs/Uthao_Development_Plan.md`](../Uthao_Development_Plan.md) § Person D.

You own the **most moving parts**. Build and self-test Trip **in isolation first** so you are never blocked waiting on Matching.

---

## What is already done in the repo

All three services compile with listeners, publishers, and REST already wired.

### `trip-service`

| Piece | Status |
|-------|--------|
| `Trip`, `TripStatusHistory` | Done |
| Listener on `trip.driver-assigned.queue` → `createTrip` (`MATCHED`) | Done |
| `GET /trips/{id}`, start → `ONGOING`, complete → `COMPLETED`, cancel → `CANCELLED` | Done |
| On complete: publish `trip.completed` (fare `0.0` for Payment to calculate) | Done |
| On cancel: publish `trip.cancelled` | Done |
| Rabbit bindings for `driver.assigned` | Done |

### `payment-service`

| Piece | Status |
|-------|--------|
| `Payment`, `Refund` | Done |
| Listener on `payment.trip-completed.queue` → `processPayment` | Done |
| Fare: base `50` + `15` per km (Euclidean × 111) | Done |
| Publish `payment.completed` | Done |
| `GET /payments/trip/{tripId}`, `POST /payments/{id}/refund` | Done |

### `notification-service`

| Piece | Status |
|-------|--------|
| `Notification` entity + repo | Done |
| Listeners: `driver.assigned`, `trip.completed`, `payment.completed`, `trip.cancelled` | Done |
| Console `println` per event + DB rows | Done |
| `GET /notifications/user/{userId}`, `PATCH /notifications/{id}/read` | Done |

**Status flow you must preserve:** `MATCHED` → `ONGOING` → `COMPLETED`, or `CANCELLED`.

---

## Sequential steps (follow in order)

### Step 0 — Setup (15–20 min)

1. Branch:
   ```bash
   git checkout -b feature/trip-payment-notification
   ```
2. `docker compose up -d`.
3. Need Eureka (Person B) when registering; RabbitMQ is critical for you.

---

### Step 1 — Trip first: walk the code (40–50 min)

Read:

1. `config/RabbitMQConfig` — queue `trip.driver-assigned.queue` bound to `driver.assigned`.
2. `listener/TripEventListener` — receives `Map`, calls `createTrip`.
3. `TripService.createTrip` — builds trip from event fields (including lat/lng if present).
4. `startTrip` / `completeTrip` / `cancelTrip` — history rows + events.
5. `TripController` — manual triggers for Postman (stand-in for a driver app).

**Acceptance:** You know which event field becomes which Trip column.

---

### Step 2 — Isolate Trip without Matching (1–1.5 h)

Do **not** wait for Person C. Simulate `driver.assigned` yourself.

1. Start Trip:
   ```bash
   cd trip-service && mvn spring-boot:run
   ```
2. Publish a fake message (RabbitMQ UI → Exchanges → `uthao.events` → Publish message):

   - Routing key: `driver.assigned`
   - Payload (JSON):
   ```json
   {
     "rideRequestId": 1,
     "riderId": 1,
     "driverId": 2,
     "driverName": "Karim",
     "eta": "5 mins",
     "pickupLat": 23.8103,
     "pickupLng": 90.4125,
     "dropLat": 23.7808,
     "dropLng": 90.4074
   }
   ```
3. Confirm Trip console log + new row in `trip_db.trips` with status `MATCHED`.
4. Drive the lifecycle with HTTP:
   ```http
   GET  http://localhost:8085/trips/1
   POST http://localhost:8085/trips/1/start
   POST http://localhost:8085/trips/1/complete
   ```
5. Confirm `trip.completed` appears on the exchange.

**Optional helper (only if UI publishing is painful):** temporary `POST /trips/debug/from-assignment` that calls `createTrip` with a body — remove or leave clearly marked before final demo.

**Acceptance:** Full trip lifecycle works with zero dependency on Matching.

---

### Step 3 — Harden Trip (45–60 min)

1. Guard invalid transitions (e.g. complete only if `ONGOING`) if demos get confusing.
2. Ensure cancel publishes `trip.cancelled` and writes history.
3. Keep complete payload fare at `0.0` (Payment recalculates) unless team agrees otherwise.
4. Include lat/lng on `trip.completed` if Payment needs them (scaffold already does).

---

### Step 4 — Payment: walk + isolate test (1–1.5 h)

1. Read `PaymentEventListener`, `PaymentService.processPayment`, fare constants.
2. Start Payment while Trip is running:
   ```bash
   cd payment-service && mvn spring-boot:run
   ```
3. Complete a trip again (Step 2). Payment should:
   - Insert `payments` row with `SUCCESS`
   - Publish `payment.completed`
4. Verify:
   ```http
   GET http://localhost:8086/payments/trip/1
   ```
5. Test refund:
   ```http
   POST http://localhost:8086/payments/1/refund
   { "reason": "Demo refund" }
   ```
   Status becomes `REFUNDED`.

**Acceptance:** Completing a trip auto-creates a payment without calling Payment manually.

---

### Step 5 — Notification last (45–60 min)

1. Start Notification:
   ```bash
   cd notification-service && mvn spring-boot:run
   ```
2. Re-run your isolated flow (fake `driver.assigned` → start → complete).
3. Watch console prints for each event.
4. Query:
   ```http
   GET http://localhost:8087/notifications/user/1
   ```
5. Mark read:
   ```http
   PATCH http://localhost:8087/notifications/1/read
   ```
6. Also test cancel path: create trip → `POST /trips/{id}/cancel` → cancelled notification.

**Acceptance:** DB + logs show assigned / completed / payment / cancelled messages. This is your “proof it works” demo surface.

---

### Step 6 — Wire-check with Person C (30–45 min)

When Matching is ready:

1. Keep Trip + Payment + Notification running.
2. Ask C to run find-driver with an AVAILABLE driver.
3. Confirm Trip auto-creates **without** you publishing manually.
4. Continue start → complete → payment → notifications.

If the event arrives but Trip fails to parse fields, fix mapping in **your** listener/service or agree a contract change with C.

---

### Step 7 — Gateway smoke (with Person A) (20–30 min)

```http
GET  http://localhost:8080/api/trips/1
POST http://localhost:8080/api/trips/1/start
POST http://localhost:8080/api/trips/1/complete
GET  http://localhost:8080/api/payments/trip/1
GET  http://localhost:8080/api/notifications/user/1
Authorization: Bearer <token>
```

---

### Step 8 — Integration checklist (your sections)

During the team merge call, you verify:

1. After matching → trip row exists (`MATCHED`).
2. Start / complete via Postman.
3. Payment row auto-created.
4. Notification rows + console logs for each step.
5. RabbitMQ shows no stuck unacked messages on your queues.

Then open PR `feature/trip-payment-notification` → `main`.

---

### Stretch (only if early)

From the development plan:

- Optional Rating Service (separate small service) — **not** in current scaffold; discuss with team before adding.
- Fake 10% payment failure for “handles failure” talk — nice demo, not required.
- Extract `FareCalculator` class from `PaymentService` for clearer structure.

---

## Files you should touch

```text
trip-service/
payment-service/
notification-service/
```

Each: `src/main/java/com/uthao/...`, `application.yml`, `pom.xml` if needed.  
Postman folders for trips / payments / notifications are yours to keep accurate.

---

## Suggested run order on your machine (solo day)

```text
1. docker compose up -d
2. eureka-server          (team / Person B)
3. trip-service
4. payment-service
5. notification-service
```

Add Matching later for the real event; until then use RabbitMQ UI publish.

---

## Done checklist

- [ ] Trip creates from `driver.assigned` (fake + real)
- [ ] Start / complete / cancel work + history rows
- [ ] `trip.completed` / `trip.cancelled` published
- [ ] Payment auto-processes with sensible fare
- [ ] Refund works
- [ ] Notifications for all four event types + console logs
- [ ] Gateway paths work with JWT
- [ ] Postman updated
- [ ] PR opened

---

## Out of scope for you

Identity/JWT secret changes, Gateway filters, Eureka server, Rider request APIs, Driver nearby math, Matching pick-driver algorithm. Consume their events/APIs; don’t rewrite them.
