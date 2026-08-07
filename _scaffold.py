#!/usr/bin/env python3
"""Generate the full Uthao Spring Boot microservices scaffold."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent

CLOUD_BOM = "2023.0.1"
BOOT = "3.2.5"
JJWT = "0.11.5"
JWT_SECRET = "uthao-super-secret-jwt-key-2024"

COMMON_PROPS = f"""\
        <java.version>21</java.version>
        <spring-cloud.version>{CLOUD_BOM}</spring-cloud.version>
"""

DEP_MGMT = """\
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.cloud</groupId>
                <artifactId>spring-cloud-dependencies</artifactId>
                <version>${spring-cloud.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>
"""

BUILD = """\
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
"""


def write(rel: str, content: str):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.lstrip("\n") if content.startswith("\n") else content, encoding="utf-8")
    if not content.endswith("\n"):
        path.write_text(path.read_text(encoding="utf-8") + "\n", encoding="utf-8")
    print(f"  + {rel}")


def pom(artifact: str, name: str, deps: str) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>{BOOT}</version>
        <relativePath/>
    </parent>

    <groupId>com.uthao</groupId>
    <artifactId>{artifact}</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>{name}</name>
    <description>{name} for Uthao ride-sharing</description>

    <properties>
{COMMON_PROPS}    </properties>

    <dependencies>
{deps}
    </dependencies>

{DEP_MGMT}
{BUILD}</project>
"""


# ── Root files ──────────────────────────────────────────────────────────────

write("docker-compose.yml", """\
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
""")

write("init-db.sql", """\
CREATE DATABASE identity_db;
CREATE DATABASE rider_db;
CREATE DATABASE driver_db;
CREATE DATABASE matching_db;
CREATE DATABASE trip_db;
CREATE DATABASE payment_db;
CREATE DATABASE notification_db;
""")

write("docs/CONTRACTS.md", f"""\
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

Secret string: `{JWT_SECRET}`

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
{{
  "riderId": 1,
  "pickupLat": 23.8103,
  "pickupLng": 90.4125,
  "dropLat": 23.7808,
  "dropLng": 90.4074
}}
```

### FindDriverRequest
```json
{{
  "rideRequestId": 1,
  "riderId": 1,
  "pickupLat": 23.8103,
  "pickupLng": 90.4125,
  "dropLat": 23.7808,
  "dropLng": 90.4074
}}
```

### MatchResultDto
```json
{{
  "rideRequestId": 1,
  "driverId": 2,
  "driverName": "Karim",
  "vehiclePlate": "DHA-1234",
  "eta": "5 mins",
  "status": "MATCHED"
}}
```

### TripDto
```json
{{
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
}}
```

### PaymentResultDto
```json
{{
  "tripId": 1,
  "riderId": 1,
  "amount": 95.0,
  "status": "SUCCESS"
}}
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
11. Call /trips/{{id}}/start
12. Call /trips/{{id}}/complete
13. Payment auto-processes (check DB)
14. Notifications appear (check DB + console logs)
""")

# Postman collection
postman = r'''{
  "info": {
    "name": "Uthao",
    "description": "Uthao ride-sharing API (via API Gateway)",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:8080" },
    { "key": "token", "value": "" }
  ],
  "item": [
    {
      "name": "identity-service",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \\"name\\": \\"Alice Rider\\",\n  \\"email\\": \\"alice@example.com\\",\n  \\"password\\": \\"password123\\",\n  \\"role\\": \\"RIDER\\"\n}"
            },
            "url": "{{baseUrl}}/api/auth/register"
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \\"email\\": \\"alice@example.com\\",\n  \\"password\\": \\"password123\\"\n}"
            },
            "url": "{{baseUrl}}/api/auth/login"
          }
        }
      ]
    },
    {
      "name": "rider-service",
      "item": [
        {
          "name": "Create Ride Request",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \\"riderId\\": 1,\n  \\"pickupLat\\": 23.8103,\n  \\"pickupLng\\": 90.4125,\n  \\"dropLat\\": 23.7808,\n  \\"dropLng\\": 90.4074\n}"
            },
            "url": "{{baseUrl}}/api/riders/requests"
          }
        },
        {
          "name": "Get Rider Requests",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/api/riders/1/requests"
          }
        },
        {
          "name": "Cancel Ride Request",
          "request": {
            "method": "POST",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/api/riders/requests/1/cancel"
          }
        }
      ]
    },
    {
      "name": "driver-service",
      "item": [
        {
          "name": "Register Driver",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \\"userId\\": 2,\n  \\"name\\": \\"Karim Driver\\",\n  \\"email\\": \\"karim@example.com\\",\n  \\"phone\\": \\"01700000000\\",\n  \\"licenseNumber\\": \\"LIC-001\\"\n}"
            },
            "url": "{{baseUrl}}/api/drivers"
          }
        },
        {
          "name": "Add Vehicle",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \\"make\\": \\"Toyota\\",\n  \\"model\\": \\"Corolla\\",\n  \\"plateNumber\\": \\"DHA-1234\\",\n  \\"color\\": \\"White\\"\n}"
            },
            "url": "{{baseUrl}}/api/drivers/1/vehicles"
          }
        },
        {
          "name": "Update Driver Status",
          "request": {
            "method": "PATCH",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \\"status\\": \\"AVAILABLE\\",\n  \\"currentLat\\": 23.8110,\n  \\"currentLng\\": 90.4130\n}"
            },
            "url": "{{baseUrl}}/api/drivers/1/status"
          }
        },
        {
          "name": "Get Available Drivers",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/api/drivers/available?lat=23.8103&lng=90.4125&radiusKm=5"
          }
        },
        {
          "name": "Get Driver",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/api/drivers/1"
          }
        }
      ]
    },
    {
      "name": "matching-service",
      "item": [
        {
          "name": "Find Driver",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \\"rideRequestId\\": 1,\n  \\"riderId\\": 1,\n  \\"pickupLat\\": 23.8103,\n  \\"pickupLng\\": 90.4125,\n  \\"dropLat\\": 23.7808,\n  \\"dropLng\\": 90.4074\n}"
            },
            "url": "{{baseUrl}}/api/matching/find-driver"
          }
        }
      ]
    },
    {
      "name": "trip-service",
      "item": [
        {
          "name": "Get Trip",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/api/trips/1"
          }
        },
        {
          "name": "Start Trip",
          "request": {
            "method": "POST",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/api/trips/1/start"
          }
        },
        {
          "name": "Complete Trip",
          "request": {
            "method": "POST",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/api/trips/1/complete"
          }
        },
        {
          "name": "Cancel Trip",
          "request": {
            "method": "POST",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/api/trips/1/cancel"
          }
        }
      ]
    },
    {
      "name": "payment-service",
      "item": [
        {
          "name": "Get Payment by Trip",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/api/payments/trip/1"
          }
        },
        {
          "name": "Request Refund",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \\"reason\\": \\"Trip cancelled after payment\\"\n}"
            },
            "url": "{{baseUrl}}/api/payments/1/refund"
          }
        }
      ]
    },
    {
      "name": "notification-service",
      "item": [
        {
          "name": "Get User Notifications",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/api/notifications/user/1"
          }
        },
        {
          "name": "Mark Notification Read",
          "request": {
            "method": "PATCH",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/api/notifications/1/read"
          }
        }
      ]
    }
  ]
}
'''
write("postman/Uthao.postman_collection.json", postman)

print("Root files done.")


# ── Shared helper snippets ──────────────────────────────────────────────────

JJWT_DEPS = f"""\
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>{JJWT}</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>{JJWT}</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>{JJWT}</version>
            <scope>runtime</scope>
        </dependency>"""

LOMBOK = """\
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>"""

EUREKA = """\
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
        </dependency>"""

WEB_JPA_PG = """\
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>"""

AMQP = """\
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-amqp</artifactId>
        </dependency>"""

VALIDATION = """\
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>"""


def app_yml(port: int, name: str, db: str | None = None, extra: str = "", rabbit: bool = False) -> str:
    ds = ""
    if db:
        ds = f"""
  datasource:
    url: jdbc:postgresql://localhost:5432/{db}
    username: postgres
    password: postgres
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true"""
    rmq = ""
    if rabbit:
        rmq = """
  rabbitmq:
    host: localhost
    port: 5672
    username: guest
    password: guest"""
    return f"""server:
  port: {port}
spring:
  application:
    name: {name}{ds}{rmq}{extra}
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka
"""


def java_src(service_dir: str, pkg: str, rel: str) -> str:
    return f"{service_dir}/src/main/java/com/uthao/{pkg}/{rel}"


def res(service_dir: str, rel: str) -> str:
    return f"{service_dir}/src/main/resources/{rel}"


# ═══════════════════════════════════════════════════════════════════════════
# 1. eureka-server
# ═══════════════════════════════════════════════════════════════════════════
print("eureka-server...")
write("eureka-server/pom.xml", pom("eureka-server", "eureka-server", f"""\
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-netflix-eureka-server</artifactId>
        </dependency>
{LOMBOK}"""))

write(java_src("eureka-server", "eureka", "EurekaServerApplication.java"), """\
package com.uthao.eureka;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

@SpringBootApplication
@EnableEurekaServer
public class EurekaServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(EurekaServerApplication.class, args);
    }
}
""")

write(res("eureka-server", "application.yml"), """\
server:
  port: 8761
spring:
  application:
    name: eureka-server
eureka:
  client:
    register-with-eureka: false
    fetch-registry: false
""")


# ═══════════════════════════════════════════════════════════════════════════
# 2. api-gateway
# ═══════════════════════════════════════════════════════════════════════════
print("api-gateway...")
write("api-gateway/pom.xml", pom("api-gateway", "api-gateway", f"""\
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-gateway</artifactId>
        </dependency>
{EUREKA}
{JJWT_DEPS}
{LOMBOK}"""))

write(java_src("api-gateway", "gateway", "GatewayApplication.java"), """\
package com.uthao.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class GatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
""")

write(java_src("api-gateway", "gateway", "filter/JwtAuthFilter.java"), f"""\
package com.uthao.gateway.filter;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

@Component
public class JwtAuthFilter implements GlobalFilter, Ordered {{

    @Value("${{jwt.secret}}")
    private String jwtSecret;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {{
        String path = exchange.getRequest().getURI().getPath();

        if (path.startsWith("/api/auth") || path.startsWith("/auth")) {{
            return chain.filter(exchange);
        }}

        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {{
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }}

        String token = authHeader.substring(7);
        try {{
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return chain.filter(exchange);
        }} catch (Exception e) {{
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }}
    }}

    @Override
    public int getOrder() {{
        return -1;
    }}
}}
""")

write(java_src("api-gateway", "gateway", "config/RouteConfig.java"), """\
package com.uthao.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RouteConfig {

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                .route("identity-service", r -> r.path("/api/auth/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://identity-service"))
                .route("rider-service", r -> r.path("/api/riders/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://rider-service"))
                .route("driver-service", r -> r.path("/api/drivers/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://driver-service"))
                .route("matching-service", r -> r.path("/api/matching/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://matching-service"))
                .route("trip-service", r -> r.path("/api/trips/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://trip-service"))
                .route("payment-service", r -> r.path("/api/payments/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://payment-service"))
                .route("notification-service", r -> r.path("/api/notifications/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://notification-service"))
                .build();
    }
}
""")

write(res("api-gateway", "application.yml"), f"""\
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
  secret: {JWT_SECRET}
""")


# ═══════════════════════════════════════════════════════════════════════════
# 3. identity-service
# ═══════════════════════════════════════════════════════════════════════════
print("identity-service...")
write("identity-service/pom.xml", pom("identity-service", "identity-service", f"""\
{WEB_JPA_PG}
{EUREKA}
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
{JJWT_DEPS}
{LOMBOK}
{VALIDATION}"""))

write(java_src("identity-service", "identity", "IdentityServiceApplication.java"), """\
package com.uthao.identity;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class IdentityServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(IdentityServiceApplication.class, args);
    }
}
""")

write(java_src("identity-service", "identity", "model/User.java"), """\
package com.uthao.identity.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(unique = true)
    private String email;

    private String password;

    private String role;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
""")

write(java_src("identity-service", "identity", "dto/RegisterRequest.java"), """\
package com.uthao.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank
    private String name;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String password;

    @NotBlank
    private String role;
}
""")

write(java_src("identity-service", "identity", "dto/LoginRequest.java"), """\
package com.uthao.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String password;
}
""")

write(java_src("identity-service", "identity", "dto/AuthResponse.java"), """\
package com.uthao.identity.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;
    private Long userId;
    private String name;
    private String role;
}
""")

write(java_src("identity-service", "identity", "repository/UserRepository.java"), """\
package com.uthao.identity.repository;

import com.uthao.identity.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}
""")

write(java_src("identity-service", "identity", "security/JwtUtil.java"), f"""\
package com.uthao.identity.security;

import com.uthao.identity.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {{

    @Value("${{jwt.secret}}")
    private String jwtSecret;

    private SecretKey key() {{
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }}

    public String generateToken(User user) {{
        return Jwts.builder()
                .claim("userId", user.getId())
                .claim("role", user.getRole())
                .setSubject(user.getEmail())
                .setIssuedAt(new Date())
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }}

    public boolean validateToken(String token) {{
        try {{
            Jwts.parserBuilder().setSigningKey(key()).build().parseClaimsJws(token);
            return true;
        }} catch (Exception e) {{
            return false;
        }}
    }}

    public Claims getClaims(String token) {{
        return Jwts.parserBuilder().setSigningKey(key()).build().parseClaimsJws(token).getBody();
    }}
}}
""")

write(java_src("identity-service", "identity", "security/SecurityConfig.java"), """\
package com.uthao.identity.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/**").permitAll()
                        .anyRequest().authenticated()
                )
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable());
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
""")

write(java_src("identity-service", "identity", "service/AuthService.java"), """\
package com.uthao.identity.service;

import com.uthao.identity.dto.AuthResponse;
import com.uthao.identity.dto.LoginRequest;
import com.uthao.identity.dto.RegisterRequest;
import com.uthao.identity.model.User;
import com.uthao.identity.repository.UserRepository;
import com.uthao.identity.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole().toUpperCase())
                .build();

        user = userRepository.save(user);
        String token = jwtUtil.generateToken(user);

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .name(user.getName())
                .role(user.getRole())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwtUtil.generateToken(user);

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .name(user.getName())
                .role(user.getRole())
                .build();
    }
}
""")

write(java_src("identity-service", "identity", "controller/AuthController.java"), """\
package com.uthao.identity.controller;

import com.uthao.identity.dto.AuthResponse;
import com.uthao.identity.dto.LoginRequest;
import com.uthao.identity.dto.RegisterRequest;
import com.uthao.identity.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }
}
""")

write(res("identity-service", "application.yml"), f"""\
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
  secret: {JWT_SECRET}
""")


# Continue in part 2...
print("Part 1 complete — continuing in part 2...")
