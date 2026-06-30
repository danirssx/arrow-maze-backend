# Spec — Refresh-token rotation + server-side logout/revocation (Backend)

Date: 2026-06-29
Ticket: `MAZ-175`
Source: M9 audit — auth defect #1 (biggest gap) + #7. Source MAZ-78 (AM-007). Aligns client auth DTOs with MAZ-180.
Status: approved pending human gate. The `@s` scenarios in `specs/refresh-token-MAZ-175.feature` are the executable contract.
Base: `origin/develop` (has MAZ-174 `/users/me` + CA-002 IdGenerator/Clock).

## Purpose

Auth is a single 7-day stateless access token with no refresh, logout, or revocation. Once login is
mandatory, sessions silently die after the TTL and a stolen token can't be invalidated. This slice adds
a **short-lived access token** + a **long-lived, opaque, hashed, rotating refresh token** with
**reuse-detection**, `POST /auth/refresh`, and `POST /auth/logout` (revocation).

## In scope / Out of scope

- In scope: env-driven access TTL (remove the hardcoded `"7d"`); a `RefreshToken` domain entity; a
  `RefreshTokenRepository` port + Prisma impl + migration; a `RefreshTokenGenerator` port (opaque
  random + hash) + crypto impl; `RefreshAccessTokenUseCase` (rotation + reuse-detection) and
  `LogoutUseCase`; `LoginUseCase` issuing + persisting a refresh token; `POST /auth/refresh` +
  `POST /auth/logout`; Swagger + tests; `.env.example`/README.
- Out of scope: the **client** refresh-and-retry-on-401 flow (a follow-up to MAZ-180; without it a short
  access TTL would force re-login each expiry — see Risks); cookie-based token transport (tokens stay in
  the JSON body, matching the current client); MAZ-177 admin authorization.

## Behavior

- **Login** verifies credentials (unchanged), then issues an access token (JWT, short TTL) **and** an
  opaque refresh token; the refresh token's hash + expiry are persisted for the user; the response is
  `{ accessToken, refreshToken, userId, username, role }`.
- **Refresh** (`POST /auth/refresh`, body `{ refreshToken }`): hash the presented token and look it up.
  - Not found → 401.
  - Found but **revoked** → reuse/theft: revoke **all** active refresh tokens for that user → 401.
  - Expired → 401.
  - Active → **rotate**: issue a new refresh token, revoke the old one (mark `replacedByTokenId`), mint a
    new access token (the user is re-read to confirm still active and to get the role) → `{ accessToken, refreshToken }`.
- **Logout** (`POST /auth/logout`, body `{ refreshToken }`): revoke the matching token; idempotent
  (200 even if already revoked/unknown, to avoid token-probing).
- Invalid/expired/reused refresh tokens map to `UnauthorizedError` (401), consistent with `authMiddleware`.

## Domain invariants

- `RefreshToken.isActive(now)` ⟺ not revoked **and** `now < expiresAt`. `revoke(now, replacedById?)` sets
  `revokedAt` (and the rotation link). Expiry/revocation logic lives in the entity, not the use cases.

## Architecture placement / Clean Architecture contract

Applicable rules from `docs/reglas_clean_arch.md`:

- [x] Regla de dependencia (inward only).
- [x] Independencia del dominio — the `RefreshToken` entity has no crypto/Date/JWT; randomness, hashing
  and JWT live in infrastructure; id/now come from the injected `IdGenerator`/`Clock` (CA-002).
- [x] Application solo orquesta — use cases orchestrate repo + generator + token service; no infra imports.
- [x] Repositorios: interfaz adentro (`application/identity/ports/RefreshTokenRepository`), impl afuera.
- [x] DTOs simples en fronteras (primitives/records).
- [x] Invariantes en VO/agregados — `RefreshToken` entity + `RefreshTokenId` VO; not in controllers.
- [x] Errores de dominio sin semántica HTTP — `UnauthorizedError` (application) maps to 401 in framework.

Layer impact:

- Domain: `src/domain/identity/RefreshToken.ts` (entity), `src/domain/identity/value-objects/RefreshTokenId.ts` (UUID VO).
- Application: `ports/RefreshTokenRepository.ts`, `ports/RefreshTokenGenerator.ts`; `use-cases/RefreshAccessTokenUseCase.ts`, `use-cases/LogoutUseCase.ts`; extend `LoginUseCase` (output + persistence).
- Infrastructure: `identity/PrismaRefreshTokenRepository.ts`, `identity/CryptoRefreshTokenGenerator.ts` (`randomBytes` + `sha256`); `identity/JwtTokenService.ts` (env-driven access TTL).
- Framework: `identity/IdentityController.ts` (`refresh`/`logout`), `identity/identityRoutes.ts` (2 routes), `config/environment.ts` (`JWT_ACCESS_EXPIRES_IN`, `REFRESH_TOKEN_TTL_DAYS`), `app.ts` (wiring; login/refresh/logout become transactional), `swagger/openApiSpec.ts`.
- Prisma: `RefreshToken` model + new timestamped migration `…_add_refresh_tokens` (FK `user_id`→`users` cascade, unique `token_hash`).

Required tests:

- Domain: `RefreshToken` (issue/isActive/revoke/expiry), `RefreshTokenId`.
- Application: `RefreshAccessTokenUseCase` (rotate/expired/unknown/reuse), `LogoutUseCase`, `LoginUseCase` (issues+persists refresh).
- Adapter/API: `CryptoRefreshTokenGenerator` (uniqueness, hash determinism), `PrismaRefreshTokenRepository` (mocked), Supertest `refresh`/`logout` (happy + 401), Swagger guard.

## Edge cases

- Not found / expired / revoked-reuse / valid. Logout idempotent. User suspended/deleted between
  refreshes → 401 (re-read user; non-active → reject). Concurrent refresh of the same token → the
  unique `token_hash` + revoke-on-rotate make the second a reuse → family revoked.

## Acceptance criteria (Given/When/Then)

See `specs/refresh-token-MAZ-175.feature` `@s1..@s7`. Ticket ACs: valid refresh → new access + rotated
refresh; revoked/expired → 401; logout → later refresh 401.

## Decisions

- **Opaque random refresh token (32 bytes, base64url), stored as a SHA-256 hash** (lookup by hash):
  revocable, rotatable, and a DB leak exposes no usable token. Discarded: a second JWT (not revocable
  without a denylist).
- **Rotation with reuse-detection**: each refresh revokes the old token and issues a new one; presenting
  an already-revoked token revokes the user's whole family (theft response). Standard OAuth pattern.
- **Access TTL env-driven, default `15m`** (`JWT_ACCESS_EXPIRES_IN`); refresh TTL `REFRESH_TOKEN_TTL_DAYS`
  default 30. Reuse the CA-002 `Clock` for refresh expiry and `IdGenerator` for ids.
- **Login/refresh/logout become transactional** (they persist refresh tokens), wrapped in the existing
  `TransactionDecorator`.
- **`RefreshToken` is a domain entity** (lifecycle invariants) — proposed for team approval per AGENTS §2/§8.

## Risks / OPEN QUESTIONS

- **Client follow-up required:** MAZ-180 (client) currently hard-logs-out on 401. With a 15m access TTL
  and no client refresh-and-retry, users re-login every 15 min. A follow-up client ticket must add
  "on 401 → try `/auth/refresh` once → retry; only logout if refresh fails". Until then, the deployed
  `JWT_ACCESS_EXPIRES_IN` can be set longer. (Offer to create the follow-up ticket.)
- Whether to also accept the access token (Bearer) on `/auth/logout` in addition to the refresh body —
  kept body-only for symmetry with refresh.
