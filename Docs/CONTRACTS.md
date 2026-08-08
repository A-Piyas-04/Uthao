# Uthao — Kickoff Contracts

> **This document is the single source of truth.**
> Read it before writing any code. Do not change values here without telling the whole team.

## 1. Port Numbers

| Service              | Port  |
|----------------------|-------|
| eureka-server        | 8761  |
| api-gateway          | 8080  |
| identity-service     | 8081  |
| rider-service        | 8082  |
| driver-service       | 8083  |
| matching-service     | 8084  |
| trip-service         | 8085  |
| payment-service      | 8086  |
| notification-service | 8087  |
| PostgreSQL           | 5432  |
| RabbitMQ (broker)    | 5672  |
| RabbitMQ (mgmt UI)   | 15672 |

## 2. Shared JWT Secret

Secret string: `uthao-super-secret-jwt-key-2024-extended-256bit`

Token claims: `userId` (Long), `role` (String: "RIDER" or "DRIVER")

Header format: `Authorization: Bearer <token>`

No expiry in this version.

## 3. Database Connection Info (local)

| Service              | Database         | Host / Port       | User / Password     |
|----------------------|------------------|-------------------|---------------------|
| identity-service     | identity_db      | localhost:5432    | postgres / postgres |
| rider-service        | rider_db         | localhost:5432    | postgres / postgres |
| driver-service       | driver_db        | localhost:5432    | postgres / postgres |
| matching-service     | matching_db      | localhost:5432    | postgres / postgres |
| trip-service         | trip_db          | localhost:5432    | postgres / postgres |
| payment-service      | payment_db       | localhost:5432    | postgres / postgres |
| notification-service | notification_db  | localhost:5432    | postgres / postgres |

All services use `spring.jpa.hibernate.ddl-auto=update`.

## 4. RabbitMQ

Exchange name: `uthao.events` (type: topic)

Default credentials: guest / guest

Management UI: http://localhost:15672

### Event Routing Keys and Payloads

| Routing key         | Published by       | Consumed by                          | Payload fields                                              |
|---------------------|--------------------|--------------------------------------|-------------------------------------------------------------|
| `ride.requested`    | rider-service      | (optional listeners / demo)          | `id`, `riderId`, `pickupLat`, `pickupLng`, `dropLat`, `dropLng`, `status`, `createdAt` |
| `driver.assigned`   | matching-service   | trip-service, notification-service   | `rideRequestId`, `riderId`, `driverId`, `driverName`, `eta` |
| `trip.completed`    | trip-service       | payment-service, notification-service| `tripId`, `riderId`, `driverId`, `fare`                     |
| `trip.cancelled`    | trip-service       | notification-service                 | `tripId`, `riderId`, `driverId`                             |
| `payment.completed` | payment-service    | notification-service                 | `tripId`, `riderId`, `amount`, `status`                     |

### Queues

| Queue                          | Routing key         | Service              |
|--------------------------------|---------------------|----------------------|
| `trip.driver-assigned.queue`   | `driver.assigned`   | trip-service         |
| `payment.trip-completed.queue` | `trip.completed`    | payment-service      |
| `driver.assigned.queue`        | `driver.assigned`   | notification-service |
| `trip.completed.queue`         | `trip.completed`    | notification-service |
| `payment.completed.queue`      | `payment.completed` | notification-service |
| `trip.cancelled.queue`         | `trip.cancelled`    | notification-service |

## 5. Cross-Service REST Calls (Synchronous)

| Caller            | Callee          | Endpoint                                                         | Purpose                          |
|-------------------|-----------------|------------------------------------------------------------------|----------------------------------|
| matching-service  | driver-service  | `GET /drivers/available?lat=&lng=&radiusKm=`                     | Find nearby available drivers    |

All external clients call services through the API Gateway (`http://localhost:8080`).

| Gateway path              | Downstream service   |
|---------------------------|----------------------|
| `/api/auth/**`            | identity-service     |
| `/api/riders/**`          | rider-service        |
| `/api/drivers/**`         | driver-service       |
| `/api/matching/**`        | matching-service     |
| `/api/trips/**`           | trip-service         |
| `/api/payments/**`        | payment-service      |
| `/api/notifications/**`   | notification-service |

## 6. Shared DTO Shapes (JSON)

### RideRequestDto
```json
{
  "riderId": 1,
  "pickupLat": 23.8103,
  "pickupLng": 90.4125,
  "dropLat": 23.7808,
  "dropLng": 90.4074
}
```

### FindDriverRequest
```json
{
  "rideRequestId": 1,
  "riderId": 1,
  "pickupLat": 23.8103,
  "pickupLng": 90.4125,
  "dropLat": 23.7808,
  "dropLng": 90.4074
}
```

### MatchResultDto
```json
{
  "rideRequestId": 1,
  "driverId": 2,
  "driverName": "Karim",
  "vehiclePlate": "DHA-1234",
  "eta": "5 mins",
  "status": "MATCHED"
}
```

### TripDto
```json
{
  "id": 1,
  "rideRequestId": 1,
  "riderId": 1,
  "driverId": 2,
  "pickupLat": 23.8103,
  "pickupLng": 90.4125,
  "dropLat": 23.7808,
  "dropLng": 90.4074,
  "status": "MATCHED",
  "fare": null,
  "startedAt": null,
  "completedAt": null,
  "createdAt": "2024-01-01T12:00:00"
}
```

### PaymentResultDto
```json
{
  "tripId": 1,
  "riderId": 1,
  "amount": 95.0,
  "status": "SUCCESS"
}
```

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

| Person   | Owns                              | Services                                      |
|----------|-----------------------------------|-----------------------------------------------|
| Person A | Auth + edge                       | identity-service, api-gateway                 |
| Person B | Rider + discovery                 | rider-service, eureka-server                  |
| Person C | Supply + matching                 | driver-service, matching-service              |
| Person D | Trip lifecycle + money + alerts   | trip-service, payment-service, notification-service |

## 9. Integration Checklist (run this at merge time)

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
