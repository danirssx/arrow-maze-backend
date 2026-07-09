import { ArchiveLevelUseCase } from "../../../src/application/level-catalog/use-cases/ArchiveLevelUseCase";
import { LevelStatus } from "../../../src/domain/level-catalog/enums/LevelStatus";
import { NotFoundError } from "../../../src/shared/errors/ApplicationError";
import { BusinessRuleViolationError } from "../../../src/domain/errors/DomainError";
import type { Clock } from "../../../src/application/ports/Clock";
import { FakeLevelRepository, makeDraftLevel, makePublishedLevel, VALID_UUID } from "./helpers/levelFixtures";

// Subject to human review — application use case test

const FAKE_NOW = new Date("2024-01-15T10:00:00.000Z");
class FakeClock implements Clock {
  now(): Date { return FAKE_NOW; }
}

describe("ArchiveLevelUseCase", () => {
  it("should_archive_published_level_and_return_level_id", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makePublishedLevel(VALID_UUID));
    const useCase = new ArchiveLevelUseCase(repo, new FakeClock());

    // Act
    const result = await useCase.execute({ actorRole: "ADMIN", levelId: VALID_UUID });

    // Assert
    expect(result.levelId).toBe(VALID_UUID);
    expect(repo.savedLevels[0].status).toBe(LevelStatus.ARCHIVED);
  });

  it("should_archive_published_level_without_leaderboard_or_progress_collaborators", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makePublishedLevel(VALID_UUID));
    const useCase = new ArchiveLevelUseCase(repo, new FakeClock());

    // Act
    await useCase.execute({ actorRole: "ADMIN", levelId: VALID_UUID });

    // Assert
    expect(repo.savedLevels).toHaveLength(1);
    expect(repo.savedLevels[0].id.value).toBe(VALID_UUID);
    expect(repo.savedLevels[0].status).toBe(LevelStatus.ARCHIVED);
  });

  it("should_throw_not_found_when_level_does_not_exist", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new ArchiveLevelUseCase(repo, new FakeClock());

    // Act / Assert
    await expect(
      useCase.execute({ actorRole: "ADMIN", levelId: VALID_UUID })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("should_throw_when_draft_level_is_archived", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makeDraftLevel(VALID_UUID));
    const useCase = new ArchiveLevelUseCase(repo, new FakeClock());

    // Act / Assert
    await expect(
      useCase.execute({ actorRole: "ADMIN", levelId: VALID_UUID })
    ).rejects.toBeInstanceOf(BusinessRuleViolationError);
  });

  it("should_throw_forbidden_and_not_persist_when_actor_is_not_admin", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makePublishedLevel(VALID_UUID));
    const useCase = new ArchiveLevelUseCase(repo, new FakeClock());

    // Act / Assert
    await expect(
      useCase.execute({ actorRole: "USER", levelId: VALID_UUID })
    ).rejects.toThrow("Admin access required");
    expect(repo.savedLevels).toHaveLength(0);
  });
});
