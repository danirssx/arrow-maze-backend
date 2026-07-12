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
});
