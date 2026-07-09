import { UpdateLevelDefinitionUseCase } from "../../../src/application/level-catalog/use-cases/UpdateLevelDefinitionUseCase";
import { NotFoundError } from "../../../src/shared/errors/ApplicationError";
import { BusinessRuleViolationError } from "../../../src/domain/errors/DomainError";
import type { Clock } from "../../../src/application/ports/Clock";
import { FakeLevelRepository, makeDraftLevel, makePublishedLevel, VALID_UUID } from "./helpers/levelFixtures";

// Subject to human review — application use case test

const FAKE_NOW = new Date("2024-01-15T10:00:00.000Z");
class FakeClock implements Clock {
  now(): Date { return FAKE_NOW; }
}

const NEW_DEFINITION = {
  actorRole: "ADMIN",
  attempts: 3,
  arrows: [
    { id: "b", color: "#56D879", path: [{ row: -1, col: 0 }, { row: 0, col: 0 }], direction: "DOWN" },
  ],
};

describe("UpdateLevelDefinitionUseCase", () => {
  it("should_update_definition_of_draft_level", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makeDraftLevel(VALID_UUID));
    const useCase = new UpdateLevelDefinitionUseCase(repo, new FakeClock());

    // Act
    const result = await useCase.execute({ levelId: VALID_UUID, ...NEW_DEFINITION });

    // Assert
    expect(result.levelId).toBe(VALID_UUID);
    expect(repo.savedLevels[0].definition.attempts).toBe(3);
    expect(repo.savedLevels[0].definition.arrows[0]!.id).toBe("b");
  });

  it("should_throw_not_found_when_level_does_not_exist", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new UpdateLevelDefinitionUseCase(repo, new FakeClock());

    // Act / Assert
    await expect(
      useCase.execute({ levelId: VALID_UUID, ...NEW_DEFINITION })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("should_throw_when_updating_definition_of_published_level", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makePublishedLevel(VALID_UUID));
    const useCase = new UpdateLevelDefinitionUseCase(repo, new FakeClock());

    // Act / Assert
    await expect(
      useCase.execute({ levelId: VALID_UUID, ...NEW_DEFINITION })
    ).rejects.toBeInstanceOf(BusinessRuleViolationError);
  });

  it("should_throw_forbidden_and_not_load_level_when_actor_is_not_admin", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makeDraftLevel(VALID_UUID));
    const useCase = new UpdateLevelDefinitionUseCase(repo, new FakeClock());

    // Act / Assert
    await expect(
      useCase.execute({ levelId: VALID_UUID, ...NEW_DEFINITION, actorRole: "USER" })
    ).rejects.toThrow("Admin access required");
    expect(repo.savedLevels).toHaveLength(0);
  });
});
