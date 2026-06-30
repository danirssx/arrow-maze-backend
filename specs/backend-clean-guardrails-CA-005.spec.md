# Spec — Backend: reforzar lint arquitectónico y limpiar estructura (CA-005)

Date: 2026-06-29
Ticket: `MAZ-158` (temporary id `CA-005`)
Source: `Clean_Architecture_Fix_Tickets_Proposal.md` — B-G1, B-G2, B-G3
Status: approved

## Purpose

Add ESLint guardrails that turn architectural regressions in `src/domain` into
CI failures, fix inconsistent port filenames in the leaderboard and progress
bounded contexts, and document the port naming convention in
`docs/architecture.md`. No production behavior changes; the entire ticket is
structural and preventive.

## In scope / Out of scope

**In scope:**
- Add `no-restricted-imports` ESLint rule: `src/domain/**` may not import `crypto`.
- Add `import/no-restricted-paths` ESLint rule: `src/domain` may not import
  `src/shared/errors/AppError.ts` (HTTP semantics must not enter the domain).
- Rename `src/application/leaderboard/ports/ILeaderboardRepository.ts` →
  `LeaderboardRepository.ts` and update all 3 import references.
- Rename `src/application/progress/ports/IProgressRepository.ts` →
  `ProgressRepository.ts` and update all 4 import references.
- Add a "Port naming convention" section to `docs/architecture.md`.
- Verify `src/framework/` has no empty subdirectories (already satisfied;
  document as confirmed clean).

**Out of scope:**
- Functional refactors or behavior changes to any use case.
- Renaming the exported TypeScript types (`LeaderboardRepository`,
  `ProgressRepository`) — they are already correct; only the filenames are wrong.
- Adding ESLint architectural rules beyond the two listed above.
- Diagrams or README updates (separate backlog tickets).

## Behavior

### ESLint regression guards

Two new rules prevent domain pollution that was manually fixed in CA-001 from
silently reappearing:

1. **`no-restricted-imports` (domain → crypto):** Any `import ... from 'crypto'`
   or `import ... from 'node:crypto'` inside `src/domain/**/*.ts` causes a lint
   error. `crypto` is a Node.js runtime adapter; the domain must be
   infrastructure-free.

2. **`import/no-restricted-paths` (domain → AppError):** Any import of
   `src/shared/errors/AppError.ts` from `src/domain/**` causes a lint error.
   `AppError` carries `httpStatus`, which is HTTP semantics and must stay outside
   the domain. `DomainError` (in `src/domain/errors/`) is the correct base class.

Both rules fire during `npm run lint` and therefore also during `npm run verify`,
making them CI gates.

### Port filename convention

Convention (already followed by Fernando's bounded contexts, violated only by
Daniella's leaderboard and progress ports):

> Port interface files in `src/application/*/ports/` use the same name as the
> exported TypeScript type, without an `I` prefix.
> Example: `LeaderboardRepository.ts` exporting `LeaderboardRepository`.

Files to rename:

| Before | After | Exported type (unchanged) |
|--------|-------|--------------------------|
| `src/application/leaderboard/ports/ILeaderboardRepository.ts` | `LeaderboardRepository.ts` | `LeaderboardRepository` |
| `src/application/progress/ports/IProgressRepository.ts` | `ProgressRepository.ts` | `ProgressRepository` |

Import paths to update (filename only, type names stay the same):

| File | Old import path | New import path |
|------|----------------|----------------|
| `src/application/leaderboard/use-cases/GetLeaderboardService.ts` | `../ports/ILeaderboardRepository.js` | `../ports/LeaderboardRepository.js` |
| `src/application/leaderboard/use-cases/SubmitScoreService.ts` | `../ports/ILeaderboardRepository.js` | `../ports/LeaderboardRepository.js` |
| `src/infrastructure/leaderboard/PrismaLeaderboardRepository.ts` | `../../application/leaderboard/ports/ILeaderboardRepository.js` | `../../application/leaderboard/ports/LeaderboardRepository.js` |
| `src/application/progress/use-cases/CompleteLevelService.ts` | `../ports/IProgressRepository.js` | `../ports/ProgressRepository.js` |
| `src/application/progress/use-cases/LoadProgressService.ts` | `../ports/IProgressRepository.js` | `../ports/ProgressRepository.js` |
| `src/application/progress/use-cases/SyncProgressService.ts` | `../ports/IProgressRepository.js` | `../ports/ProgressRepository.js` |
| `src/infrastructure/progress/PrismaProgressRepository.ts` | `../../application/progress/ports/IProgressRepository.js` | `../../application/progress/ports/ProgressRepository.js` |

### docs/architecture.md

Add a "Port naming convention" section that states:
- No `I` prefix on port filenames or exported type names.
- The filename must match the exported type name exactly.
- Correct example: `UserRepository.ts` exporting `UserRepository`.

## HTTP contract

Not applicable — no endpoint changes.

## Clean Architecture contract

Applicable rules from `docs/reglas_clean_arch.md`:

- [x] Regla de dependencia (dependencies point inward only) — enforced by new ESLint rules
- [x] Independencia del dominio (no framework/ORM/HTTP/I/O in `src/domain`) — guarded by new rules
- [ ] Application solo orquesta — not touched
- [ ] Repositorios: interfaz adentro (port), implementación afuera (infrastructure) — already correct; file rename preserves this
- [ ] DTOs simples en fronteras — not touched
- [ ] Invariantes en VO/agregados — not touched
- [x] Errores de dominio sin semántica HTTP — enforced by AppError import guard

Layer impact:

- Domain: no code changes — only ESLint rules protect it
- Application: rename 2 port files + update 5 import paths (no logic changes)
- Infrastructure: update 2 import paths (no logic changes)
- Framework: `eslint.config.js` updated with 2 new rules

Forbidden moves (must stay unchecked / not introduced):

- [x] `src/domain` importing `AppError` or `crypto` → now lint error
- [ ] `src/application` importing `infrastructure`/`framework` — already guarded
- [ ] Controllers/middleware containing business rules — resolved by CA-003/MAZ-177
- [ ] DTOs exposing domain entities — not touched
- [ ] Prisma client outside `src/infrastructure` — already guarded

Required tests:

- Domain: none (no domain code changes)
- Application: none (only filename/import path changes — existing tests cover behavior)
- Adapter/API: none
- Lint gate: `npm run lint` must exit non-zero when a domain file imports `crypto` or `AppError`

## Edge cases

- The `eslint-plugin-import` `no-restricted-paths` rule uses file paths, not
  module specifiers. The target must be `./src/domain` and the `from` must point
  to the exact file `./src/shared/errors/AppError.ts` to avoid blocking imports
  of `DomainError` or other shared utilities.
- `crypto` must be blocked both as `'crypto'` and `'node:crypto'` since Node.js
  accepts both specifiers.
- After the port file rename, TypeScript path resolution changes from
  `.../ILeaderboardRepository.js` to `.../LeaderboardRepository.js` in compiled
  output — all import statements must use the new `.js` extension path.
- Tests under `tests/` that import the port types are not affected because they
  import the TYPE name (e.g. `LeaderboardRepository`), not the filename directly.
  Verify with `npm run typecheck`.

## Acceptance criteria (Given/When/Then)

- @s1: Given a file in `src/domain/` contains `import ... from 'crypto'`, When
  `npm run lint` runs, Then it exits with a non-zero code and reports the
  violation.
- @s2: Given a file in `src/domain/` contains `import ... from 'node:crypto'`,
  When `npm run lint` runs, Then it exits with a non-zero code.
- @s3: Given a file in `src/domain/` imports from `src/shared/errors/AppError`,
  When `npm run lint` runs, Then it exits with a non-zero code and reports the
  violation.
- @s4: Given `src/application/leaderboard/ports/` is inspected, When filenames
  are listed, Then no file starts with `I`.
- @s5: Given `src/application/progress/ports/` is inspected, When filenames are
  listed, Then no file starts with `I`.
- @s6: Given `npm run verify` runs after all changes, When it completes, Then it
  exits with zero (lint GREEN, typecheck GREEN, tests GREEN, build GREEN).
- @s7: Given `docs/architecture.md` is read, When the port naming section is
  found, Then it states the no-`I`-prefix convention with an example.

## Decisions

| Decision | Chosen | Discarded | Reason |
|----------|--------|-----------|--------|
| Scope of `no-restricted-paths` for AppError | Block only `src/shared/errors/AppError.ts` | Block all of `src/shared/errors/` | `ApplicationError.ts` and `DomainError.ts` may be legitimate in shared; only `AppError` carries HTTP semantics |
| Port file rename | Rename files, keep type names | Rename type names too | Type names (`LeaderboardRepository`, `ProgressRepository`) are already correct per convention |
| ESLint approach for `httpStatus` | Covered by AppError import block | Separate `no-restricted-syntax` on property access | `httpStatus` only enters domain via `AppError`; blocking the import is sufficient and simpler |

## Risks / OPEN QUESTIONS

- None. All changes are mechanical (renaming + ESLint config) with no risk of
  behavior regression. `npm run verify` is the full safety net.
