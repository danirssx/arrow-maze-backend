import { ArchiveLevelUseCase } from "../../../src/application/level-catalog/use-cases/ArchiveLevelUseCase";
import { LevelStatus } from "../../../src/domain/level-catalog/enums/LevelStatus";
import { NotFoundError } from "../../../src/shared/errors/ApplicationError";
import { BusinessRuleViolationError } from "../../../src/domain/errors/DomainError";
import { FakeLevelRepository, makeDraftLevel, makePublishedLevel, VALID_UUID } from "./helpers/levelFixtures";

// Subject to human review — application use case test

describe("ArchiveLevelUseCase", () => {
  it("should_archive_published_level_and_return_level_id", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makePublishedLevel(VALID_UUID));
    const useCase = new ArchiveLevelUseCase(repo);

    // Act
    const result = await useCase.execute({ levelId: VALID_UUID });

    // Assert
    expect(result.levelId).toBe(VALID_UUID);
    expect(repo.savedLevels[0].status).toBe(LevelStatus.ARCHIVED);
  });

  it("should_throw_not_found_when_level_does_not_exist", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new ArchiveLevelUseCase(repo);

    // Act / Assert
    await expect(
      useCase.execute({ levelId: VALID_UUID })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("should_throw_when_draft_level_is_archived", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makeDraftLevel(VALID_UUID));
    const useCase = new ArchiveLevelUseCase(repo);

    // Act / Assert
    await expect(
      useCase.execute({ levelId: VALID_UUID })
    ).rejects.toBeInstanceOf(BusinessRuleViolationError);
  });
});
