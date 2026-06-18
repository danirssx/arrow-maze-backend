# AI Log — Architecture Divergence Fixes

**Date:** 2026-06-17  
**Ticket:** pre-AM-011 (architectural alignment before level infrastructure)  
**Tool:** Claude Sonnet 4.6 (Claude Code CLI)  
**Author:** Fernando Liendo

---

## Task / Problem

Eight architectural divergences existed between Fernando's (identity, level-catalog) and Daniella's (leaderboard, progress) bounded contexts. These needed resolution before starting AM-011 to avoid compounding technical debt.

The 8 divergences:
- D1: `DomainEvent` — interface vs abstract class
- D2: `Entity.pullDomainEvents()` — missing in Fernando's base
- D3: Duplicate `UserId`/`LevelId` across 3+ contexts each
- D4: Port naming (I-prefix in Daniella's vs none in Fernando's)
- D5: Dead `services/` sublayer in leaderboard application
- D6: Duplicate `IDomainEventBus` ports per context
- D7: `getValue()` vs `.value` accessor inconsistency
- D8: Domain errors extending plain `Error` instead of `DomainError`

---

## Prompt Used

> "Vamos a arreglar las divergencias primero" → "Sí, procede con este ajuste, todos los cambios que hagas documentalos en un archivo .md, ponle 'divergencia-fixes.md' y todo lo que cambies documentalo ahí, fixea todo"

---

## Agent Roles

- Claude Code as primary agent (exploration, planning, implementation)
- No specialized sub-agents used

---

## Result Obtained

- All 8 divergences resolved
- TypeScript compiles cleanly (`tsc --noEmit`: 0 errors)
- 258/258 tests passing (0 failures)
- Full documentation in `divergencia-fixes.md`

### Key decisions made:

| Decision | Rationale |
|----------|-----------|
| Shared kernel for `UserId`/`LevelId` | Cross-context identity; UUID validation enforced once |
| Abstract `DomainEvent` class (not interface) | Guarantees `occurredOn` and `aggregateId` for all events |
| No I-prefix on ports | Fernando's established style; DDD convention |
| `pullDomainEvents()` on Entity base | Atomic drain; prevents double-processing |
| `.value` public property | TypeScript idiomatic; removes boilerplate `getValue()` |
| Inlined `SubmitScoreService` validation | `RankingService`/`ScoreValidationService` were dead code |
| Single `DomainEventBus` port | Shared at `application/ports/`, not per-context |

---

## Files Changed

**New files:** `src/domain/shared/UserId.ts`, `src/domain/shared/LevelId.ts`, `src/application/ports/DomainEventBus.ts`, `divergencia-fixes.md`

**Deleted files:** 11 files (duplicate VOs, dead services, old ports)

**Modified source files:** ~30 files across domain, application, infrastructure layers

**Modified test files:** 17 test files updated (import paths, accessor style, UUID validation alignment)

---

## Team Modifications Pending Human Review

- [ ] Verify `pullDomainEvents()` backward compatibility with Daniella's code that uses `domainEvents` + `clearEvents()` (both kept for compatibility)
- [ ] Confirm `ProgressMergePolicy` still handles edge cases correctly with shared kernel `UserId`/`LevelId`
- [ ] Review test UUID constants (all use `550e8400-e29b-41d4-*` prefix for clarity)
- [ ] Check `BcryptPasswordHasher` — `raw.value` / `stored.value` vs old `getValue()` calls

---

## Lessons / Limitations

- Shared kernel UUIDs required updating all test fixtures that used simple strings (`'user-1'`, `'level-1'`) to valid UUID v4 format — a ripple effect worth noting for future context additions
- The leaderboard's internal `UserId`/`LevelId` were lightweight opaque wrappers — replacing them with shared kernel VOs adds UUID validation that didn't exist before; this is architecturally correct but test maintenance cost increased
- Dead code detection: `RankingService` was injected but never called — removed; `ScoreValidationService` logic was duplicated in `Leaderboard.submitEntry()` domain rule
