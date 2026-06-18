import { CreateLevelUseCase } from "../../../src/application/level-catalog/use-cases/CreateLevelUseCase";
import { LevelStatus } from "../../../src/domain/level-catalog/enums/LevelStatus";
import { ValidationError } from "../../../src/shared/errors/ApplicationError";
import { FakeLevelRepository } from "./helpers/levelFixtures";

// Subject to human review — application use case test

const VALID_INPUT = {
  name: "Arrow Level 1",
  description: "A simple level",
  difficulty: "EASY",
  boardSize: { rows: 3, cols: 3 },
  cells: [
    { position: { row: 0, col: 0 }, type: "START", direction: "RIGHT" },
    { position: { row: 0, col: 1 }, type: "ARROW", direction: "DOWN" },
    { position: { row: 1, col: 1 }, type: "EXIT" },
  ],
};

describe("CreateLevelUseCase", () => {
  it("should_return_level_id_when_creation_succeeds", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new CreateLevelUseCase(repo);

    // Act
    const result = await useCase.execute(VALID_INPUT);

    // Assert
    expect(result.levelId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("should_persist_level_as_draft_when_creation_succeeds", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new CreateLevelUseCase(repo);

    // Act
    await useCase.execute(VALID_INPUT);

    // Assert
    expect(repo.savedLevels).toHaveLength(1);
    expect(repo.savedLevels[0].status).toBe(LevelStatus.DRAFT);
    expect(repo.savedLevels[0].name.value).toBe("Arrow Level 1");
  });

  it("should_throw_when_definition_has_no_exit", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new CreateLevelUseCase(repo);

    // Act / Assert
    await expect(
      useCase.execute({
        ...VALID_INPUT,
        cells: [
          { position: { row: 0, col: 0 }, type: "START", direction: "RIGHT" },
        ],
      })
    ).rejects.toThrow();
  });

  it("should_throw_validation_error_when_difficulty_is_invalid", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new CreateLevelUseCase(repo);

    // Act / Assert
    await expect(
      useCase.execute({ ...VALID_INPUT, difficulty: "IMPOSSIBLE" })
    ).rejects.toThrow(ValidationError);
  });

  it("should_throw_validation_error_when_cell_type_is_invalid", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new CreateLevelUseCase(repo);

    // Act / Assert
    await expect(
      useCase.execute({
        ...VALID_INPUT,
        cells: [
          { position: { row: 0, col: 0 }, type: "INVALID_CELL", direction: "RIGHT" },
          { position: { row: 1, col: 1 }, type: "EXIT" },
        ],
      })
    ).rejects.toThrow(ValidationError);
  });

  it("should_throw_validation_error_when_direction_is_invalid", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new CreateLevelUseCase(repo);

    // Act / Assert
    await expect(
      useCase.execute({
        ...VALID_INPUT,
        cells: [
          { position: { row: 0, col: 0 }, type: "START", direction: "DIAGONAL" },
          { position: { row: 1, col: 1 }, type: "EXIT" },
        ],
      })
    ).rejects.toThrow(ValidationError);
  });
});
