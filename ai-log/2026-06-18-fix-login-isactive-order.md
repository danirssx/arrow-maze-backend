# AI Log — fix: check isActive before bcrypt in LoginUseCase

**Date:** 2026-06-18
**Branch:** fix/login-isactive-order

## Task / problem

`LoginUseCase` ran `bcrypt.verify()` before checking `user.isActive`. For suspended accounts, bcrypt always ran regardless of whether the password was correct, wasting compute and creating inconsistent timing behavior. The isActive check must happen before the expensive bcrypt operation.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

Continuation of critical bug fix session.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Not used | N/A | N/A |
| TDD Implementer | Referenced | Added new test to prove isActive fires before bcrypt | LoginUseCase.test.ts |
| Judge | Not used | N/A | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

- `LoginUseCase`: moved `isActive` check before `passwordHasher.verify()`
- Added test `should_throw_forbidden_error_when_account_is_suspended_even_if_password_is_wrong` — this test would FAIL on the old code (bcrypt returns false → Unauthorized, not Forbidden), proving the ordering is now correct
- 278 tests pass, `tsc --noEmit` clean

## Team modifications pending human review

- `ForbiddenError` is returned for suspended accounts — this reveals account existence to the caller. If the team wants to hide account status from unauthenticated callers, suspended accounts should also return `UnauthorizedError`. This is a product/UX decision, not a code defect.

## Lessons / limitations

- The new test is the key artifact: a test for `suspended + wrong password → ForbiddenError` only passes if isActive is checked BEFORE bcrypt. This makes the ordering a contractual invariant, not just a comment.
