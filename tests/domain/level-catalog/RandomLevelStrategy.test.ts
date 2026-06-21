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
});
