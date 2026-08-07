# Cursor Prompt — Paste this entire block into Cursor Chat

---

You are helping me scaffold a Spring Boot microservices project called **Uthao** (a ride-sharing backend). I need you to do two things in a single response:

1. **Create the full folder + file scaffold** for all 9 Spring Boot projects, with skeleton code.
2. **Create one Markdown document** (`docs/CONTRACTS.md`) that serves as the kickoff call reference — ports, event names, shared DTOs, and Git workflow. This document replaces the need for everyone to take notes on a call.

---

## Project-level rules (apply everywhere)

- Java 21, Spring Boot 3.2.x
- Build tool: **Maven** (each service has its own `pom.xml`)
- Every service registers with **Netflix Eureka** (`@EnableDiscoveryClient`)
- Database: **PostgreSQL** — each service has its own separate database (connection string in `application.yml`, `spring.jpa.hibernate.ddl-auto=update` so tables auto-create)
- Message broker: **RabbitMQ** (NOT Kafka — use `spring-boot-starter-amqp`)
- Auth: **JWT** using `io.jsonwebtoken:jjwt-api:0.11.5`, `jjwt-impl:0.11.5`, `jjwt-jackson:0.11.5`
- Lombok everywhere (`@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`)
- No WebSocket, no real-time tracking, no frontend code
- No Rating Service in this phase
- Keep code simple and student-friendly — no saga pattern, no retry queues, no complex design patterns

---

## Port assignments (must match exactly)

| Service              | Port |
|----------------------|------|
| eureka-server        | 8761 |
| api-gateway          | 8080 |
| identity-service     | 8081 |
| rider-service        | 8082 |
| driver-service       | 8083 |
| matching-service     | 8084 |
| trip-service         | 8085 |
| payment-service      | 8086 |
| notification-service | 8087 |
| PostgreSQL            | 5432 |
| RabbitMQ (broker)    | 5672 |
| RabbitMQ (mgmt UI)   | 15672 |

---

## Root-level files to create

### `/docker-compose.yml`
```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16
    container_name: uthao-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
      - postgres_data:/var/lib/postgresql/data

  rabbitmq:
    image: rabbitmq:3-management
    container_name: uthao-rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest

volumes:
  postgres_data:
```

### `/init-db.sql`
```sql
CREATE DATABASE identity_db;
CREATE DATABASE rider_db;
CREATE DATABASE driver_db;
CREATE DATABASE matching_db;
CREATE DATABASE trip_db;
CREATE DATABASE payment_db;
CREATE DATABASE notification_db;
```

### `/postman/Uthao.postman_collection.json`
Create a valid Postman v2.1 collection JSON with one folder per service. Each folder should contain placeholder requests (with the correct URL, method, and a sample JSON body) for every endpoint listed below in each service. Use `http://localhost:8080` as the base URL (everything goes through the API Gateway). Add a collection variable `token` with an empty string as the default value, and use it as `Authorization: Bearer {{token}}` on every request except register and login.

---

## Now scaffold each service:

---

### 1. `eureka-server/`

**Dependencies:** `spring-cloud-starter-netflix-eureka-server`

**`EurekaServerApplication.java`**
- `@SpringBootApplication`, `@EnableEurekaServer`

**`application.yml`**
```yaml
server:
  port: 8761
spring:
  application:
    name: eureka-server
eureka:
  client:
    register-with-eureka: false
    fetch-registry: false
```

No controller, no entity, no DB. That is all this service needs.

---

### 2. `api-gateway/`

**Dependencies:** `spring-cloud-starter-gateway`, `spring-cloud-starter-netflix-eureka-client`, `io.jsonwebtoken:jjwt-api:0.11.5`, `jjwt-impl:0.11.5`, `jjwt-jackson:0.11.5`, `lombok`

**Files to create:**

**`GatewayApplication.java`** — `@SpringBootApplication`

**`filter/JwtAuthFilter.java`** — A `GlobalFilter` that:
- Skips `/auth/**` routes (whitelist — no token needed for register/login)
- For all other routes, reads the `Authorization: Bearer <token>` header
- Validates the token using the shared secret (`uthao-super-secret-jwt-key-2024`)
- If missing or invalid, returns HTTP 401
- If valid, passes the request through

**`config/RouteConfig.java`** — A `@Configuration` class with a `RouteLocator` bean that defines routes:
- `/api/auth/**` → `lb://identity-service`
- `/api/riders/**` → `lb://rider-service`
- `/api/drivers/**` → `lb://driver-service`
- `/api/matching/**` → `lb://matching-service`
- `/api/trips/**` → `lb://trip-service`
- `/api/payments/**` → `lb://payment-service`
- `/api/notifications/**` → `lb://notification-service`

**`application.yml`**
```yaml
server:
  port: 8080
spring:
  application:
    name: api-gateway
  main:
    web-application-type: reactive
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka
jwt:
  secret: uthao-super-secret-jwt-key-2024
```

---

### 3. `identity-service/`

**Dependencies:** `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `postgresql`, `spring-cloud-starter-netflix-eureka-client`, `spring-boot-starter-security`, `jjwt-api/impl/jackson`, `lombok`, `spring-boot-starter-validation`

**Entities:**

`model/User.java`
```
id (Long, @GeneratedValue)
name (String)
email (String, unique)
password (String)  -- stored as BCrypt hash
role (String)      -- "RIDER" or "DRIVER"
createdAt (LocalDateTime, auto)
```

**DTOs:**
- `RegisterRequest { name, email, password, role }`
- `LoginRequest { email, password }`
- `AuthResponse { token, userId, name, role }`

**Repository:** `UserRepository extends JpaRepository<User, Long>` with `findByEmail(String email)`

**Service — `AuthService`:**
- `register(RegisterRequest)`: check email not taken, hash password with BCrypt, save, generate JWT, return `AuthResponse`
- `login(LoginRequest)`: find by email, verify BCrypt, generate JWT, return `AuthResponse`

**`security/JwtUtil.java`:**
- `generateToken(User user)`: creates a JWT with claims `userId` and `role`, signed with secret `uthao-super-secret-jwt-key-2024`, no expiry (skip expiry to keep it simple)
- `validateToken(String token)`: returns true/false
- `getClaims(String token)`: returns `Claims`

**Controller — `AuthController`:**
- `POST /auth/register` → `authService.register(...)`
- `POST /auth/login` → `authService.login(...)`

**`application.yml`:**
```yaml
server:
  port: 8081
spring:
  application:
    name: identity-service
  datasource:
    url: jdbc:postgresql://localhost:5432/identity_db
    username: postgres
    password: postgres
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka
jwt:
  secret: uthao-super-secret-jwt-key-2024
```

Disable Spring Security's default form login — configure it to be stateless (no session), permit `/auth/**`, and require authentication on everything else.

---

### 4. `rider-service/`

**Dependencies:** `web`, `data-jpa`, `postgresql`, `eureka-client`, `amqp`, `lombok`, `validation`

**Entities:**

`model/Rider.java`
```
id (Long)
userId (Long)   -- references identity-service user, not a FK
name (String)
email (String)
phone (String)
```

`model/RideRequest.java`
```
id (Long)
riderId (Long)
pickupLat (Double)
pickupLng (Double)
dropLat (Double)
dropLng (Double)
status (String)  -- REQUESTED, MATCHED, CANCELLED
createdAt (LocalDateTime)
```

**DTOs:**
- `RideRequestDto { riderId, pickupLat, pickupLng, dropLat, dropLng }`
- `RideRequestResponse { id, riderId, status, createdAt }`

**Repositories:** `RiderRepository`, `RideRequestRepository`

**Service — `RideRequestService`:**
- `createRequest(RideRequestDto)`: save `RideRequest` with status `REQUESTED`, publish a `ride.requested` event to RabbitMQ exchange `uthao.events` with routing key `ride.requested` (payload: the saved request as JSON)
- `cancelRequest(Long requestId)`: set status to `CANCELLED`, save
- `getRequestsByRider(Long riderId)`: return all requests for rider

**`config/RabbitMQConfig.java`:** declare the topic exchange `uthao.events` as a `@Bean` (type: `TopicExchange`)

**Controller — `RiderController`:**
- `POST /riders/requests` → create ride request
- `GET /riders/{riderId}/requests` → get all requests for rider
- `POST /riders/requests/{requestId}/cancel` → cancel

**`application.yml`:** port 8082, database `rider_db`, same Eureka/RabbitMQ config pattern

---

### 5. `driver-service/`

**Dependencies:** `web`, `data-jpa`, `postgresql`, `eureka-client`, `lombok`, `validation`

**Entities:**

`model/Driver.java`
```
id (Long)
userId (Long)
name (String)
email (String)
phone (String)
licenseNumber (String)
verificationStatus (String)  -- PENDING, VERIFIED
```

`model/Vehicle.java`
```
id (Long)
driverId (Long)
make (String)
model (String)
plateNumber (String)
color (String)
```

`model/DriverStatus.java`
```
id (Long)
driverId (Long)
status (String)   -- OFFLINE, AVAILABLE, BUSY
currentLat (Double)
currentLng (Double)
updatedAt (LocalDateTime)
```

**DTOs:**
- `DriverStatusUpdateDto { status, currentLat, currentLng }`
- `NearbyDriverDto { driverId, name, vehiclePlate, currentLat, currentLng, distanceKm }`

**Service — `DriverService`:**
- `updateStatus(Long driverId, DriverStatusUpdateDto)`: upsert `DriverStatus` row
- `getNearbyAvailableDrivers(Double lat, Double lng, Double radiusKm)`: fetch all `DriverStatus` rows where `status = AVAILABLE`, filter by simple Euclidean distance `sqrt((lat2-lat1)^2 + (lng2-lng1)^2)` against `radiusKm / 111` (1 degree ≈ 111 km), return sorted list of `NearbyDriverDto`
- `registerDriver(...)`, `getDriver(Long id)`, `addVehicle(...)`

**Controller — `DriverController`:**
- `POST /drivers` → register driver profile
- `POST /drivers/{driverId}/vehicles` → add vehicle
- `PATCH /drivers/{driverId}/status` → update status + location
- `GET /drivers/available` → query params `lat`, `lng`, `radiusKm` (default 5.0) → returns list of nearby available drivers
- `GET /drivers/{driverId}` → get driver details

**`application.yml`:** port 8083, database `driver_db`

---

### 6. `matching-service/`

**Dependencies:** `web`, `data-jpa`, `postgresql`, `eureka-client`, `amqp`, `lombok`

**Entities:**

`model/MatchRequest.java`
```
id (Long)
rideRequestId (Long)
riderId (Long)
pickupLat (Double)
pickupLng (Double)
status (String)   -- PENDING, MATCHED, NO_DRIVER_FOUND
createdAt (LocalDateTime)
```

`model/MatchHistory.java`
```
id (Long)
rideRequestId (Long)
riderId (Long)
driverId (Long)
matchedAt (LocalDateTime)
```

**DTOs:**
- `FindDriverRequest { rideRequestId, riderId, pickupLat, pickupLng, dropLat, dropLng }`
- `MatchResultDto { rideRequestId, driverId, driverName, vehiclePlate, eta, status }`

**Service — `MatchingService`:**
- `findDriver(FindDriverRequest req)`:
  1. Call `driver-service` at `http://localhost:8083/drivers/available?lat={lat}&lng={lng}&radiusKm=5` using `RestTemplate`
  2. If no drivers returned → save `MatchRequest` with status `NO_DRIVER_FOUND`, return result with that status
  3. If drivers found → take the first (nearest) one, save `MatchRequest` (MATCHED) and `MatchHistory`, publish event `driver.assigned` to `uthao.events` with routing key `driver.assigned` (payload: `{ rideRequestId, riderId, driverId, driverName, eta: "5 mins" }`), return `MatchResultDto`

**`config/RabbitMQConfig.java`:** same `uthao.events` `TopicExchange` bean

**Controller — `MatchingController`:**
- `POST /matching/find-driver` → `matchingService.findDriver(...)`

**`application.yml`:** port 8084, database `matching_db`, declare a `RestTemplate` bean in a `@Configuration` class

---

### 7. `trip-service/`

**Dependencies:** `web`, `data-jpa`, `postgresql`, `eureka-client`, `amqp`, `lombok`

**Entities:**

`model/Trip.java`
```
id (Long)
rideRequestId (Long)
riderId (Long)
driverId (Long)
pickupLat, pickupLng, dropLat, dropLng (Double)
status (String)   -- MATCHED, ONGOING, COMPLETED, CANCELLED
fare (Double)     -- filled in when trip completes
startedAt (LocalDateTime)
completedAt (LocalDateTime)
createdAt (LocalDateTime)
```

`model/TripStatusHistory.java`
```
id (Long)
tripId (Long)
status (String)
changedAt (LocalDateTime)
```

**Service — `TripService`:**
- `createTrip(event payload from driver.assigned)`: create `Trip` in status `MATCHED`, add history row
- `startTrip(Long tripId)`: status → `ONGOING`, add history row
- `completeTrip(Long tripId)`: status → `COMPLETED`, add history row, publish `trip.completed` event with routing key `trip.completed` (payload: `{ tripId, riderId, driverId, fare: 0.0 }` — fare is 0 here, Payment will calculate it)
- `cancelTrip(Long tripId)`: status → `CANCELLED`, publish `trip.cancelled`
- `getTrip(Long tripId)`: return trip

**`listener/TripEventListener.java`:**
- `@RabbitListener(queues = "trip.driver-assigned.queue")`: receives `driver.assigned` event → calls `tripService.createTrip(...)`

**`config/RabbitMQConfig.java`:**
- Declare `TopicExchange uthao.events`
- Declare `Queue trip.driver-assigned.queue`
- Declare `Binding` between the queue and exchange with routing key `driver.assigned`

**Controller — `TripController`:**
- `GET /trips/{tripId}` → get trip details
- `POST /trips/{tripId}/start` → start trip
- `POST /trips/{tripId}/complete` → complete trip
- `POST /trips/{tripId}/cancel` → cancel trip

**`application.yml`:** port 8085, database `trip_db`

---

### 8. `payment-service/`

**Dependencies:** `web`, `data-jpa`, `postgresql`, `eureka-client`, `amqp`, `lombok`

**Entities:**

`model/Payment.java`
```
id (Long)
tripId (Long)
riderId (Long)
amount (Double)
status (String)   -- SUCCESS, FAILED, REFUNDED
createdAt (LocalDateTime)
```

`model/Refund.java`
```
id (Long)
paymentId (Long)
reason (String)
refundedAt (LocalDateTime)
```

**Fare calculation:** flat rate — base fare 50.0 + 15.0 per km. Distance is estimated from the trip's lat/lng fields using the same simple Euclidean formula (× 111 to convert degrees to km). No external mapping API needed.

**Service — `PaymentService`:**
- `processPayment(event payload from trip.completed)`: calculate fare, save `Payment` with status `SUCCESS`, publish `payment.completed` event with routing key `payment.completed` (payload: `{ tripId, riderId, amount, status }`)
- `requestRefund(Long paymentId, String reason)`: save `Refund`, update `Payment` status to `REFUNDED`
- `getPayment(Long tripId)`: return payment for a trip

**`listener/PaymentEventListener.java`:**
- `@RabbitListener(queues = "payment.trip-completed.queue")`: receives `trip.completed` → calls `paymentService.processPayment(...)`

**`config/RabbitMQConfig.java`:**
- Declare exchange, `Queue payment.trip-completed.queue`, binding with routing key `trip.completed`

**Controller — `PaymentController`:**
- `GET /payments/trip/{tripId}` → get payment for trip
- `POST /payments/{paymentId}/refund` → refund

**`application.yml`:** port 8086, database `payment_db`

---

### 9. `notification-service/`

**Dependencies:** `web`, `data-jpa`, `postgresql`, `eureka-client`, `amqp`, `lombok`

**Entity:**

`model/Notification.java`
```
id (Long)
userId (Long)
message (String)
type (String)    -- RIDE_MATCHED, TRIP_STARTED, TRIP_COMPLETED, PAYMENT_SUCCESS, CANCELLED
isRead (Boolean, default false)
createdAt (LocalDateTime)
```

**Listener — `NotificationListener.java`:**
Four `@RabbitListener` methods, one per event:
- `driver.assigned.queue` → routing key `driver.assigned` → save two notifications (one for riderId, one for driverId): "Your driver has been assigned"
- `trip.completed.queue` → routing key `trip.completed` → save: "Your trip is complete"
- `payment.completed.queue` → routing key `payment.completed` → save: "Payment of BDT {amount} was successful"
- `trip.cancelled.queue` → routing key `trip.cancelled` → save: "Your trip has been cancelled"

Each method should also `System.out.println` the event so it's visible in the console during the demo.

**`config/RabbitMQConfig.java`:**
Declare the exchange + all four queues + their bindings.

**Controller — `NotificationController`:**
- `GET /notifications/user/{userId}` → get all notifications for user, sorted by createdAt desc
- `PATCH /notifications/{id}/read` → mark as read

**`application.yml`:** port 8087, database `notification_db`

---

## `docs/CONTRACTS.md` — Kickoff Call Reference Document

Create this file at the root of the project. It must cover every item the team needs to agree on before splitting up, so nobody has to interrupt anyone mid-day. Structure it exactly as follows:

```markdown
# Uthao — Kickoff Contracts

> **This document is the single source of truth.** 
> Read it before writing any code. Do not change values here without telling the whole team.

## 1. Port Numbers
(table of all ports)

## 2. Shared JWT Secret
Secret string: `uthao-super-secret-jwt-key-2024`
Token claims: `userId` (Long), `role` (String: "RIDER" or "DRIVER")
Header format: `Authorization: Bearer <token>`
No expiry in this version.

## 3. Database Connection Info (local)
(table: service name → database name, all use localhost:5432, user=postgres, pass=postgres)

## 4. RabbitMQ
Exchange name: `uthao.events` (type: topic)
Default credentials: guest / guest
Management UI: http://localhost:15672

### Event Routing Keys and Payloads
(table: routing key | published by | consumed by | payload fields)

## 5. Cross-Service REST Calls (Synchronous)
(table: caller → callee → endpoint → purpose)

## 6. Shared DTO Shapes (JSON)
Show the exact JSON body for:
- RideRequestDto
- FindDriverRequest
- MatchResultDto
- TripDto
- PaymentResultDto

## 7. Git Workflow
- Repo: one monorepo
- Branches:
  - Person A → `feature/identity-gateway`
  - Person B → `feature/rider-eureka`
  - Person C → `feature/driver-matching`
  - Person D → `feature/trip-payment-notification`
- PR into `main` around hour 10–12
- Merge one PR at a time, fix conflicts together

## 8. Team Assignments
(table: Person → Owns → Services)

## 9. Integration Checklist (run this at merge time)
Numbered list of steps:
1. docker compose up
2. Start eureka-server
3. Start all 7 services
4. Start api-gateway
5. Register a rider
6. Register a driver
7. Driver goes AVAILABLE
8. Rider creates ride request
9. Call matching/find-driver
10. Trip gets created (check DB)
11. Call /trips/{id}/start
12. Call /trips/{id}/complete
13. Payment auto-processes (check DB)
14. Notifications appear (check DB + console logs)
```

---

## Final instructions for Cursor

- Create every file listed above. Do not skip any file.
- Every `pom.xml` must include the correct dependencies and the Spring Boot parent `3.2.5`.
- Every `application.yml` must be fully filled in (not placeholder comments).
- All Java classes must be fully implemented (no `// TODO` stubs) — skeleton is fine, but the code must compile.
- Use `com.uthao.<servicename>` as the base package for each service (e.g. `com.uthao.rider`, `com.uthao.driver`).
- After creating all files, print a summary checklist: one line per service, confirming what was created.