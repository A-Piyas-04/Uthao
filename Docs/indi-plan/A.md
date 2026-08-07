# Person A — Identity Service + API Gateway

**Owns:** `identity-service` (8081), `api-gateway` (8080)  
**Branch:** `feature/identity-gateway`  
**Do not edit:** other service folders (ask the owner + update `Docs/CONTRACTS.md` first)

> Read this after [`Docs/CONTRACTS.md`](../CONTRACTS.md) and the root [`README.md`](../../README.md).  
> Full plan context: [`Docs/Uthao_Development_Plan.md`](../Uthao_Development_Plan.md) § Person A.

---

## What is already done in the repo

You are **not** starting from Spring Initializr. The scaffold already includes compiling code for both of your services.

### `identity-service`

| Piece | Location | Status |
|-------|----------|--------|
| App + Eureka client | `IdentityServiceApplication.java` | Done |
| `User` entity (`role` column, BCrypt password) | `model/User.java` | Done |
| DTOs | `RegisterRequest`, `LoginRequest`, `AuthResponse` | Done |
| `UserRepository.findByEmail` | `repository/UserRepository.java` | Done |
| JWT util (claims `userId`, `role`, no expiry) | `security/JwtUtil.java` | Done |
| Security (stateless, permit `/auth/**`) | `security/SecurityConfig.java` | Done |
| Register / login | `AuthService` + `AuthController` | Done |
| Role allowlist + error JSON + `GET /auth/me` | `AuthService`, `GlobalExceptionHandler`, `MeResponse` | Done (code-only) |
| Config | port 8081, `identity_db`, JWT secret | Done |

### `api-gateway`

| Piece | Location | Status |
|-------|----------|--------|
| Reactive gateway + Eureka | `GatewayApplication.java` | Done |
| Routes `/api/...` → `lb://...` + strip `/api` | `config/RouteConfig.java` | Done |
| JWT `GlobalFilter` (skip `/api/auth/**`) | `filter/JwtAuthFilter.java` | Done |
| LoadBalancer dependency | `pom.xml` | Done |
| Config | port 8080, JWT secret | Done |

**Shared secret (must not change alone):** `uthao-super-secret-jwt-key-2024`

---

## Sequential steps (follow in order)

### Step 0 — Setup (15–20 min)

1. Clone / pull the monorepo.
2. Create your branch:
   ```bash
   git checkout -b feature/identity-gateway
   ```
3. Confirm JDK 21, Maven, Docker Desktop.
4. Start infra only:
   ```bash
   docker compose up -d
   ```
5. Confirm Postgres has `identity_db` and RabbitMQ UI loads at http://localhost:15672 (you won’t publish events, but compose must be healthy for the team).

---

### Step 1 — Walk the existing Identity code (30–45 min)

Open and understand (don’t rewrite blindly):

1. `model/User.java` — fields, unique email, `createdAt`.
2. `AuthService.register` — email uniqueness, BCrypt encode, JWT return.
3. `AuthService.login` — find by email, `passwordEncoder.matches`, JWT return.
4. `JwtUtil.generateToken` — claims match `CONTRACTS.md`.
5. `SecurityConfig` — `/auth/**` open; form login disabled.

**Acceptance:** You can explain register → hash → token without looking at notes.

---

### Step 2 — Run Identity alone and test with Postman (45–60 min)

1. Start **Eureka** (Person B’s service — or ask them to leave it running). Until Eureka is up, Identity may still boot but won’t register.
2. From `identity-service/`:
   ```bash
   mvn spring-boot:run
   ```
3. Hit Identity **directly** (bypass gateway first):

   **Register rider**
   ```http
   POST http://localhost:8081/auth/register
   Content-Type: application/json

   {
     "name": "Alice Rider",
     "email": "alice@example.com",
     "password": "password123",
     "role": "RIDER"
   }
   ```

   **Register driver**
   ```http
   POST http://localhost:8081/auth/register
   {
     "name": "Karim Driver",
     "email": "karim@example.com",
     "password": "password123",
     "role": "DRIVER"
   }
   ```

   **Login**
   ```http
   POST http://localhost:8081/auth/login
   {
     "email": "alice@example.com",
     "password": "password123"
   }
   ```

4. Verify in Postgres (`identity_db` → `users`): password is **hashed**, not plaintext.
5. Negative cases to harden if missing:
   - Duplicate email → should be `409` / conflict (already in scaffold).
   - Wrong password → `401`.
   - Invalid body (blank email) → validation error.

**Acceptance:** Register + login return `{ token, userId, name, role }`.

---

### Step 3 — Harden Identity (1–2 h, only if needed)

Work **inside** `identity-service` only. Suggested improvements (pick what fails in Step 2):

1. Clearer error messages / consistent HTTP status codes.
2. Normalize `role` to uppercase (`RIDER` / `DRIVER`) and reject unknown roles.
3. Optional stretch from the plan: `GET /auth/me` that decodes the Bearer token and returns user info (useful for demos).
4. Do **not** introduce a separate `roles` / `user_roles` join table unless you have spare time — current `role` column matches the scaffold and contracts.

Commit when register/login feel solid.

---

### Step 4 — Walk the Gateway code (30 min)

1. `RouteConfig` — every `/api/<resource>/**` maps to the right `lb://service` with `stripPrefix(1)`.
2. `JwtAuthFilter` — whitelist `/api/auth` and `/auth`; otherwise require `Authorization: Bearer …` and validate with the shared secret.
3. Confirm `application.yml` has `web-application-type: reactive`.

**Acceptance:** You know why `/api/auth/register` becomes `/auth/register` on Identity.

---

### Step 5 — Solo Gateway test with hardcoded URI (optional, if Eureka/lb fails) (30–45 min)

If `lb://identity-service` fails while Eureka isn’t ready:

1. Temporarily change **only** the identity route to `http://localhost:8081` for local debugging.
2. Test:
   ```http
   POST http://localhost:8080/api/auth/register
   ```
3. Revert to `lb://identity-service` before push / integration. Do not leave hardcoded URLs on the shared branch.

---

### Step 6 — Full Gateway + JWT path (1–1.5 h)

Prerequisites: Eureka running; Identity registered at http://localhost:8761.

1. Start `api-gateway`:
   ```bash
   cd api-gateway && mvn spring-boot:run
   ```
2. Register/login via gateway:
   ```http
   POST http://localhost:8080/api/auth/register
   POST http://localhost:8080/api/auth/login
   ```
3. Copy `token` into Postman collection variable `token` (`postman/Uthao.postman_collection.json`).
4. Prove filter works:
   - Call any protected route (e.g. `GET http://localhost:8080/api/drivers/1`) **without** token → **401**.
   - Same call **with** `Authorization: Bearer {{token}}` → not 401 from the filter (may be 404/503 if Driver isn’t up — that’s OK for your solo test).

**Acceptance:** Auth open; everything else blocked without a valid JWT.

---

### Step 7 — Postman folder ownership (30 min)

1. Import / update the **identity-service** requests in the shared collection.
2. Ensure register + login do **not** send Bearer token.
3. Document in a short PR note: “set collection `token` after login.”

---

### Step 8 — Integration window (with team)

1. Confirm JWT secret matches `Docs/CONTRACTS.md` exactly.
2. After others’ services are up, run the shared smoke path starting with your register/login steps.
3. If gateway returns `503`, check Eureka registration — don’t “fix” someone else’s service logic.
4. Open PR from `feature/identity-gateway` → `main`. Merge one PR at a time with the team.

---

## Files you should touch

```text
identity-service/
  src/main/java/com/uthao/identity/...
  src/main/resources/application.yml
  pom.xml   (only if adding a dep you need)

api-gateway/
  src/main/java/com/uthao/gateway/...
  src/main/resources/application.yml
  pom.xml
```

Also OK: `postman/Uthao.postman_collection.json` (identity folder), docs if contracts change (team agreement).

---

## Done checklist

- [ ] Branch created and pushed — **deferred** (staying on `pias`)
- [ ] Identity register/login work on `:8081` — **deferred** (needs DB + run)
- [ ] Passwords stored as BCrypt hashes — **deferred** (needs Postgres verify)
- [x] Gateway routes `/api/auth/**` → Identity — scaffold + whitelist tightened in code
- [x] JWT required on non-auth routes (401 without token) — filter in code; live smoke **deferred**
- [ ] Token works through gateway for protected routes — **deferred** (needs Eureka + services)
- [ ] Postman identity requests updated — **deferred**
- [ ] PR opened into `main` — **deferred**

---

## Deferred / skipped for now

Code-only pass: no Docker, Postgres, Eureka, Postman, IntelliJ run configs, or PR. Work stays on branch `pias`.

| Deferred item | Why |
|---------------|-----|
| Step 0 — `docker compose`, Postgres `identity_db`, RabbitMQ UI | Needs Docker Desktop / DB |
| Branch `feature/identity-gateway` create + push | Staying on `pias` for now |
| Step 2 — `mvn spring-boot:run` + Postman register/login + DB hash check | Needs DB + Eureka + Postman |
| Step 5 — hardcoded `http://localhost:8081` gateway debug | Needs running services |
| Step 6 — full gateway JWT smoke (401 without token) | Needs Eureka + running gateway/identity |
| Step 7 — Postman identity folder updates | Postman deferred |
| Step 8 — team integration + PR → `main` | Needs team / remote workflow |
| Runtime acceptance of Done checklist items that need live services | Same |

**Done in this code-only pass (Step 3 + gateway polish):** role allowlist (`RIDER`/`DRIVER`), consistent error JSON via `GlobalExceptionHandler`, `GET /auth/me`, tighter gateway JWT whitelist paths. Compile verified with portable Maven (`mvn -DskipTests compile` on both services); system `mvn` was not on PATH. No live HTTP tests.

---

## Out of scope for you

Rider/driver/matching/trip/payment/notification business logic, Eureka server implementation, RabbitMQ event publishers/listeners in other services, frontend.
