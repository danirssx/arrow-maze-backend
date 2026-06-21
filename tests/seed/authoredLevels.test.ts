import { join } from "node:path";
import { loadAuthoredLevels } from "../../prisma/seed-data/authoredLevels.js";

// @s10 — authored abstract shaped levels are validated through the domain path.

describe("loadAuthoredLevels", () => {
  it("should_load_and_validate_the_authored_shaped_levels", () => {
    const levels = loadAuthoredLevels();

    expect(levels.length).toBeGreaterThanOrEqual(1);
    const cross = levels.find((level) => level.id === "550e8400-e29b-41d4-a716-446655440030");
    expect(cross).toBeDefined();
    expect(cross!.status).toBe("PUBLISHED");
    expect(cross!.boardShape).not.toBeNull();
    expect(cross!.boardShape!.type).toBe("CELL_MASK");
    expect(cross!.boardShape!.cells).toHaveLength(9);
  });

  it("should_publish_only_levels_whose_arrows_fit_the_mask", () => {
    const levels = loadAuthoredLevels();
    for (const level of levels) {
      const mask = new Set(level.boardShape!.cells.map((cell) => `${cell.row},${cell.col}`));
      for (const arrow of level.arrows) {
        for (const cell of arrow.path) {
          expect(mask.has(`${cell.row},${cell.col}`)).toBe(true);
        }
      }
    }
  });

  it("should_throw_when_an_authored_level_is_invalid", () => {
    const invalidDir = join(process.cwd(), "tests", "seed", "fixtures", "level-json-invalid");

    expect(() => loadAuthoredLevels(invalidDir)).toThrow();
  });
});
