import { CreateLevelUseCase } from "../../../src/application/level-catalog/use-cases/CreateLevelUseCase";
import { LevelStatus } from "../../../src/domain/level-catalog/enums/LevelStatus";
import { ValidationError } from "../../../src/shared/errors/ApplicationError";
import { FakeLevelRepository } from "./helpers/levelFixtures";

// Subject to human review — application use case test

const VALID_INPUT = {
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
    expect(repo.savedLevels[0].definition.attempts).toBe(4);
  });

  it("should_throw_when_definition_has_no_arrows", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new CreateLevelUseCase(repo);

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
    const useCase = new CreateLevelUseCase(repo);

    // Act / Assert
    await expect(
      useCase.execute({ ...VALID_INPUT, difficulty: "IMPOSSIBLE" })
    ).rejects.toThrow(ValidationError);
  });

  it("should_throw_when_attempts_are_invalid", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new CreateLevelUseCase(repo);

    // Act / Assert
    await expect(
      useCase.execute({ ...VALID_INPUT, attempts: 0 })
    ).rejects.toThrow();
  });

  it("should_throw_validation_error_when_direction_is_invalid", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new CreateLevelUseCase(repo);

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
});
