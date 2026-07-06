# Spec: Tolerate mobile clock skew for completedAt (MAZ-190)

## Problem

Device QA produced backend failures completing progress:

```txt
Application use case failed {
  operationName: 'CompleteLevelService',
  status: 'error',
  errorName: 'InvalidArgumentError',
  errorMessage: 'CompletedAt cannot be in the future'
}
```

The `CompletedAt` value object (added in MAZ-176) rejects **any** timestamp greater
than `Date.now()`. A mobile device whose clock is a few seconds/minutes ahead of the
backend therefore gets every completion rejected with HTTP 422, and the client keeps
the progress `pendingSync` forever (it retries the same future timestamp on every
drain — see client MAZ-185).

## Chosen policy (team decision)

**Tolerate a bounded future window; reject beyond it.**

- A `completedAt` no more than `CLOCK_SKEW_TOLERANCE_MS` (5 minutes) ahead of the
  server clock is accepted as valid.
- A `completedAt` farther than the tolerance in the future is rejected with the
  existing `InvalidArgumentError` → HTTP 422.
- A non-parseable date is still rejected with `InvalidArgumentError` → HTTP 422.

### Why this policy (and not the alternatives)

- **Server-side timestamping (ignore client `completedAt`)** would corrupt offline /
  batch sync: when a player completes levels offline and syncs later, the real
  completion time is genuinely earlier than the server-receive time. Stamping on the
  server would overwrite accurate history with the sync moment.
- **Clamping small future values to server time** mutates the stored value inside a
  domain value object as a side effect of construction; it loses the (harmless) real
  device time and complicates the immutable VO. A small bounded future value is
  harmless to persist.
- **Tolerance** is the minimal, low-risk change to the MAZ-176 invariant, it unsticks
  the realistic device-skew case, and it still rejects clearly invalid far-future
  timestamps from a broken device clock.

The rule stays entirely inside the `CompletedAt` domain value object (where MAZ-176
placed it). No framework-specific date logic is added to the domain beyond the
`Date.now()` reference the VO already used.

## Scope

- `src/domain/progress/value-objects/CompletedAt.ts` — bounded tolerance constant.
- Domain + API tests covering accepted skew and rejected far-future.

## Out of scope

- Client-side handling of a permanent rejection (client MAZ-190 branch handles the
  `pendingSync` resolution so the UI never stays ambiguous forever).
