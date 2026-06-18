# AI Log — fix: read userId from JWT payload in LeaderboardController

**Date:** 2026-06-18
**Branch:** fix/leaderboard-auth-userid

## Task / problem

`LeaderboardController.submitScore` read `userId` directly from the HTTP request body. Because the `POST /leaderboard/scores` route had no authentication middleware, any caller could supply an arbitrary `userId` and submit scores on behalf of any user. This allowed score spoofing without authentication.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

User requested a security fix to prevent score spoofing: add `authMiddleware` to the leaderboard submit route and read `userId` from the verified JWT payload instead of the request body, following the same pattern already established in the progress routes.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Not used | N/A | N/A |
| TDD Implementer | Referenced | Added 401 tests for missing and invalid token; updated existing tests to remove userId from body and add Authorization header | submitScore.test.ts, LeaderboardController.test.ts |
| Judge | Referenced | Verified the pattern matches progressRoutes.ts and createProgressTestApp.ts exactly | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

- `leaderboardRoutes.ts`: accepts `authMiddleware: RequestHandler` parameter; applied to `POST /leaderboard/scores` only (GET remains public)
- `LeaderboardController.submitScore`: removed `userId` from body destructuring and required-fields check; reads `userId` from `(req as AuthenticatedRequest).user.userId`
- `app.ts`: passes `authMiddleware` to `createLeaderboardRouter`
- `tests/helpers/createLeaderboardTestApp.ts`: now accepts `TokenService` and wires real `createAuthMiddleware` (aligned with `createProgressTestApp`)
- `tests/api/leaderboard/submitScore.test.ts`: removed `userId` from `VALID_BODY`; added `FakeTokenService`; added tests for 401 without token and 401 with invalid token; all existing tests updated to send `Authorization: Bearer valid-token`
- `tests/framework/leaderboard/LeaderboardController.test.ts`: added `user` property to mock request objects; removed `userId` from `validBody`
- Test count: 286 → 288

## Team modifications pending human review

- **Breaking change for the frontend**: `userId` must be removed from the submit score request body. The frontend must send a valid `Authorization: Bearer <token>` header on this endpoint.
- The GET `/leaderboard/:levelId` route intentionally remains public (no auth required) — confirm this is the desired behavior.

## Lessons / limitations

- The `createProgressTestApp` pattern (accepting a real `TokenService` and wiring `createAuthMiddleware`) is the correct approach for controller tests that involve authenticated routes. Using a fake middleware that just calls `next()` would bypass the auth contract entirely.
