import { CreateLevelUseCase } from "../../../src/application/level-catalog/use-cases/CreateLevelUseCase";
import { LevelStatus } from "../../../src/domain/level-catalog/enums/LevelStatus";
import { ValidationError } from "../../../src/shared/errors/ApplicationError";
import type { IdGenerator } from "../../../src/application/ports/IdGenerator";
import type { Clock } from "../../../src/application/ports/Clock";
import { FakeLevelRepository } from "./helpers/levelFixtures";

// Subject to human review — application use case test

const FAKE_LEVEL_ID = "550e8400-e29b-41d4-a716-446655440099";
const FAKE_NOW = new Date("2024-01-15T10:00:00.000Z");

class FakeIdGenerator implements IdGenerator {
  generate(): string { return FAKE_LEVEL_ID; }
}

class FakeClock implements Clock {
  now(): Date { return FAKE_NOW; }
}

const VALID_INPUT = {
  actorRole: "ADMIN",
  name: "Arrow Level 1",
  description: "A simple level",
  difficulty: "EASY",
  attempts: 4,
  arrows: [
    { id: "a", color: "#5262FB", path: [{ row: 0, col: 0 }], direction: "UP" },
  ],
};

describe("CreateLevelUseCase", () => {
  it("should_return_level_id_when_creation_succeeds", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new CreateLevelUseCase(repo, new FakeIdGenerator(), new FakeClock());

    // Act
    const result = await useCase.execute(VALID_INPUT);

    // Assert
    expect(result.levelId).toBe(FAKE_LEVEL_ID);
  });

  it("should_persist_level_as_draft_when_creation_succeeds", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new CreateLevelUseCase(repo, new FakeIdGenerator(), new FakeClock());

    // Act
    await useCase.execute(VALID_INPUT);

    // Assert
    expect(repo.savedLevels).toHaveLength(1);
    expect(repo.savedLevels[0].status).toBe(LevelStatus.DRAFT);
    expect(repo.savedLevels[0].name.value).toBe("Arrow Level 1");
    expect(repo.savedLevels[0].definition.attempts).toBe(4);
  });

  it("should_throw_when_definition_has_no_arrows", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new CreateLevelUseCase(repo, new FakeIdGenerator(), new FakeClock());

    // Act / Assert
    await expect(
      useCase.execute({
        ...VALID_INPUT,
        arrows: [],
      })
    ).rejects.toThrow();
  });

  it("should_throw_validation_error_when_difficulty_is_invalid", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new CreateLevelUseCase(repo, new FakeIdGenerator(), new FakeClock());

    // Act / Assert
    await expect(
      useCase.execute({ ...VALID_INPUT, difficulty: "IMPOSSIBLE" })
    ).rejects.toThrow(ValidationError);
  });

  it("should_throw_when_attempts_are_invalid", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new CreateLevelUseCase(repo, new FakeIdGenerator(), new FakeClock());

    // Act / Assert
    await expect(
      useCase.execute({ ...VALID_INPUT, attempts: 0 })
    ).rejects.toThrow();
  });

  it("should_throw_validation_error_when_direction_is_invalid", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new CreateLevelUseCase(repo, new FakeIdGenerator(), new FakeClock());

    // Act / Assert
    await expect(
      useCase.execute({
        ...VALID_INPUT,
        arrows: [
          { id: "a", color: "#5262FB", path: [{ row: 0, col: 0 }], direction: "DIAGONAL" },
        ],
      })
    ).rejects.toThrow(ValidationError);
  });

  it("should_throw_forbidden_and_not_persist_when_actor_is_not_admin", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new CreateLevelUseCase(repo, new FakeIdGenerator(), new FakeClock());

    // Act / Assert
    await expect(
      useCase.execute({ ...VALID_INPUT, actorRole: "USER" })
    ).rejects.toThrow("Admin access required");
    expect(repo.savedLevels).toHaveLength(0);
  });

  describe("board shape (Option A)", () => {
    const SHAPED_INPUT = {
      actorRole: "ADMIN",
      name: "Shaped Level",
      description: "An abstract shaped level",
      difficulty: "EASY",
      attempts: 4,
      arrows: [
        {
          id: "a",
          color: "#5262FB",
          path: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
          ],
          direction: "RIGHT",
        },
      ],
      boardShape: {
        type: "CELL_MASK",
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 1, col: 0 },
        ],
      },
    };

    it("should_persist_board_shape_when_create_input_has_a_valid_shape", async () => {
      // Arrange
      const repo = new FakeLevelRepository();
      const useCase = new CreateLevelUseCase(repo, new FakeIdGenerator(), new FakeClock());

      // Act
      await useCase.execute(SHAPED_INPUT);

      // Assert
      expect(repo.savedLevels[0].boardShape).toBeDefined();
      expect(repo.savedLevels[0].boardShape!.size).toBe(3);
    });

    it("should_throw_when_board_shape_type_is_unsupported", async () => {
      // Arrange
      const repo = new FakeLevelRepository();
      const useCase = new CreateLevelUseCase(repo, new FakeIdGenerator(), new FakeClock());

      // Act / Assert
      await expect(
        useCase.execute({
          ...SHAPED_INPUT,
          boardShape: { ...SHAPED_INPUT.boardShape, type: "HEXAGON" },
        })
      ).rejects.toThrow();
    });

    it("should_throw_when_board_shape_has_duplicate_cells", async () => {
      // Arrange
      const repo = new FakeLevelRepository();
      const useCase = new CreateLevelUseCase(repo, new FakeIdGenerator(), new FakeClock());

      // Act / Assert
      await expect(
        useCase.execute({
          ...SHAPED_INPUT,
          boardShape: {
            type: "CELL_MASK",
            cells: [
              { row: 0, col: 0 },
              { row: 0, col: 0 },
            ],
          },
        })
      ).rejects.toThrow();
    });

    it("should_throw_when_an_arrow_cell_lies_outside_the_board_shape", async () => {
      // Arrange — mask omits (0, 1) which the arrow occupies
      const repo = new FakeLevelRepository();
      const useCase = new CreateLevelUseCase(repo, new FakeIdGenerator(), new FakeClock());

      // Act / Assert
      await expect(
        useCase.execute({
          ...SHAPED_INPUT,
          boardShape: { type: "CELL_MASK", cells: [{ row: 0, col: 0 }] },
        })
      ).rejects.toThrow();
    });
  });

  // @s8 — CreateLevelUseCase uses injected IdGenerator and Clock
  describe("@s8 — injected id generator and clock", () => {
    it("should_use_injected_id_when_level_is_created", async () => {
      // Arrange
      const repo = new FakeLevelRepository();
      const useCase = new CreateLevelUseCase(repo, new FakeIdGenerator(), new FakeClock());

      // Act
      const result = await useCase.execute(VALID_INPUT);

      // Assert — id comes from FakeIdGenerator, not from random UUID
      expect(result.levelId).toBe(FAKE_LEVEL_ID);
    });

    it("should_use_injected_clock_when_level_is_created", async () => {
      // Arrange
      const repo = new FakeLevelRepository();
      const useCase = new CreateLevelUseCase(repo, new FakeIdGenerator(), new FakeClock());

      // Act
      await useCase.execute(VALID_INPUT);

      // Assert — createdAt comes from FakeClock
      expect(repo.savedLevels[0].createdAt).toEqual(FAKE_NOW);
    });
  });
});
