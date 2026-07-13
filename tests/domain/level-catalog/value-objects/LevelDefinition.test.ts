import { Direction } from "../../../../src/domain/level-catalog/enums/Direction";
import { ArrowSpec } from "../../../../src/domain/level-catalog/value-objects/ArrowSpec";
import {
  DEFAULT_ATTEMPTS,
  LEVEL_DEFINITION_MAX_ARROWS,
  LevelDefinition,
} from "../../../../src/domain/level-catalog/value-objects/LevelDefinition";
import { Position } from "../../../../src/domain/level-catalog/value-objects/Position";

const arrow = (id: string) =>
  ArrowSpec.create(id, "#5262FB", [Position.create(0, 0)], Direction.UP);

const arrow3d = (id: string) =>
  ArrowSpec.create(id, "#5262FB", [Position.create(0, 0, 1)], Direction.FORWARD);

describe("LevelDefinition", () => {
  it("should_create_when_arrows_are_valid", () => {
    const def = LevelDefinition.create([arrow("a")], 3);

    expect(def.arrows).toHaveLength(1);
    expect(def.attempts).toBe(3);
  });

  it("should_use_default_attempts_when_omitted", () => {
    const def = LevelDefinition.create([arrow("a")]);

    expect(def.attempts).toBe(DEFAULT_ATTEMPTS);
  });

  it("should_throw_when_definition_has_no_arrows", () => {
    expect(() => LevelDefinition.create([])).toThrow("at least one arrow");
  });

  it("should_throw_when_attempts_are_invalid", () => {
    expect(() => LevelDefinition.create([arrow("a")], 0)).toThrow("positive integer");
  });

  it("should_throw_when_arrow_ids_are_duplicated", () => {
    expect(() => LevelDefinition.create([arrow("a"), arrow("a")])).toThrow("Duplicate arrow id");
  });

  it("should_throw_when_arrow_count_exceeds_m12_limit", () => {
    const arrows = Array.from({ length: LEVEL_DEFINITION_MAX_ARROWS + 1 }, (_, index) =>
      arrow(`a-${index}`)
    );

    expect(() => LevelDefinition.create(arrows)).toThrow("must not exceed");
  });

  // --- @s1: all arrows at z=0 → dimensions=2 ---

  it("should_return_dimensions_2_when_all_arrow_cells_are_at_z0", () => {
    const def = LevelDefinition.create([arrow("a"), arrow("b")]);

    expect(def.dimensions).toBe(2);
  });

  // --- @s2: any arrow with z≠0 → dimensions=3 ---

  it("should_return_dimensions_3_when_any_arrow_cell_has_z_not_zero", () => {
    const def = LevelDefinition.create([arrow3d("a")]);

    expect(def.dimensions).toBe(3);
  });

  // --- @s3: mix of 2D and 3D arrows → dimensions=3 ---

  it("should_return_dimensions_3_when_mix_of_2d_and_3d_arrows", () => {
    const def = LevelDefinition.create([arrow("a"), arrow3d("b")]);

    expect(def.dimensions).toBe(3);
  });
});
