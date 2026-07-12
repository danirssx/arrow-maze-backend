import { join } from "node:path";
import { loadAuthoredLevels } from "../../prisma/seed-data/authoredLevels.js";

// MAZ-168: prisma/seed-data/level-json/ is the single source of truth for the catalog.
const CROSS_BEACON_ID = "550e8400-e29b-41d4-a716-446655440030";
const PACKED_START_ID = "550e8400-e29b-41d4-a716-446655440010";
const GENERATED_SHAPED_LEVEL_IDS = new Set([
  "550e8400-e29b-41d4-a716-446655440040",
  "550e8400-e29b-41d4-a716-446655440041",
  "550e8400-e29b-41d4-a716-446655440042",
  "550e8400-e29b-41d4-a716-446655440043",
  "550e8400-e29b-41d4-a716-446655440044",
  "550e8400-e29b-41d4-a716-446655440045",
  "550e8400-e29b-41d4-a716-446655440046",
  "550e8400-e29b-41d4-a716-446655440047",
  "550e8400-e29b-41d4-a716-446655440048",
  "550e8400-e29b-41d4-a716-446655440049",
  "550e8400-e29b-41d4-a716-446655440050",
]);

function fixtureDir(name: string): string {
  return join(process.cwd(), "tests", "seed", "fixtures", name);
}

describe("loadAuthoredLevels", () => {
  it("should_load_the_whole_catalog_from_level_json", () => {
    const levels = loadAuthoredLevels();

    // 15 migrated levels + the abstract Cross Beacon (more is fine — adding a JSON is the point).
    expect(levels.length).toBeGreaterThanOrEqual(16);
    expect(levels.every((level) => level.status === "PUBLISHED")).toBe(true);
    expect(levels.map((level) => level.id)).toContain(PACKED_START_ID);
    expect(levels.map((level) => level.id)).toContain(CROSS_BEACON_ID);
  });

  it("should_sort_levels_by_ascending_unique_order_starting_at_one", () => {
    const orders = loadAuthoredLevels().map((level) => level.order);

    expect(orders[0]).toBe(1);
    expect(new Set(orders).size).toBe(orders.length); // unique
    for (let i = 1; i < orders.length; i += 1) {
      expect(orders[i]!).toBeGreaterThan(orders[i - 1]!);
    }
  });

  it("should_expose_the_shaped_level_with_its_cell_mask", () => {
    const cross = loadAuthoredLevels().find((level) => level.id === CROSS_BEACON_ID);

    expect(cross).toBeDefined();
    expect(cross!.boardShape).not.toBeNull();
    expect(cross!.boardShape!.type).toBe("CELL_MASK");
    expect(cross!.boardShape!.cells).toHaveLength(9);
  });

  it("should_keep_non_shaped_levels_without_a_mask", () => {
    const packedStart = loadAuthoredLevels().find((level) => level.id === PACKED_START_ID);

    expect(packedStart).toBeDefined();
    expect(packedStart!.boardShape).toBeNull();
  });

  it("should_keep_every_arrow_inside_the_mask_for_shaped_levels", () => {
    for (const level of loadAuthoredLevels()) {
      if (level.boardShape === null) continue;
      const mask = new Set(level.boardShape.cells.map((cell) => `${cell.row},${cell.col}`));
      for (const arrow of level.arrows) {
        for (const cell of arrow.path) {
          expect(mask.has(`${cell.row},${cell.col}`)).toBe(true);
        }
      }
    }
  });

  it("should_throw_when_an_authored_level_is_invalid", () => {
    expect(() => loadAuthoredLevels(fixtureDir("level-json-invalid"))).toThrow();
  });

  it("should_throw_on_a_duplicate_level_id", () => {
    expect(() => loadAuthoredLevels(fixtureDir("level-json-dup-id"))).toThrow(
      /Duplicate authored level id/
    );
  });

  it("should_throw_on_a_duplicate_order", () => {
    expect(() => loadAuthoredLevels(fixtureDir("level-json-dup-order"))).toThrow(
      /Duplicate authored level order/
    );
  });

  it("should_populate_generated_shaped_levels_with_only_multi_cell_arrows", () => {
    // The generated shaped pack must stay dense even when catalog order is shuffled.
    const shaped = loadAuthoredLevels().filter((level) =>
      GENERATED_SHAPED_LEVEL_IDS.has(level.id)
    );

    expect(shaped).toHaveLength(GENERATED_SHAPED_LEVEL_IDS.size);
    for (const level of shaped) {
      expect(level.boardShape).not.toBeNull();
      expect(level.arrows.length).toBeGreaterThan(0);
      for (const arrow of level.arrows) {
        expect(arrow.path.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
