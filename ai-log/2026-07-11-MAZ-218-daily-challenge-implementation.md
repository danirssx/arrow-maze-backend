# AI Log - MAZ-218 Daily Challenge Implementation

## Task / Problem

Implement the approved MAZ-218 backend contract for `GET /daily-challenge`: generate one UTC daily challenge, prefer Gemini when configured, validate and cache the challenge, fall back to deterministic generation when Gemini is unavailable or invalid, and avoid leaking provider details.

The executable Gherkin contract was accepted by the human reviewer in PR #80 before implementation started.

## Tool and Model

- Tool: Codex CLI / terminal agent.
- Model: GPT-5 Codex.

## Prompt Used

User requested implementation of ticket MAZ-218 after accepting the contract in the PR, following `AGENTS.md`, `MEMORY.md`, Linear workflow, AI usage logging, checks, commit, push, PR, and Linear updates.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Referenced | The approved PR #80 contract/spec guided implementation boundaries. | `specs/backend-daily-challenge-MAZ-218.spec.md` |
| Planner / Gherkin Author (`.agents/planner.md`) | Referenced | The approved scenarios `@s1..@s9` were treated as the executable contract. | `specs/backend-daily-challenge-MAZ-218.feature` |
| TDD Implementer (`.agents/tdd-implementer.md`) | Referenced | Tests were written first for application/API/infrastructure behavior, then production code was implemented and refactored. | `tests/application/daily-challenge/GetDailyChallengeUseCase.test.ts`, `tests/api/dailyChallenge.test.ts`, `tests/infrastructure/daily-challenge/*` |
| Judge (`.agents/judge.md`) | Not used | No separate judge agent session was run during implementation. | N/A |
| Mutation Tester (`.agents/mutation.md`) | Referenced | Stryker mutation testing was run against the executable application use case after strengthening tests. | `reports/mutation/index.html`, score 87.43% |

## Result Obtained

- Added `GetDailyChallengeUseCase` with UTC date key, deterministic difficulty, current-cache reuse, Gemini-first generation, deterministic fallback, domain validation, solvability validation, and sanitized 503 failure.
- Added application ports and DTOs for daily challenge cache and generation.
- Added Prisma-backed `daily_challenges` cache table, schema model, migration, and repository.
- Added Gemini generator adapter that keeps `GEMINI_API_KEY` in infrastructure and sends it through `x-goog-api-key`, never in URLs.
- Added deterministic fallback generator using existing domain `RandomLevelStrategy`.
- Added public `GET /daily-challenge` route, controller wiring, OpenAPI docs, README/env documentation, and optional Gemini environment variables.
- Updated error middleware so 5xx `AppError` details are not returned to clients.

## @s -> Test Map

| Scenario | Concrete tests |
| --- | --- |
| `@s1` Gemini boundary and secret handling | `tests/architecture/dailyChallengeGeminiBoundary.test.ts`; `tests/infrastructure/daily-challenge/GeminiDailyChallengeGenerator.test.ts` |
| `@s2` Cache miss generates Gemini challenge | `tests/application/daily-challenge/GetDailyChallengeUseCase.test.ts` `should_generate_validate_cache_and_return_gemini_challenge_when_cache_misses`; `tests/api/dailyChallenge.test.ts` |
| `@s3` Cache hit reuses current challenge | `tests/application/daily-challenge/GetDailyChallengeUseCase.test.ts` `should_return_cached_challenge_without_calling_gemini_when_cache_hit_is_current` |
| `@s4` Invalid Gemini payload falls back | `tests/application/daily-challenge/GetDailyChallengeUseCase.test.ts` invalid metadata cases; `tests/infrastructure/daily-challenge/GeminiDailyChallengeGenerator.test.ts` |
| `@s5` Unsolvable Gemini candidate falls back | `tests/application/daily-challenge/GetDailyChallengeUseCase.test.ts` `should_reject_unsolvable_gemini_candidate_and_return_validated_fallback` |
| `@s6` Wrong date/seed/difficulty rejected | `tests/application/daily-challenge/GetDailyChallengeUseCase.test.ts` wrong metadata and difficulty tests |
| `@s7` UTC rollover | `tests/application/daily-challenge/GetDailyChallengeUseCase.test.ts` UTC helper and rollover tests |
| `@s8` Same daily payload for all users | `tests/api/dailyChallenge.test.ts` `should_return_same_payload_for_multiple_users_when_use_case_returns_cached_utc_challenge` |
| `@s9` Sanitized unavailable response | `tests/application/daily-challenge/GetDailyChallengeUseCase.test.ts`; `tests/api/dailyChallenge.test.ts` `should_return_503_without_provider_details_when_generation_is_unavailable` |

## Verification

- `npm test -- --runInBand tests/application/daily-challenge/GetDailyChallengeUseCase.test.ts` - passed, 23 tests.
- `npm run mutation -- --mutate "src/application/daily-challenge/use-cases/GetDailyChallengeUseCase.ts"` - passed, mutation score 87.43%.
- `npm run verify` - passed: lint, typecheck, coverage, build; 101 test suites and 647 tests passed.

## Team Modifications Pending Human Review

- Review deterministic fallback tuning for daily challenge difficulty and time limits.
- Review Gemini prompt text and model default (`gemini-1.5-flash`) against team expectations.
- Apply the Prisma migration in the target environment before deploying the endpoint.

## Lessons / Limitations

- The initial mutation run exposed weak assertions around cache validity, metadata branches, board frame mapping, and DTO shape; additional behavior tests raised the use-case score above the configured threshold.
- Gemini integration is intentionally defensive: provider errors or malformed responses are treated as fallback triggers, and provider details are never returned to clients.
