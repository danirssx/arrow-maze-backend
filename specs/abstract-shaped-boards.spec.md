# Spec — Abstract Shaped Boards (Backend)

Date: 2026-06-21
Status: **draft for human gate**. Not an approved Gherkin contract until the human
signs the `@s` scenarios in `abstract-shaped-boards.feature`.

Source plan: `arrow-maze-client/docs/abstract-shaped-boards-plan.md`.
Decision taken by product owner: **Option A** (shape = visual + authoring/placement
mask, NOT a physical blocker). AI/Gemini generation and image/user-shape upload are
**deferred to a separate Phase-2 ticket** and are out of scope here.

## Purpose

Let Arrow Untangle levels carry an optional finite `boardShape` (a cell mask) so the
backend can store, validate, expose, seed, and deterministically generate abstract
shaped boards. Extraction physics stay unbounded (an arrow leaves the board once its
forward ray is clear); the shape only frames the visible board and constrains where
arrows may be placed.

## Data contract (Option A)

```jsonc
{
  "boardShape": {
    "type": "CELL_MASK",
    "cells": [{ "row": 0, "col": 0 }, { "row": 0, "col": 1 }]
  }
}
```

Invariants (when `boardShape` is present):

- `type` must equal `"CELL_MASK"` (only supported type for MVP).
- `cells` is a finite, **non-empty** list.
- Each `row`/`col` is an integer (negative allowed, same lattice as arrows).
- **No duplicate** cells.
- **Max 600 cells** (mobile render + payload guard).
- **Arrow containment**: every cell of every arrow path lies inside the mask.
- Connectivity is **NOT** enforced for MVP (disconnected abstract islands allowed).
  Recorded as an open decision (see below); can become an authoring lint later.

`boardShape` is **optional**: existing levels (and requests) without it keep working
exactly as today (rectangular board derived from arrow bounds).

## Architecture placement (Clean Architecture, deps point inward)

- **Domain** (`src/domain/level-catalog`): new `BoardShape` value object that enforces
  its own invariants (type, non-empty, integer coords, no duplicates, max size) and
  exposes `contains(position)` / `cells`. The `Level` aggregate enforces the cross-object
  **arrow-containment** invariant in `draft()` / `reconstitute()` when a shape is present
  (throws a `DomainError` — no new "policy" class invented). `LevelSolvabilityPolicy`
  is unchanged (still the arrow blocking-graph DAG check).
- **Application** (`src/application/level-catalog`): extend `CreateLevelInput` and the
  level read DTO (`LevelDto`) with an optional `boardShape`. Map input → `BoardShape`
  in the use case; surface invalid payloads as controlled validation errors.
- **Infrastructure**: Prisma migration adds nullable `levels.board_shape JSONB`
  (`boardShape Json? @map("board_shape")`); `LevelMapper` validates + (de)serializes the
  JSONB safely; `PrismaLevelRepository.save` persists it; backward compatible with
  `null` rows. A CHECK constraint guards `jsonb_typeof = 'object'` when not null.
- **Framework**: controller reads optional `boardShape` from the create request;
  OpenAPI `CreateLevelRequest` + `LevelDetail` gain the optional `boardShape` schema.
  Admin auth on create/update/publish/archive unchanged.

## Slices in this repo

1. **Shaped level contract + persistence** (domain `BoardShape`, app DTOs, Prisma
   migration + mapper, OpenAPI). Covers **S3** (server-side reject) and **S4**.
2. **Authored abstract seed levels**: `prisma/seed-data/level-json/` holds canonical
   authored shaped JSON; the seed reads, validates through the domain path, and upserts.
   Completes **S4** end-to-end with real published data.
3. **Deterministic `RandomLevelStrategy`** (backend-first): a seeded generator that
   places arrows inside a given mask, builds a DAG by construction, and validates the
   candidate through the same `ArrowSpec` + `BoardShape` containment + `LevelSolvabilityPolicy`
   rules as authored JSON; bounded retries → controlled generation failure. Covers **S7**.

## Acceptance criteria → scenarios

- **S3** Reject invalid shape → `@s3a` dup cells, `@s3b` arrow outside mask,
  `@s3c` bad type, `@s3d` oversize (>600), `@s3e` empty cells.
- **S4** Persist + return shape → `@s4`; backward compat (`null` shape) → `@s2b`;
  OpenAPI documents it → `@s9`.
- **S4 (seed)** Authored abstract level seeded & published → `@s10`.
- **S7** Generated level passes same validation + determinism → `@s7`; bounded
  generation failure → `@s7b`.
- **S8** Keep AI behind validation → **DEFERRED** (Phase-2 ticket, not implemented here).

## Out of scope (Phase 2, separate ticket)

- Gemini / AI candidate generation in any production path.
- Image / user-drawn shape upload → mask conversion.
- Shape as a physical wall (Option B). Daily-challenge auto-publishing.

## Open decisions surfaced for the human gate

1. Connectivity: keep **not enforced** for MVP (allow islands)? (default: yes)
2. Authored JSON home: `prisma/seed-data/level-json/`? (plan recommends yes; default: yes)
3. `RandomLevelStrategy` **backend-first** (tied to catalog + future daily challenge +
   solvability policy lives here)? (plan recommends backend-first; default: yes)
