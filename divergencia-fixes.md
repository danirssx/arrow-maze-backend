# Architecture Divergence Fixes

**Date:** 2026-06-18  
**Scope:** arrow-maze-backend  
**Author:** Fernando Liendo (AI-assisted)  
**Ticket:** pre-AM-011 alignment

---

## Context

After merging Daniella's Leaderboard (AM-033–036, AM-041) and Progress (AM-037–040) PRs, the codebase had 8 unresolved architectural divergences between bounded contexts. This document records every decision made and every file changed.

---

## Decision Log

### D1 — DomainEvent base: abstract class wins

**Before:**
- `src/domain/events/DomainEvent.ts` — `interface DomainEvent` with `occurredAt: Date` (Fernando)
- `src/domain/shared/DomainEvent.ts` — `abstract class DomainEvent` with `occurredOn: Date` + `aggregateId` (Daniella)

**Decision:** Keep the abstract class at `src/domain/shared/DomainEvent.ts`. It is already used by `Entity`, by both `IDomainEventBus` ports, and by all of Daniella's events. The interface is a subset and provides no extra value.

**Consequence:** `occurredAt` renamed to `occurredOn` in all migrated events.

**Files deleted:**
- `src/domain/events/DomainEvent.ts`

**Files modified (events migrated to extend abstract class):**
- `src/domain/identity/events/UserRegistered.ts`
- `src/domain/identity/events/UserPasswordChanged.ts`
- `src/domain/identity/events/UserSuspended.ts`
- `src/domain/level-catalog/events/LevelPublished.ts`

---

### D2 — Entity base class: User and Level extend Entity

**Before:** `User` and `Level` managed their own `_domainEvents: DomainEvent[]` array and exposed `pullDomainEvents()` manually. `Entity` already had `record()`, `clearEvents()`, and `domainEvents` getter but not `pullDomainEvents()`.

**Decision:** Add `pullDomainEvents()` to `Entity` (atomic drain). `User` and `Level` now extend `Entity<UserId>` and `Entity<LevelId>` respectively. Duplicate event management code removed from both aggregates.

**Files modified:**
- `src/domain/shared/Entity.ts` — added `pullDomainEvents()`
- `src/domain/identity/User.ts` — extends `Entity<UserId>`, uses `record()`
- `src/domain/level-catalog/Level.ts` — extends `Entity<LevelId>`, uses `record()`

---

### D3 — Shared kernel for UserId and LevelId

**Before:** 3 versions of `UserId` (identity, leaderboard, progress) and 3 versions of `LevelId` (level-catalog, leaderboard, progress). Each had different style, different validation, and different accessor patterns.

**Decision:** `UserId` and `LevelId` are global identity types — the same user ID that Identity creates is what Leaderboard and Progress reference. Move them to `src/domain/shared/` as a shared kernel. All bounded contexts import from there.

Canonical shape:
- `private constructor` + `static create(value)` with UUID validation
- `static generate()` for new entity creation
- `readonly value: string` (public property — see D7)
- `equals()` and `toString()`

`MoveCount` stays per-context: in Level Catalog it means "optimal moves for a level" (metadata), in Leaderboard it means "moves executed by a player" (score component). Different semantics.

**Files created:**
- `src/domain/shared/UserId.ts`
- `src/domain/shared/LevelId.ts`

**Files deleted:**
- `src/domain/identity/value-objects/UserId.ts`
- `src/domain/leaderboard/value-objects/UserId.ts`
- `src/domain/progress/value-objects/UserId.ts`
- `src/domain/level-catalog/value-objects/LevelId.ts`
- `src/domain/leaderboard/value-objects/LevelId.ts`
- `src/domain/progress/value-objects/LevelId.ts`

**Files modified (import path updated):**
- `src/domain/identity/User.ts`
- `src/domain/identity/UserFactory.ts`
- `src/domain/level-catalog/Level.ts`
- `src/domain/leaderboard/Leaderboard.ts`
- `src/domain/leaderboard/ScoreEntry.ts`
- `src/domain/progress/PlayerProgress.ts`
- `src/domain/progress/CompletedLevel.ts`
- `src/domain/progress/LevelCompletionResult.ts`
- `src/domain/progress/policies/ProgressMergePolicy.ts`
- `src/domain/progress/policies/LevelUnlockPolicy.ts`
- `src/application/identity/ports/UserRepository.ts`
- `src/application/leaderboard/ports/ILeaderboardRepository.ts` (→ LeaderboardRepository)
- `src/application/leaderboard/use-cases/SubmitScoreService.ts`
- `src/application/leaderboard/use-cases/GetLeaderboardService.ts`
- `src/application/progress/ports/IProgressRepository.ts` (→ ProgressRepository)
- `src/application/progress/use-cases/CompleteLevelService.ts`
- `src/application/progress/use-cases/LoadProgressService.ts`
- `src/application/progress/use-cases/SyncProgressService.ts`
- `src/infrastructure/identity/PgUserRepository.ts`
- `src/infrastructure/leaderboard/PgLeaderboardRepository.ts`
- `src/infrastructure/progress/PgProgressRepository.ts`

---

### D4 — Port naming: remove I-prefix

**Before:** Daniella's ports used I-prefix (`ILeaderboardRepository`, `IProgressRepository`, `IDomainEventBus`). Fernando's didn't (`UserRepository`, `LevelRepository`).

**Decision:** No I-prefix. TypeScript interfaces are identified by their use, not by naming convention. Consistent with Fernando's existing ports.

**Files renamed (interface name only, file kept):**
- `src/application/leaderboard/ports/ILeaderboardRepository.ts` — interface renamed to `LeaderboardRepository`
- `src/application/progress/ports/IProgressRepository.ts` — interface renamed to `ProgressRepository`

**Files deleted (replaced by shared port):**
- `src/application/leaderboard/ports/IDomainEventBus.ts`
- `src/application/progress/ports/IDomainEventBus.ts`

**File created:**
- `src/application/ports/DomainEventBus.ts`

---

### D5 — Services sublayer: remove from application

**Before:** `src/application/leaderboard/services/RankingService.ts` and `ScoreValidationService.ts` — not in the approved architecture.

**Analysis:**
- `RankingService` — duplicated logic already inside `Leaderboard.rankEntries()`. Dead code in `SubmitScoreService` (injected but never called).
- `ScoreValidationService` — input validation (raw DTOs). Inlined into `SubmitScoreService`.

**Decision:** Delete both. Inline validation in the use case.

**Files deleted:**
- `src/application/leaderboard/services/RankingService.ts`
- `src/application/leaderboard/services/ScoreValidationService.ts`

**Files modified:**
- `src/application/leaderboard/use-cases/SubmitScoreService.ts` — removed dead `rankingService` dep, inlined input validation

---

### D6 — DomainEventBus: single shared port

**Before:** Two identical `IDomainEventBus` interfaces, one in `application/leaderboard/ports/` and one in `application/progress/ports/`. Both imported from `domain/shared/DomainEvent.ts`.

**Decision:** One shared port at `src/application/ports/DomainEventBus.ts`. All use cases import from there.

*(See D4 above — same files affected.)*

---

### D7 — Value Object accessor style: `.value` property

**Before:** Fernando's VOs used `private readonly value` + `getValue()` method. Daniella's used `readonly value` (public property directly).

**Decision:** Standardize to `readonly value` public property. No `getValue()` method. TypeScript idiomatic, already used by all of Daniella's code and by the shared kernel VOs (D3).

**Files modified:**
- `src/domain/identity/value-objects/Email.ts`
- `src/domain/identity/value-objects/Username.ts`
- `src/domain/identity/value-objects/PasswordHash.ts`
- `src/domain/identity/value-objects/RawPassword.ts`
- `src/domain/level-catalog/value-objects/LevelName.ts`
- `src/domain/level-catalog/value-objects/LevelVersion.ts`
- `src/domain/level-catalog/value-objects/LevelDescription.ts`
- `src/domain/level-catalog/value-objects/TimeLimit.ts`
- `src/domain/level-catalog/value-objects/MoveCount.ts` (level-catalog version)

**Call sites updated (getValue() → .value):**
- `src/domain/identity/User.ts`
- `src/application/identity/use-cases/RegisterUserUseCase.ts`
- `src/application/identity/use-cases/LoginUseCase.ts`
- `src/infrastructure/identity/PgUserRepository.ts`
- `src/domain/level-catalog/Level.ts`

---

### D8 — Domain errors: per-context errors extend DomainError

**Before:** Daniella's domain errors extended plain `Error`. Fernando's extended `DomainError extends AppError` with proper HTTP status mapping.

**Decision:** All domain errors must extend `DomainError` (or its subclasses). This ensures the global error middleware maps them correctly to HTTP responses with the standard error shape.

**Files modified:**
- `src/domain/leaderboard/errors/LeaderboardErrors.ts`
- `src/domain/progress/errors/ProgressErrors.ts`

---

## Summary table

| # | Divergence | Resolution |
|---|-----------|-----------|
| D1 | DomainEvent: interface vs abstract class | Abstract class (`shared/`) wins; `occurredAt` → `occurredOn` |
| D2 | Entity base class | `User` and `Level` extend `Entity<TId>`; `pullDomainEvents()` added |
| D3 | Duplicate IDs (3x UserId, 3x LevelId) | Shared kernel in `domain/shared/`; UUID validation; `.value` accessor |
| D4 | Port naming (I-prefix) | No I-prefix; consistent with Fernando's style |
| D5 | `services/` sublayer in application | Removed; dead code deleted; validation inlined |
| D6 | IDomainEventBus duplicated | Single shared port at `application/ports/DomainEventBus.ts` |
| D7 | `getValue()` vs `.value` accessor | `.value` public property everywhere |
| D8 | Domain errors extend plain `Error` | All domain errors extend `DomainError` |

## Test Suite Fixes (post-compile)

After all source changes compiled cleanly, the test suite had 17 test files failing. Root causes:

1. **Old import paths** — tests still imported from deleted files (`domain/identity/value-objects/UserId`, `domain/leaderboard/value-objects/LevelId`, etc.)
2. **`getValue()` → `.value`** — VO accessor changed in Username, Email, RawPassword, LevelName, BcryptPasswordHasher, CreateLevelUseCase, RegisterUserUseCase, PgUserRepository tests
3. **UUID validation** — Shared kernel `UserId`/`LevelId` require valid UUID v4. Tests using `new UserId('user-1')` / `new LevelId('level-1')` style needed constants like `'550e8400-e29b-41d4-a716-446655440001'`
4. **Renamed interfaces** — `ILeaderboardRepository` → `LeaderboardRepository`, `IProgressRepository` → `ProgressRepository`, `IDomainEventBus` → `DomainEventBus`
5. **Deleted services** — `RankingService`, `ScoreValidationService` removed from `SubmitScoreService.test.ts`

**Files updated:** 17 test files  
**Final state:** 258/258 tests passing, 0 failures
