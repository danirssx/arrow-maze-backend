# Spec: BoardSize depth dimension + BoardShape 3D cell support (MAZ-229)

## Context

B1 (MAZ-226) extended `Position` with a `z` coordinate. B4 propagates that extension
upward into the two VOs that define the board geometry:

- `BoardSize` — gains a `depth` dimension and a triple-loop `toCells()`.
- `BoardShape` — already works in 3D because `Position.toKey()` now emits `r,c,z`.
  B4 adds tests to document and protect that behavior explicitly.

## BoardSize changes

### New constant

```
BOARD_SIZE_MAX_DEPTH = 6
```

Chosen to keep mobile rendering feasible: 12 × 12 × 6 = 864 cells max.

### API

```ts
BoardSize.create(rows: number, cols: number, depth = 1): BoardSize
boardSize.depth: number
boardSize.toCells(): Position[]   // z-outer, row-middle, col-inner
```

`depth` defaults to 1 so every existing 2D call site keeps working unchanged.

### toCells() order

```
for z  in [0 .. depth-1]
  for row in [0 .. rows-1]
    for col in [0 .. cols-1]
      yield Position.create(row, col, z)
```

## BoardShape changes

No production code changes. `Position.toKey()` already emits `r,c,z`, so
`contains()` and `containsAll()` already differentiate by z. Tests are added
to document and protect this.

## Scenarios

### @s1 — create 3D BoardSize and read all accessors
Given rows=3, cols=4, depth=2
When BoardSize.create(3, 4, 2) is called
Then rows=3, cols=4, depth=2

### @s2 — toCells() enumerates all z-planes in order
Given a BoardSize(2, 2, 2)
When toCells() is called
Then the result is [z=0,r=0,c=0], [z=0,r=0,c=1], [z=0,r=1,c=0], [z=0,r=1,c=1],
                   [z=1,r=0,c=0], [z=1,r=0,c=1], [z=1,r=1,c=0], [z=1,r=1,c=1]

### @s3 — reject invalid depth
Given depth=0 or depth=-1 or depth=1.5
When BoardSize.create is called
Then InvalidArgumentError("positive integers") is thrown

### @s4 — reject depth > BOARD_SIZE_MAX_DEPTH
Given depth = BOARD_SIZE_MAX_DEPTH + 1
When BoardSize.create is called
Then InvalidArgumentError("must not exceed") is thrown

### @s5 — backward compat: create(rows, cols) defaults depth to 1 and toCells returns z=0
Given BoardSize.create(2, 2) with no depth argument
When toCells() is called
Then all cells have z=0 and depth accessor returns 1

### @s6 — BoardShape.contains() returns false for same row/col but different z
Given a shape with only Position(0, 0, 0)
When contains(Position(0, 0, 1)) is called
Then the result is false

### @s7 — BoardShape.contains() returns true for 3D position that is in the shape
Given a shape with Position(0, 0, 1)
When contains(Position(0, 0, 1)) is called
Then the result is true

### @s8 — BoardShape allows Position(0,0,0) and Position(0,0,1) as distinct cells
Given cells [Position(0,0,0), Position(0,0,1)]
When BoardShape.cellMask is called
Then no error is thrown and shape.size === 2

### @s9 — BoardShape rejects exact 3D duplicate
Given cells [Position(0,0,1), Position(0,0,1)]
When BoardShape.cellMask is called
Then InvalidArgumentError("Duplicate") is thrown
