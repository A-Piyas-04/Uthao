# Person A — Identity Service + API Gateway

**Owns:** `identity-service` (8081), `api-gateway` (8080)  
**Branch:** `feature/identity-gateway` (work currently on `pias`; rename/PR later)  
**Do not edit:** other service folders (ask the owner + update `Docs/CONTRACTS.md` first)

> Read this after [`Docs/CONTRACTS.md`](../CONTRACTS.md) and the root [`README.md`](../../README.md).  
> Full plan context: [`Docs/Uthao_Development_Plan.md`](../Uthao_Development_Plan.md) § Person A.

---

## Code status — complete (no runtime yet)

Person A **coding ownership is done**. Do not treat missing Docker/Eureka/Postman runs as incomplete code.

### `identity-service`

| Piece | Location | Status |
|-------|----------|--------|
| App + Eureka client | `IdentityServiceApplication.java` | Done |
| `User` entity (`role` column, BCrypt password) | `model/User.java` | Done |
| DTOs | `RegisterRequest`, `LoginRequest`, `AuthResponse`, `MeResponse`, `ErrorResponse` | Done |
| `UserRepository.findByEmail` | `repository/UserRepository.java` | Done |
| JWT util (claims `userId`, `role`, no expiry) | `security/JwtUtil.java` | Done |
| Security (stateless, permit `/auth/**`) | `security/SecurityConfig.java` | Done |
| Register / login | `AuthService` + `AuthController` | Done |
| Role allowlist (`RIDER`/`DRIVER`) + email normalize | `AuthService` | Done |
| Consistent error JSON | `exception/GlobalExceptionHandler.java` | Done |
| `GET /auth/me` (Bearer checked in service) | `AuthController` + `AuthService` | Done |
| Config | port 8081, `identity_db`, JWT secret | Done |

### `api-gateway`

| Piece | Location | Status |
|-------|----------|--------|
| Reactive gateway + Eureka | `GatewayApplication.java` | Done |
| Routes `/api/...` → `lb://...` + strip `/api` | `config/RouteConfig.java` | Done |
| JWT `GlobalFilter` (open `/api/auth` and `/api/auth/**` only) | `filter/JwtAuthFilter.java` | Done |
| LoadBalancer dependency | `pom.xml` | Done |
| Config | port 8080, JWT secret, `web-application-type: reactive` | Done |

### Shared artifacts

| Piece | Location | Status |
|-------|----------|--------|
| Postman identity folder | `postman/Uthao.postman_collection.json` | Done (Register Rider, Register Driver, Login, Get Me) |
| Shared JWT secret | `uthao-super-secret-jwt-key-2024` | Must match `CONTRACTS.md` |

**Shared secret (must not change alone):** `uthao-super-secret-jwt-key-2024`

---

## Sequential steps (reference — original order)

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

### Step 1 — Walk the existing Identity code (30–45 min)

Open and understand (don’t rewrite blindly):

1. `model/User.java` — fields, unique email, `createdAt`.
2. `AuthService.register` — email uniqueness, BCrypt encode, JWT return.
3. `AuthService.login` — find by email, `passwordEncoder.matches`, JWT return.
4. `JwtUtil.generateToken` — claims match `CONTRACTS.md`.
5. `SecurityConfig` — `/auth/**` open; form login disabled.

**Acceptance:** You can explain register → hash → token without looking at notes.

### Step 2 — Run Identity alone and test with Postman (45–60 min)

1. Start **Eureka** (Person B’s service — or ask them to leave it running). Until Eureka is up, Identity may still boot but won’t register.
2. From `identity-service/`:
   ```bash
   mvn spring-boot:run
   ```
3. Hit Identity **directly** (bypass gateway first): register rider, register driver, login.
4. Verify in Postgres (`identity_db` → `users`): password is **hashed**, not plaintext.
5. Negative cases: duplicate email → `409`; wrong password → `401`; invalid body → validation error.

**Acceptance:** Register + login return `{ token, userId, name, role }`.

### Step 3 — Harden Identity (done in code)

Already implemented: consistent errors, role allowlist, `GET /auth/me`. No `roles` / `user_roles` join table.

### Step 4 — Walk the Gateway code (30 min)

1. `RouteConfig` — every `/api/<resource>/**` maps to the right `lb://service` with `stripPrefix(1)`.
2. `JwtAuthFilter` — whitelist `/api/auth` and `/auth` prefixes precisely; otherwise require `Authorization: Bearer …`.
3. Confirm `application.yml` has `web-application-type: reactive`.

**Acceptance:** You know why `/api/auth/register` becomes `/auth/register` on Identity.

### Step 5 — Solo Gateway test with hardcoded URI (optional debug)

If `lb://identity-service` fails while Eureka isn’t ready:

1. Temporarily change **only** the identity route to `http://localhost:8081` for local debugging.
2. Test `POST http://localhost:8080/api/auth/register`.
3. Revert to `lb://identity-service` before push / integration.

### Step 6 — Full Gateway + JWT path

Prerequisites: Eureka running; Identity registered at http://localhost:8761.

1. Start `api-gateway` (`mvn spring-boot:run`).
2. Register/login via `http://localhost:8080/api/auth/...`.
3. Set Postman collection variable `token` from login response.
4. Protected route without token → **401**; with Bearer → not 401 from the filter (404/503 OK if downstream is down).

### Step 7 — Postman folder ownership (done in code)

Identity requests updated: Register Rider, Register Driver, Login (no Bearer), Get Me (Bearer `{{token}}`). After login during testing, set collection `token`.

### Step 8 — Integration window (with team)

1. Confirm JWT secret matches `Docs/CONTRACTS.md` exactly.
2. Run shared smoke path starting with register/login.
3. Gateway `503` → check Eureka registration; don’t “fix” other services’ logic.
4. Open PR from `feature/identity-gateway` → `main` when ready.

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

### Code (done)

- [x] Identity register/login/me endpoints implemented
- [x] Passwords hashed with BCrypt in register path
- [x] Role allowlist + consistent error JSON
- [x] Gateway routes `/api/auth/**` → Identity (`lb://` + stripPrefix)
- [x] JWT required on non-auth routes in `JwtAuthFilter`
- [x] Postman identity requests updated (Register Rider/Driver, Login, Get Me)

### Runtime / git (later — not started)

- [ ] Branch `feature/identity-gateway` created and pushed
- [ ] Identity register/login verified live on `:8081`
- [ ] Passwords verified hashed in Postgres
- [ ] Gateway JWT smoke verified live (401 without token; auth open)
- [ ] Token works through gateway for a protected route
- [ ] Postman exercised end-to-end; collection `token` set after login
- [ ] PR opened into `main`

---

## Testing & debugging (later)

Do this when Docker, Eureka, and Postman are available. **Do not block on it for code completeness.**

### T1 — Infra

1. `docker compose up -d`
2. Confirm Postgres has `identity_db`
3. Confirm RabbitMQ UI at http://localhost:15672

### T2 — Identity direct (bypass gateway)

1. Start Eureka (Person B) if possible.
2. `cd identity-service && mvn spring-boot:run`
3. `POST :8081/auth/register` (RIDER + DRIVER), `POST :8081/auth/login`, `GET :8081/auth/me` with Bearer.
4. Postgres check: `users.password` is BCrypt, not plaintext.
5. Negatives: duplicate email → 409; bad password → 401; blank email → 400; bad role → 400.

### T3 — Gateway + JWT

1. With Eureka up and Identity registered at http://localhost:8761, start `api-gateway`.
2. `POST :8080/api/auth/register` and `/login`.
3. `GET :8080/api/drivers/1` **without** token → **401**.
4. Same with `Authorization: Bearer <token>` → not 401 from filter (404/503 OK if Driver down).
5. `GET :8080/api/auth/me` with Bearer → user info.

### T4 — Optional `lb://` debug

If identity route fails via Eureka: temporarily point identity route at `http://localhost:8081`, retest, **revert to `lb://identity-service`** before sharing the branch.

### T5 — Postman

1. Import `postman/Uthao.postman_collection.json`.
2. Run Register Rider / Login; copy `token` into collection variable `token`.
3. Run Get Me and one protected non-auth request.
4. Confirm Register/Login send **no** Bearer header.

### T6 — Integration / PR

1. Diff JWT secret against `Docs/CONTRACTS.md`.
2. Team smoke: your register/login first, then others’ flows.
3. On gateway `503`, check Eureka — don’t change other services’ business logic.
4. Create/rename to `feature/identity-gateway`, push, open PR → `main`.

### Debug cheat sheet

| Symptom | Likely cause | What to check |
|---------|--------------|---------------|
| Identity won’t start | Postgres / `identity_db` missing | Docker compose, JDBC URL |
| Register 409 always | Email already exists | Use a new email or truncate `users` |
| Login 401 | Wrong password or email case | Email is normalized lowercase in code |
| Gateway 401 on `/api/auth/*` | Filter whitelist broken | Path must be `/api/auth/...` |
| Gateway 503 | Service not in Eureka | Eureka UI; service name matches `lb://` |
| Token invalid on gateway | Secret mismatch | Same `jwt.secret` in identity + gateway |
| `/auth/me` 401 | Missing/invalid Bearer | Header `Authorization: Bearer <token>` |

---

## Out of scope for you

Rider/driver/matching/trip/payment/notification business logic, Eureka server implementation, RabbitMQ event publishers/listeners in other services, frontend.
