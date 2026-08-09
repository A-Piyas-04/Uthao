# Uthao — Codebase Guide (Plain-Language Walkthrough)

This document explains **what Uthao is, how it is built, and what every part of the code does** —
written so that someone who has never seen the project before can read it top to bottom and
understand the whole system. It complements (doesn't replace) [`CONTRACTS.md`](CONTRACTS.md)
(the exact ports/JSON/event names) and [`Uthao_Development_Plan.md`](Uthao_Development_Plan.md)
(the original sprint plan).

---

## 1. What is this project, in one paragraph

Uthao is a **ride-sharing backend** — the server-side system behind an app like Uber/Pathao,
minus the mobile app itself. A rider asks for a ride, the system finds a nearby driver, a trip
happens, the rider pays, and everyone gets notified along the way. It was built in a single day
by a 4-person student team, so it is intentionally simplified: no live GPS tracking, no real
payment processor, no map service — just enough real logic to prove the architecture works.

It is built as **9 small independent programs ("microservices")** instead of one big program.
Each one does one job, has its own database, and talks to the others over the network instead of
by calling functions directly.

---

## 2. Why microservices — the mental model

Think of it like a restaurant split into separate stations instead of one cook doing everything:
a host at the door (gateway), an ID-checker (identity), an order-taker (rider), a dispatcher
(matching), a kitchen (trip), a cashier (payment), a waiter shouting order updates
(notification). Each station only knows its own job. They pass notes to each other instead of
sharing one big clipboard.

**Why split it up?**
- Four people could build four pieces in parallel without stepping on each other's code.
- Each service can be understood, tested, and restarted on its own.
- It mirrors how real ride-sharing companies are actually built.

**The trade-off:** more moving parts to run and more places where things can fail — which is why
this project deliberately keeps every service dumb and simple (see §9, Known Limitations).

---

## 3. The 9 building blocks

| # | Service | Port | What it's responsible for |
|---|---------|------|----------------------------|
| 1 | `eureka-server` | 8761 | The "phone book" — every other service registers here so the others can find it by name instead of a hardcoded address. |
| 2 | `api-gateway` | 8080 | The single front door. Every outside request (Postman, a future app) comes through here first. |
| 3 | `identity-service` | 8081 | Registration, login, and issuing the login token (JWT) that proves who you are. |
| 4 | `rider-service` | 8082 | Lets a rider create/list/cancel a ride request. |
| 5 | `driver-service` | 8083 | Driver profiles, vehicles, and "who is free and nearby right now." |
| 6 | `matching-service` | 8084 | Takes a ride request and picks the nearest available driver. |
| 7 | `trip-service` | 8085 | Owns the life of a trip: created → ongoing → completed/cancelled. |
| 8 | `payment-service` | 8086 | Calculates the fare and records the "payment" once a trip finishes. |
| 9 | `notification-service` | 8087 | Writes a notification row (and prints a log line) every time something interesting happens. |

Supporting infrastructure (not application code, just runs in Docker):
- **PostgreSQL** (port 5432) — one database *per service* (`identity_db`, `rider_db`, …), created
  by [`init-db.sql`](../init-db.sql). No service is allowed to read another service's tables —
  they only know about each other through network calls and events. This is the core
  microservices rule: **own your data, don't reach into someone else's.**
- **RabbitMQ** (port 5672, management UI on 15672) — the postman for asynchronous messages
  between services (explained in §6).

`docker-compose.yml` at the project root starts Postgres + RabbitMQ with one command; the 9
Spring Boot services are run individually (`mvn spring-boot:run`), not containerized in this
phase.

---

## 4. How one request travels through the system

Every real request from outside (Postman, or eventually a mobile app) follows this path:

```
Client / Postman
      │
      ▼
api-gateway  (:8080)
      │   • Every path starts with /api/...
      │   • JwtAuthFilter checks the Authorization header
      │     - /api/auth/**  → allowed through with NO token
      │     - everything else → must have a valid "Bearer <token>" or the gateway
      │       itself replies 401, the request never reaches the real service
      │   • strips the leading /api and asks Eureka "where is this service right now?"
      ▼
identity-service | rider-service | driver-service | matching-service |
trip-service | payment-service | notification-service
      │
      ├── talks to its OWN Postgres database only
      └── may publish an event onto the RabbitMQ exchange `uthao.events`
```

So `POST http://localhost:8080/api/riders/requests` becomes, on the inside,
`POST http://rider-service/riders/requests` — the gateway removes `/api` and looks up
`rider-service`'s real network address via Eureka.

### The two ways services talk to each other

1. **Synchronous (direct call, waits for an answer)** — used only once in this whole system:
   `matching-service` calls `driver-service`'s `GET /drivers/available` endpoint directly
   (currently hardcoded to `http://localhost:8083`, not looked up via Eureka — a shortcut the
   team plan explicitly allowed for a one-day build) to ask "who is free nearby?"

2. **Asynchronous (fire-and-forget event)** — used for everything else. A service publishes a
   small JSON message to a shared RabbitMQ "mailbox" (a *topic exchange* called `uthao.events`)
   and moves on immediately. It doesn't know or care who reads that message, or when. Any
   service that's interested creates its own private queue and subscribes to a specific message
   type. This is explained fully in §6.

---

## 5. Logging in: Identity Service + the Gateway's JWT filter

This is the security layer every other request depends on.

**`identity-service` (port 8081)**
- `model/User.java` — one row per person: `id`, `name`, `email` (must be unique), `password`
  (never stored as plain text), `role` (`"RIDER"` or `"DRIVER"`), `createdAt`.
- `service/AuthService.java` — the actual logic:
  - `register(...)`: lower-cases the email, checks the role is `RIDER` or `DRIVER`, checks the
    email isn't already taken, **hashes the password with BCrypt** (a one-way scrambling
    algorithm — even the database never sees the real password), saves the user, and returns a
    login token.
  - `login(...)`: looks the user up by email, checks the submitted password against the stored
    hash (`passwordEncoder.matches(...)`), and if it matches, returns a fresh token.
  - `me(...)`: reads the token out of the request header and returns the logged-in user's info —
    handy for confirming a token still works.
- `security/JwtUtil.java` — creates and checks the actual token (a **JWT**, JSON Web Token: a
  signed piece of text that encodes `userId` and `role` and can't be tampered with without
  knowing the secret key). This token has **no expiry** in this project — a deliberate
  simplification for a classroom demo.
- `security/SecurityConfig.java` — tells Spring Security "don't use sessions or cookies, allow
  anyone to hit `/auth/**` freely, and require *some* authentication on anything else." (In
  practice the gateway is the thing actually enforcing this for the whole system — see below.)
- `controller/AuthController.java` — the three HTTP endpoints: `POST /auth/register`,
  `POST /auth/login`, `GET /auth/me`.
- `exception/GlobalExceptionHandler.java` — catches validation errors (like a missing field) and
  "not found"/"conflict" errors and turns them into a consistent JSON error shape instead of a
  raw stack trace.

**`api-gateway` (port 8080)**
- `filter/JwtAuthFilter.java` — runs on **every single request** that hits the gateway, before it
  reaches any service. If the path is `/api/auth/...` (or `/auth/...`), it lets the request
  through untouched — you can't be asked for a login token before you've logged in. For every
  other path, it reads the `Authorization: Bearer <token>` header, verifies the token's signature
  against the shared secret, and either lets the request continue or immediately replies
  `401 Unauthorized` without ever forwarding it downstream.
- `config/RouteConfig.java` — the map of "if the path starts with X, forward it to service Y",
  e.g. `/api/riders/**` → `rider-service`, `/api/drivers/**` → `driver-service`, etc. It also
  strips the `/api` prefix before forwarding.

**The shared secret** both sides use to sign/verify tokens lives in each service's
`application.yml` under `jwt.secret`. *(Small note: the value actually configured in the code —
`uthao-super-secret-jwt-key-2024-extended-256bit` — is longer than the one written in
`CONTRACTS.md`/`README.md` (`uthao-super-secret-jwt-key-2024`). They must match exactly across
every service that checks a token, so if you ever change one, change it everywhere.)*

---

## 6. The event-driven heart of the system (RabbitMQ)

Picture a single bulletin board called `uthao.events`. Services **pin notices** to it
(*"publish"*), and other services that care about a certain kind of notice have **subscribed to
a specific pigeonhole** (*"queue"*) that only collects notices matching a certain label
(*"routing key"*). Nobody talks to anybody directly — they just read from their own pigeonhole
whenever something new lands in it.

This is called a **topic exchange**: one shared board (`uthao.events`), many independent mailboxes
(queues), each bound to the label(s) it wants.

### The four notices that get pinned, and who reads them

| Label (routing key) | Who pins it | Who reads it | What's in the note |
|---|---|---|---|
| `ride.requested` | rider-service | *(nobody currently — informational)* | the new ride request |
| `driver.assigned` | matching-service | trip-service, notification-service, **driver-service** (added for the new trip-history feature) | which driver got matched to which ride request |
| `trip.completed` | trip-service | payment-service, notification-service | the finished trip's IDs and coordinates |
| `trip.cancelled` | trip-service | notification-service | the cancelled trip's IDs |
| `payment.completed` | payment-service | notification-service | how much was charged and whether it succeeded |

Each consuming service has its own `config/RabbitMQConfig.java` that declares: "here's the shared
exchange, here's *my private queue*, bind my queue to this specific label." Two services can both
subscribe to the same label (e.g. both trip-service and notification-service get their own copy
of every `driver.assigned` notice) because each has its **own** queue — RabbitMQ duplicates the
message to every bound queue.

### Walking through the full chain, end to end

1. **Rider requests a ride** → `rider-service` saves the request (`status = REQUESTED`) and pins
   `ride.requested` (nobody currently listens for this — it exists mainly so a future service
   could pick it up, and so you can see it happening in the RabbitMQ UI).
2. **Someone calls `POST /matching/find-driver`** with the pickup location → `matching-service`
   directly asks `driver-service` "who's `AVAILABLE` near here?" (the one synchronous call in the
   system). If nobody's available, it saves the attempt as `NO_DRIVER_FOUND` and stops — it never
   crashes or hangs. If someone is available, it takes the *nearest* one (sorted by simple
   straight-line distance — see §7), saves a `MATCHED` record, and pins `driver.assigned` with
   the rider's and driver's IDs, the driver's name, and a fake ETA (`"5 mins"`, always).
3. **`trip-service` is listening for `driver.assigned`** → the moment that notice lands in its
   queue, it automatically creates a `Trip` row with `status = MATCHED`. Nobody had to call
   trip-service directly — this happens purely because it's subscribed to that label.
4. **The trip is manually driven forward** (in this student project, there's no real driver app,
   so Postman "plays" the driver) via `POST /trips/{id}/start` (→ `ONGOING`) then
   `POST /trips/{id}/complete` (→ `COMPLETED`). Completing a trip pins `trip.completed`.
5. **`payment-service` is listening for `trip.completed`** → it calculates a fare (base fee + a
   per-kilometer rate, using the trip's pickup/drop coordinates) and saves a `Payment` row with
   `status = SUCCESS`, then pins `payment.completed`.
6. **`notification-service` is listening for everything** — `driver.assigned`, `trip.completed`,
   `payment.completed`, and `trip.cancelled` — and for each one it writes a `Notification` row
   *and* prints it to the console. This is the easiest way to watch the whole chain happen live
   during a demo: start all the services, trigger the flow, and watch notification rows appear
   one after another as each event ripples through the system.

**Nothing in this chain is guaranteed to succeed end-to-end** — there's no rollback if, say,
`payment-service` were down when `trip.completed` fired; the message would just sit unread. This
is a known, accepted limitation for a classroom project (see §9).

---

## 7. Service-by-service deep dive

### `rider-service` (:8082)
**Job:** own everything about a rider's request for a ride.
- `model/RideRequest.java` — `riderId`, pickup/drop lat-lng, `status` (`REQUESTED` /
  `CANCELLED`), `createdAt`.
- `service/RideRequestService.java` — `createRequest` (saves + publishes `ride.requested`),
  `cancelRequest` (flips status to `CANCELLED`), `getRequestsByRider`.
- `controller/RiderController.java` — `POST /riders/requests`, `GET /riders/{riderId}/requests`,
  `POST /riders/requests/{requestId}/cancel`.
- There's also a `Rider` entity/repository scaffolded for a rider *profile*, but there's no
  endpoint to create one yet — ride requests just take a raw `riderId` (which in practice is the
  `userId` from Identity).

### `driver-service` (:8083)
**Job:** driver profiles, their vehicles, and "who's free right now, near this point."
- `model/Driver.java` — profile info (`name`, `email`, `phone`, `licenseNumber`,
  `verificationStatus`).
- `model/Vehicle.java` — one driver can register a vehicle (`plateNumber`, `make`, `model`,
  `color`).
- `model/DriverStatus.java` — the *live* state: `status` (`OFFLINE` / `AVAILABLE` / `BUSY`) plus
  `currentLat`/`currentLng`. This is a plain field updated by a normal REST call — there's no
  real-time GPS stream in this project, by design.
- `model/DriverTrip.java` *(added later)* — a small local record of "this driver got matched to
  this ride request," built purely by listening to the `driver.assigned` event — **not** by
  calling trip-service, because trip data belongs to trip-service's own database.
- `service/DriverService.java` — the core logic:
  - `registerDriver`, `addVehicle`, `updateStatus` — straightforward CRUD.
  - `getNearbyAvailableDrivers(lat, lng, radiusKm)` — the "nearby search." It's deliberately
    simple: treat latitude/longitude degrees like flat X/Y coordinates, compute plain Euclidean
    distance (`√(Δlat² + Δlng²)`), multiply by ~111 (roughly how many kilometers one degree of
    latitude is) to get an approximate km distance, keep only results inside the radius, and sort
    nearest-first. No real mapping/geospatial database is used — that's explicitly out of scope.
  - `recordTripAssignment` / `getDriverTrips` — the trip-history feature: a RabbitMQ listener
    calls `recordTripAssignment` whenever a `driver.assigned` event arrives (saving a
    `DriverTrip` row), and `GET /drivers/{driverId}/trips` reads them back out.
- `controller/DriverController.java` — `POST /drivers`, `POST /drivers/{id}/vehicles`,
  `PATCH /drivers/{id}/status`, `GET /drivers/available?lat=&lng=&radiusKm=`,
  `GET /drivers/{id}`, `GET /drivers/{id}/trips`.
- `listener/DriverAssignedListener.java` + `config/RabbitMQConfig.java` — subscribes to
  `driver.assigned` on its own private queue and feeds it to `recordTripAssignment`.

### `matching-service` (:8084)
**Job:** turn a ride request into an actual driver assignment.
- `model/MatchRequest.java` — one row per attempt, `status` = `MATCHED` or `NO_DRIVER_FOUND`.
- `model/MatchHistory.java` — one row per *successful* match (`riderId`, `driverId`, when).
- `service/MatchingService.java` — `findDriver(...)`:
  1. Calls driver-service's `/drivers/available` endpoint.
  2. No drivers back → save a `NO_DRIVER_FOUND` `MatchRequest`, return that status. It never
     throws an error or hangs — a deliberate design goal from the plan.
  3. Drivers found → take index `0` (the nearest, because driver-service already sorted them),
     save `MATCHED` + a `MatchHistory` row, and publish `driver.assigned` with everything
     trip-service and notification-service need.
- `controller/MatchingController.java` — one endpoint: `POST /matching/find-driver`.
- `config/AppConfig.java` — registers the `RestTemplate` bean used to call driver-service.
- **Deliberately dumb by design:** "nearest driver" is just "first item in an already-sorted
  list." No real dispatch optimization, no considering driver ratings, no batching multiple
  riders — the plan explicitly calls this out as out of scope for a one-day project.

### `trip-service` (:8085)
**Job:** own the life cycle of a trip from match to completion.
- `model/Trip.java` — the whole trip record: rider/driver IDs, pickup/drop coordinates, `status`
  (`MATCHED` → `ONGOING` → `COMPLETED`, or `CANCELLED`), `fare`, timestamps.
- `model/TripStatusHistory.java` — an audit trail: one row every time the trip's status changes.
- `service/TripService.java`:
  - `createTrip(event)` — triggered automatically from the `driver.assigned` message; builds a
    `Trip` row straight out of the event's fields.
  - `startTrip` / `completeTrip` / `cancelTrip` — manual triggers (there's no real driver app in
    this project, so a human calls these through Postman to *simulate* the driver's actions).
    `completeTrip` sets `fare = 0.0` on purpose and lets `payment-service` do the real math, then
    publishes `trip.completed`. `cancelTrip` publishes `trip.cancelled`.
- `listener/TripEventListener.java` — subscribes to `driver.assigned` and calls `createTrip`.
- `controller/TripController.java` — `GET /trips/{id}`, `POST /trips/{id}/start`,
  `POST /trips/{id}/complete`, `POST /trips/{id}/cancel`.

### `payment-service` (:8086)
**Job:** calculate and record what a completed trip costs.
- `model/Payment.java` — `tripId`, `riderId`, `amount`, `status` (`SUCCESS` / `REFUNDED`).
- `model/Refund.java` — `paymentId`, `reason`, `refundedAt`.
- `service/PaymentService.java`:
  - `processPayment(event)` — triggered from `trip.completed`. Fare formula:
    `50.0 (base) + 15.0 × distanceKm`, where `distanceKm` comes from the same simple
    lat/lng-degree-to-km trick used in driver-service. Saves a `SUCCESS` payment and publishes
    `payment.completed`.
  - `requestRefund(...)` — manually triggered; marks the payment `REFUNDED` and logs why.
- `listener/PaymentEventListener.java` — subscribes to `trip.completed`.
- `controller/PaymentController.java` — `GET /payments/trip/{tripId}`,
  `POST /payments/{id}/refund`.
- **No real payment gateway anywhere** — this always "succeeds"; it's a simulation.

### `notification-service` (:8087)
**Job:** be the visible proof that the whole chain works, by turning every event into a row +
console line.
- `model/Notification.java` — `userId`, `message`, `type`, `isRead`, `createdAt`.
- `listener/NotificationListener.java` — **four** separate `@RabbitListener` methods, one per
  event type it cares about, each just building a human-readable message
  (e.g. `"Payment of BDT 95.0 was successful"`) and saving it.
- `service/NotificationService.java` — thin wrapper around save/read/mark-read.
- `controller/NotificationController.java` — `GET /notifications/user/{userId}`,
  `PATCH /notifications/{id}/read`.
- This service has **no business logic of its own** — it's intentionally the simplest piece, and
  doubles as the demo's "proof it all works" surface.

### `eureka-server` (:8761)
Genuinely tiny: one annotation (`@EnableEurekaServer`) and a config that tells it *not* to
register itself or fetch a registry (since it *is* the registry). Every other service's
`application.yml` points at it (`eureka.client.service-url.defaultZone`) so it can be found by
name instead of a hardcoded `localhost:port`. Must be the **first** thing started, and stay
running all day, or every other service either fails to register or can't be found by the
gateway.

---

## 8. A full worked example (what actually happens on a demo run)

1. `POST /api/auth/register` (role `RIDER`) → get back a token. Do the same for a driver.
2. `POST /api/drivers` (with the driver's token/details) → register the driver profile.
3. `POST /api/drivers/{id}/vehicles` → attach a car.
4. `PATCH /api/drivers/{id}/status` with `status: AVAILABLE` and a lat/lng → driver is now
   findable.
5. `POST /api/riders/requests` → rider-service creates a `RideRequest`
   (`status = REQUESTED`) and quietly pins `ride.requested`.
6. `POST /api/matching/find-driver` with the same pickup point → matching-service asks
   driver-service who's nearby, finds the driver from step 4, saves a match, and pins
   `driver.assigned`.
7. **Automatically, with no further calls from you:** trip-service creates a `Trip`
   (`MATCHED`), driver-service records a `DriverTrip` entry, and notification-service writes
   "Your driver has been assigned" for both the rider and the driver.
8. `POST /api/trips/{id}/start` → `ONGOING`.
9. `POST /api/trips/{id}/complete` → `COMPLETED`, publishes `trip.completed`.
10. **Automatically:** payment-service calculates the fare and saves a `SUCCESS` payment,
    publishing `payment.completed`; notification-service logs both "trip is complete" and the
    payment amount.
11. `GET /api/notifications/user/{riderId}` → you can see the whole story as a list of
    notifications, in order, without having called trip-service or payment-service directly.

That's the entire point of the event-driven design: steps 7 and 10 happen **without anyone
calling those services** — they react on their own because they're subscribed to the right
event.

---

## 9. What's deliberately missing (and why that's OK)

This project is a scoped-down student build, not production software. These gaps are intentional,
documented choices, not oversights:

- **No rollback/saga pattern** — if payment fails after a trip is marked complete, nothing
  automatically undoes the trip. A real system would need a coordination pattern for that.
- **No real payment gateway, no real map/geolocation service** — both are simulated with simple
  math and constants.
- **No live location tracking** — a driver's position is a static field you update manually, not
  a stream.
- **No retry or dead-letter queues in RabbitMQ** — if a message is lost, it's just lost.
- **No automated tests** — everything is verified by hand via Postman.
- **The services themselves aren't containerized** — only Postgres/RabbitMQ run in Docker; the
  Spring Boot apps run directly from a terminal/IDE.
- **No pagination, rate limiting, or token expiry.**

---

## 10. Where to look for things (quick file map)

```
Uthao/
├── docker-compose.yml        # Postgres + RabbitMQ, the only containerized pieces
├── init-db.sql                # creates one database per service
├── Docs/
│   ├── CONTRACTS.md           # exact ports, JSON shapes, event names — the source of truth
│   ├── Uthao_Development_Plan.md   # the original one-day sprint plan
│   ├── indi-plan/{A,B,C,D}.md      # each teammate's personal walkthrough + checklist
│   └── CODEBASE_GUIDE.md      # this file
├── postman/Uthao.postman_collection.json   # ready-made requests through the gateway
├── eureka-server/              # the "phone book"
├── api-gateway/                # the front door + JWT check
├── identity-service/           # register/login/JWT
├── rider-service/               # ride requests
├── driver-service/              # driver profiles, vehicles, nearby search, trip history
├── matching-service/            # picks a driver
├── trip-service/                 # trip lifecycle
├── payment-service/              # fare + payment
└── notification-service/         # event → notification row + console log
```

Inside every service the shape is always the same, which makes it easy to jump between them:

```
<service>/
├── pom.xml                              # Maven dependencies for this service only
└── src/main/
    ├── java/com/uthao/<name>/
    │   ├── <Name>ServiceApplication.java  # the entry point (main method)
    │   ├── controller/    # HTTP endpoints — turns a request into a service call
    │   ├── service/       # the actual business logic
    │   ├── repository/    # talks to this service's own database (Spring Data JPA)
    │   ├── model/          # database tables, one class per table
    │   ├── dto/            # request/response JSON shapes (not database tables)
    │   ├── config/         # RabbitMQ exchange/queue setup, RestTemplate beans, etc.
    │   └── listener/        # @RabbitListener methods that react to events
    └── resources/application.yml   # port, database URL, RabbitMQ/Eureka/JWT settings
```
