import { UpdateLevelDefinitionUseCase } from "../../../src/application/level-catalog/use-cases/UpdateLevelDefinitionUseCase";
import { NotFoundError } from "../../../src/shared/errors/ApplicationError";
import { BusinessRuleViolationError } from "../../../src/domain/errors/DomainError";
import { FakeLevelRepository, makeDraftLevel, makePublishedLevel, VALID_UUID } from "./helpers/levelFixtures";

// Subject to human review — application use case test

const NEW_DEFINITION = {
  boardSize: { rows: 3, cols: 3 },
  cells: [
    { position: { row: 0, col: 0 }, type: "START", direction: "DOWN" },
    { position: { row: 1, col: 0 }, type: "ARROW", direction: "RIGHT" },
    { position: { row: 1, col: 1 }, type: "EXIT" },
  ],
};

describe("UpdateLevelDefinitionUseCase", () => {
  it("should_update_definition_of_draft_level", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makeDraftLevel(VALID_UUID));
    const useCase = new UpdateLevelDefinitionUseCase(repo);

    // Act
    const result = await useCase.execute({ levelId: VALID_UUID, ...NEW_DEFINITION });

    // Assert
    expect(result.levelId).toBe(VALID_UUID);
    expect(repo.savedLevels[0].definition.boardSize.rows).toBe(3);
  });

  it("should_throw_not_found_when_level_does_not_exist", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new UpdateLevelDefinitionUseCase(repo);

    // Act / Assert
    await expect(
      useCase.execute({ levelId: VALID_UUID, ...NEW_DEFINITION })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("should_throw_when_updating_definition_of_published_level", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makePublishedLevel(VALID_UUID));
    const useCase = new UpdateLevelDefinitionUseCase(repo);

    // Act / Assert
    await expect(
      useCase.execute({ levelId: VALID_UUID, ...NEW_DEFINITION })
    ).rejects.toBeInstanceOf(BusinessRuleViolationError);
  });
});
