import { Direction } from "../../../src/domain/level-catalog/enums/Direction";
import { Difficulty } from "../../../src/domain/level-catalog/enums/Difficulty";
import { LevelSolvabilityPolicy } from "../../../src/domain/level-catalog/LevelSolvabilityPolicy";
import { RandomLevelStrategy } from "../../../src/domain/level-catalog/RandomLevelStrategy";
import type { RandomLevelOptions } from "../../../src/domain/level-catalog/RandomLevelStrategy";
import { BoardShape } from "../../../src/domain/level-catalog/value-objects/BoardShape";
import { Position } from "../../../src/domain/level-catalog/value-objects/Position";

function grid(rows: number, cols: number): BoardShape {
  const cells: Position[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells.push(Position.create(r, c));
    }
  }
  return BoardShape.cellMask(cells);
}

function grid3d(rows: number, cols: number, depth: number): BoardShape {
  const cells: Position[] = [];
  for (let z = 0; z < depth; z += 1) {
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        cells.push(Position.create(r, c, z));
      }
    }
  }
  return BoardShape.cellMask(cells);
}

const baseOptions: RandomLevelOptions = {
  seed: "alpha",
  difficulty: Difficulty.MEDIUM,
  shape: grid(5, 5),
  arrowCount: 3,
  maxArrowLength: 2,
  attempts: 5,
};

const serialize = (definition: { arrows: readonly { id: string; direction: string; path: readonly Position[] }[] }) =>
  definition.arrows.map(
    (arrow) => `${arrow.id}:${arrow.direction}:${arrow.path.map((cell) => cell.toKey()).join("|")}`
  );

describe("RandomLevelStrategy", () => {
  it("should_generate_a_solvable_level_with_arrows_inside_the_mask", () => {
    const result = new RandomLevelStrategy().generate(baseOptions);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.definition.arrows).toHaveLength(3);
    const cells = result.definition.arrows.flatMap((arrow) => [...arrow.path]);
    expect(result.boardShape.containsAll(cells)).toBe(true);
    expect(new LevelSolvabilityPolicy().isSolvable(result.definition)).toBe(true);
  });

  it("should_produce_a_known_layout_for_a_fixed_seed", () => {
    const result = new RandomLevelStrategy().generate(baseOptions);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const layout = result.definition.arrows.map((arrow) => ({
      id: arrow.id,
      color: arrow.color,
      direction: arrow.direction,
      path: arrow.path.map((cell) => [cell.row, cell.col]),
    }));
    expect(layout).toEqual([
      { id: "arrow-0", color: "#4B6BFB", direction: "DOWN", path: [[2, 2], [3, 2]] },
      { id: "arrow-1", color: "#3FD06A", direction: "LEFT", path: [[4, 4]] },
      { id: "arrow-2", color: "#FFC83D", direction: "RIGHT", path: [[3, 4]] },
    ]);
  });

  it("should_cycle_arrow_colors_through_the_palette", () => {
    const result = new RandomLevelStrategy().generate({
      ...baseOptions,
      seed: "palette",
      arrowCount: 8,
      maxArrowLength: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.definition.arrows.map((arrow) => arrow.color)).toEqual([
      "#4B6BFB",
      "#3FD06A",
      "#FFC83D",
      "#FF6FD8",
      "#3FC8FF",
      "#A06BFF",
      "#FF9F1C",
      "#22C9B6",
    ]);
  });

  it("should_be_deterministic_for_the_same_seed", () => {
    const first = new RandomLevelStrategy().generate(baseOptions);
    const second = new RandomLevelStrategy().generate(baseOptions);

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(serialize(first.definition)).toEqual(serialize(second.definition));
  });

  it("should_return_a_controlled_failure_when_it_cannot_satisfy_the_options", () => {
    const result = new RandomLevelStrategy().generate({
      ...baseOptions,
      shape: BoardShape.cellMask([Position.create(0, 0)]),
      arrowCount: 3,
      maxGenerationAttempts: 10,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("Could not generate a solvable level after 10 attempts");
  });

  it("should_reject_a_non_positive_arrow_count", () => {
    const result = new RandomLevelStrategy().generate({ ...baseOptions, arrowCount: 0 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("arrowCount must be a positive integer");
  });

  it("should_reject_a_non_positive_max_arrow_length", () => {
    const result = new RandomLevelStrategy().generate({ ...baseOptions, maxArrowLength: 0 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("maxArrowLength must be a positive integer");
  });

  // --- @s1: 3D board shape generates a solvable level ---

  it("should_generate_a_solvable_level_for_a_3d_board_shape", () => {
    const shape = grid3d(2, 2, 2);
    const result = new RandomLevelStrategy().generate({
      ...baseOptions,
      seed: "3d-basic",
      shape,
      arrowCount: 2,
      maxArrowLength: 2,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cells = result.definition.arrows.flatMap((arrow) => [...arrow.path]);
    expect(shape.containsAll(cells)).toBe(true);
    expect(new LevelSolvabilityPolicy().isSolvable(result.definition)).toBe(true);
  });

  // --- @s2: 3D shape uses 6-direction pool — FORWARD/BACK appear across seeds ---

  it("should_include_forward_or_back_in_generated_arrows_when_shape_spans_z_axis", () => {
    const shape = BoardShape.cellMask([
      Position.create(0, 0, 0),
      Position.create(0, 0, 1),
      Position.create(0, 0, 2),
    ]);
    const strategy = new RandomLevelStrategy();
    const zAxisDirections = new Set<string>([Direction.FORWARD, Direction.BACK]);

    // With the 6-direction pool (3D shape), at least one seed in a deterministic
    // range picks FORWARD or BACK. With the old 4-direction pool it would never happen.
    const foundZAxisArrow = Array.from({ length: 30 }, (_, i) => `z-probe-${i}`).some((seed) => {
      const result = strategy.generate({ ...baseOptions, seed, shape, arrowCount: 1, maxArrowLength: 2 });
      return result.ok && zAxisDirections.has(result.definition.arrows[0]!.direction);
    });

    expect(foundZAxisArrow).toBe(true);
  });

  // --- @s3: 2D board unchanged — same seed produces same known layout with z=0 ---

  it("should_keep_2d_known_layout_unchanged_and_all_cells_at_z0_when_shape_is_planar", () => {
    const result = new RandomLevelStrategy().generate(baseOptions);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const layout = result.definition.arrows.map((arrow) => ({
      id: arrow.id,
      direction: arrow.direction,
      path: arrow.path.map((cell) => ({ row: cell.row, col: cell.col, z: cell.z })),
    }));
    expect(layout).toEqual([
      { id: "arrow-0", direction: "DOWN", path: [{ row: 2, col: 2, z: 0 }, { row: 3, col: 2, z: 0 }] },
      { id: "arrow-1", direction: "LEFT", path: [{ row: 4, col: 4, z: 0 }] },
      { id: "arrow-2", direction: "RIGHT", path: [{ row: 3, col: 4, z: 0 }] },
    ]);
  });

  // --- @s4: 3D generation is deterministic ---

  it("should_be_deterministic_for_the_same_seed_on_a_3d_shape", () => {
    const options: RandomLevelOptions = {
      ...baseOptions,
      seed: "3d-determinism",
      shape: grid3d(2, 2, 2),
      arrowCount: 2,
      maxArrowLength: 2,
    };
    const first = new RandomLevelStrategy().generate(options);
    const second = new RandomLevelStrategy().generate(options);

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(serialize(first.definition)).toEqual(serialize(second.definition));
  });
});
