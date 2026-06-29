# AI Usage Log: MAZ-175 — Refresh-token rotation + server-side logout/revocation

## Task / Problem

Auth was a single 7-day stateless access token with no refresh, logout, or revocation: once login is
mandatory, sessions silently die after the TTL and a stolen token cannot be invalidated. This slice adds
a short-lived, env-driven access token plus a long-lived, opaque, hashed, **rotating** refresh token with
**reuse-detection**, `POST /auth/refresh`, and `POST /auth/logout`.

## Tool and Model

Claude Opus 4.8 (1M context) via Claude Code CLI.

## Prompt Used

User requested starting MAZ-175 following the team workflow (review both AGENTS.md, new worktree, root
MEMORY.md + Linear_MCP_Guideline.md, register AI usage, run all checks, update MEMORY/AGENTS,
commit/push/PR/Linear). The `.feature` (@s1..@s7) and the 6 decisions (opaque token + SHA-256 hash;
new `RefreshToken` entity + ports + 2 use cases; rotation + reuse-detection; transactional login/refresh/
logout; new Prisma model + timestamped migration; idempotent logout; access TTL env default 15m with a
required client follow-up) were human-approved before TDD.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Referenced | Followed AGENTS §0.2; a read-only sub-agent mapped the auth subsystem (token service, CA-002 IdGenerator/Clock, login output, Prisma model + migration approach, controller/routes/app wiring, swagger, test patterns); distilled into the CA spec. | `specs/refresh-token-MAZ-175.spec.md` |
| Planner / Gherkin Author (`.agents/planner.md`) | Referenced | Authored 7 `@s` scenarios (login issues+persists refresh; rotate; expired/unknown/reuse→401; logout revokes; entity activity invariant); single human gate. | `specs/refresh-token-MAZ-175.feature` |
| TDD Implementer (`.agents/tdd-implementer.md`) | Referenced | Red→Green→Refactor inside-out: domain (`RefreshToken`/`RefreshTokenId`) → application (ports + `RefreshAccessTokenUseCase`/`LogoutUseCase` + `LoginUseCase`) → infra (`CryptoRefreshTokenGenerator`, `PrismaRefreshTokenRepository`, JWT TTL) → framework (controller/routes/env/app) → prisma model+migration → swagger/docs. | tests, code, commit, this entry |
| Judge (`.agents/judge.md`) | Referenced | Self-review vs `docs/reglas_clean_arch.md`: the `RefreshToken` entity has no crypto/Date/JWT (id/now injected via CA-002 ports; randomness/hashing in infra); use cases orchestrate only; repository interface in application, impl in infra; `UnauthorizedError` (application) maps to 401 in framework; `@s → test` complete. Verdict: PASS. | this entry, spec CA block |
| Mutation Tester (`.agents/mutation.md`) | Referenced | Stryker scoped to the new domain + use cases. First run 84.62% (overall ≥ break 80); strengthened `RefreshAccessTokenUseCase` (payload capture + per-path error messages) and `RefreshTokenId` (regex anchors + toString + message). Second run **93.27%**; all new files **100%**. | `reports/mutation/index.html` |

## Scenario Coverage (@s ↔ test)

| Scenario | Test(s) |
|----------|---------|
| @s1 — login issues access+refresh, persists hash | `LoginUseCase.test`: `should_return_a_refresh_token_when_login_succeeds`, `should_persist_the_refresh_token_hash_for_the_user_when_login_succeeds`; `tests/api/identity/refresh.test`/`login.test` (refreshToken in body) |
| @s2 — refresh rotates | `RefreshAccessTokenUseCase.test`: `should_rotate_and_return_new_access_and_refresh_tokens_when_token_is_active`; `tests/api/identity/refresh.test`: `should_return_200_with_new_tokens_when_refresh_succeeds` |
| @s3 — expired → 401 | `RefreshAccessTokenUseCase.test`: `should_throw_unauthorized_and_not_issue_a_token_when_token_is_expired` |
| @s4 — unknown → 401 | `RefreshAccessTokenUseCase.test`: `should_throw_unauthorized_when_token_is_unknown` |
| @s5 — reuse → 401 + family revoke | `RefreshAccessTokenUseCase.test`: `should_throw_unauthorized_and_revoke_the_whole_family_when_a_revoked_token_is_reused` |
| @s6 — logout revokes; later refresh 401 | `LogoutUseCase.test`: `should_revoke_the_matching_refresh_token`; `tests/api/identity/logout.test`; (revoked-then-refresh is @s5) |
| @s7 — `RefreshToken.isActive` invariant | `RefreshToken.test` (issue/just-before/at/after expiry, revoke, double-revoke) |
| (access TTL env-driven, no hardcoded 7d) | `JwtTokenService.test`: `should_apply_the_configured_expiry_window_instead_of_a_hardcoded_one` |

## Result Obtained

- **Domain:** `RefreshToken` aggregate (`issue`/`reconstitute`/`isActive`/`isExpired`/`isRevoked`/`revoke`), `RefreshTokenId` VO.
- **Application:** ports `RefreshTokenRepository`, `RefreshTokenGenerator`; `RefreshAccessTokenUseCase` (rotation + reuse-detection → revoke family), `LogoutUseCase` (idempotent revoke); `LoginUseCase` now issues + persists a refresh token and returns it.
- **Infrastructure:** `CryptoRefreshTokenGenerator` (`randomBytes` + SHA-256), `PrismaRefreshTokenRepository` (upsert/findByHash/revokeAllForUser), `JwtTokenService` access TTL is now constructor/env-driven (no hardcoded `"7d"`).
- **Framework:** `IdentityController.refresh`/`logout` + routes; `environment.ts` (`JWT_ACCESS_EXPIRES_IN` default `15m`, `REFRESH_TOKEN_TTL_DAYS` default 30); `app.ts` wires the new repo/generator/use cases (login/refresh/logout are transactional via `TransactionDecorator`); swagger `/auth/refresh` + `/auth/logout` + `refreshToken` in `LoginResponse`.
- **Prisma:** `RefreshToken` model (uuid PK, FK `user_id`→`users` cascade, unique `token_hash`) + migration `20260629000000_add_refresh_tokens`.
- **Docs:** `.env.example` + README document the new env vars + the refresh/logout flow.

## Verification

- `npm run verify` — lint 0, typecheck 0, **78 suites / 498 tests**, build OK.
- Scoped Stryker on the new domain + use cases: **93.27%** overall; `RefreshToken`, `RefreshTokenId`, `RefreshAccessTokenUseCase`, `LogoutUseCase` all **100%**.
  - The remaining survivors are in `LoginUseCase`'s **pre-existing** credential-validation logic (message strings, the try/catch around VO creation, the access-token payload object) — unchanged by this ticket; the refresh-issuance lines this ticket added are fully killed.

## Team Modifications Pending Human Review

1. **Client follow-up required (cross-ticket):** MAZ-180 currently hard-logs-out on 401. With a 15m access TTL and no client refresh-and-retry, users would re-login every 15 min. A follow-up client ticket must add "on 401 → try `POST /auth/refresh` once → retry; logout only if refresh fails". Until then, the deployed `JWT_ACCESS_EXPIRES_IN` can be set longer. **Recommend creating that ticket.**
2. **Token transport:** refresh tokens travel in the JSON body (matching the current client), not httpOnly cookies. Revisit if a web client is added.
3. **Migration** `20260629000000_add_refresh_tokens` must be applied (`npm run db:migrate`) before deploy.

## Lessons / Limitations

- CA-002 already provides injected `IdGenerator`/`Clock`; reusing them kept the `RefreshToken` entity pure (no `crypto`/`Date`), so it mutation-scored 100% deterministically.
- Opaque-random + SHA-256-hash storage means a DB leak exposes no usable token and supports revocation/rotation — a second JWT could not be revoked without a denylist.
- `jsonwebtoken`'s `expiresIn` is a branded `StringValue` type under `exactOptionalPropertyTypes`; cast to `NonNullable<SignOptions["expiresIn"]>`.
- The `PrismaRefreshTokenRepository` needed `prisma generate` after the schema model before it would typecheck; the repo test mocks the delegate so it needs no DB.
