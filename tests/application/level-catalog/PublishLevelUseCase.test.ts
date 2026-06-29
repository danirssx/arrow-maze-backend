import { PublishLevelUseCase } from "../../../src/application/level-catalog/use-cases/PublishLevelUseCase";
import { LevelSolvabilityPolicy } from "../../../src/domain/level-catalog/LevelSolvabilityPolicy";
import type { LevelDefinition } from "../../../src/domain/level-catalog/value-objects/LevelDefinition";
import { LevelStatus } from "../../../src/domain/level-catalog/enums/LevelStatus";
import { NotFoundError } from "../../../src/shared/errors/ApplicationError";
import { BusinessRuleViolationError } from "../../../src/domain/errors/DomainError";
import type { Clock } from "../../../src/application/ports/Clock";
import { FakeLevelRepository, makeDraftLevel, VALID_UUID } from "./helpers/levelFixtures";

// Subject to human review — application use case test

const FAKE_NOW = new Date("2024-01-15T10:00:00.000Z");
class FakeClock implements Clock {
  now(): Date { return FAKE_NOW; }
}

class AlwaysSolvablePolicy extends LevelSolvabilityPolicy {
  override isSolvable(_def: LevelDefinition): boolean { return true; }
}

class NeverSolvablePolicy extends LevelSolvabilityPolicy {
  override isSolvable(_def: LevelDefinition): boolean { return false; }
}

describe("PublishLevelUseCase", () => {
  it("should_publish_level_and_return_level_id_when_solvable", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makeDraftLevel(VALID_UUID));
    const useCase = new PublishLevelUseCase(repo, new AlwaysSolvablePolicy(), new FakeClock());

    // Act
    const result = await useCase.execute({ levelId: VALID_UUID });

    // Assert
    expect(result.levelId).toBe(VALID_UUID);
    expect(repo.savedLevels[0].status).toBe(LevelStatus.PUBLISHED);
  });

  it("should_throw_not_found_when_level_does_not_exist", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new PublishLevelUseCase(repo, new AlwaysSolvablePolicy(), new FakeClock());

    // Act / Assert
    await expect(
      useCase.execute({ levelId: VALID_UUID })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("should_throw_when_level_definition_is_not_solvable", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makeDraftLevel(VALID_UUID));
    const useCase = new PublishLevelUseCase(repo, new NeverSolvablePolicy(), new FakeClock());

    // Act / Assert
    await expect(
      useCase.execute({ levelId: VALID_UUID })
    ).rejects.toBeInstanceOf(BusinessRuleViolationError);
  });
});
