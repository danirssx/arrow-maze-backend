# Spec: Add `dimensions` field to LevelDefinition and Level (MAZ-230)

## Context

B1 (MAZ-226) added `z` to `Position`. B6 propagates that information upward into
the domain's top-level objects so that the rest of the system (B7 DTOs, B8 gate)
can read a stable, typed `dimensions: 2 | 3` value without re-scanning arrow cells.

## Design

`dimensions` is a **derived computed property** — not a constructor parameter.
It is derived from `LevelDefinition.arrows`: if any arrow has at least one path
cell with `z !== 0`, the definition is 3D; otherwise it is 2D.

```ts
// LevelDefinition
get dimensions(): 2 | 3 {
  return this._arrows.some(arrow => arrow.path.some(cell => cell.z !== 0)) ? 3 : 2;
}

// Level
get dimensions(): 2 | 3 {
  return this._definition.dimensions;
}
```

No new constructor parameters, no stored field, no persistence change in this ticket.
The persistence guard (storing `dimensions` in the DB) is B7's responsibility.

## Scenarios

### @s1 — all arrows at z=0 → dimensions=2
Given a LevelDefinition whose every arrow path cell has z=0
When dimensions is read
Then the result is 2

### @s2 — any arrow with a z≠0 cell → dimensions=3
Given a LevelDefinition containing one arrow whose path includes a cell with z=1
When dimensions is read
Then the result is 3

### @s3 — mix of 2D and 3D arrows → dimensions=3
Given a LevelDefinition with one 2D arrow (all z=0) and one 3D arrow (z=1)
When dimensions is read
Then the result is 3 (any z≠0 elevates to 3D)

### @s4 — Level.dimensions delegates to definition
Given a Level drafted with a 2D LevelDefinition
When Level.dimensions is read
Then the result is 2

### @s5 — Level.dimensions updates after updateDefinition
Given a Level drafted with a 2D definition
When updateDefinition() replaces it with a 3D definition
Then Level.dimensions returns 3
