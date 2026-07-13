# Spec: Extend RandomLevelStrategy for 3D level generation (MAZ-231)

## Context

B2 (MAZ-227) added FORWARD/BACK to `Direction` and updated `DELTAS` in
`RandomLevelStrategy` to 3-tuples, but intentionally left the `DIRECTIONS`
pool at the 4 planar values until the full 3D pipeline was in place (B3 + B4).
B5 completes that pipeline: the generator now selects FORWARD/BACK when the
board shape spans multiple z-planes.

## Key design decision: shape-driven direction pool

Adding FORWARD/BACK unconditionally to the direction pool would silently change
the PRNG output for all existing 2D seeds (it picks `DIRECTIONS[floor(rng()*N)]`,
so N=6 ≠ N=4 shifts every subsequent pick). Instead, the pool is chosen per
`generate()` call:

- `shape.cells.some(c => c.z !== 0)` → **true**: 6-direction pool (planar + z-axis)
- all cells at z=0 → **false**: 4-direction pool (planar only, unchanged behavior)

This keeps every existing 2D seed deterministic.

## Implementation

```ts
const PLANAR_DIRECTIONS: readonly Direction[] = [UP, DOWN, LEFT, RIGHT];
const ALL_DIRECTIONS:    readonly Direction[] = [UP, DOWN, LEFT, RIGHT, FORWARD, BACK];

// inside tryBuild:
const directions = options.shape.cells.some(c => c.z !== 0)
  ? ALL_DIRECTIONS
  : PLANAR_DIRECTIONS;
// pass directions down to placeArrow
```

`placeArrow` receives `directions` as a parameter instead of reading the
module-level constant.

## Scenarios

### @s1 — 3D board shape generates a solvable level
Given a BoardShape with cells on z=0 and z=1 (e.g. 2×2×2 grid)
When generate() is called with arrowCount=2, maxArrowLength=2
Then ok=true, all arrow cells are inside the shape, and LevelSolvabilityPolicy returns solvable

### @s2 — z-axis-only column forces FORWARD or BACK arrows
Given a BoardShape with only [0,0,0], [0,0,1], [0,0,2] (single column along z)
When generate() is called with arrowCount=1, maxArrowLength=2
Then ok=true and the single arrow's direction is FORWARD or BACK

### @s3 — 2D boards unchanged: same seed produces same known layout
Given the same options as the pre-existing "alpha" / 5×5 / arrowCount=3 test
When generate() is called after B5
Then the layout matches the pre-B5 known snapshot exactly

### @s4 — 3D generation is deterministic
Given a fixed seed and a 3D board shape
When generate() is called twice
Then both results are identical
