import { GetLevelsUseCase } from "../../../src/application/level-catalog/use-cases/GetLevelsUseCase";
import { LevelStatus } from "../../../src/domain/level-catalog/enums/LevelStatus";
import { FakeLevelRepository, makeDraftLevel, makePublishedLevel, VALID_UUID } from "./helpers/levelFixtures";

// Subject to human review — application use case test

describe("GetLevelsUseCase", () => {
  it("should_return_only_published_levels_when_both_draft_and_published_exist", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(
      makeDraftLevel("550e8400-e29b-41d4-a716-446655440001"),
      makePublishedLevel("550e8400-e29b-41d4-a716-446655440002")
    );
    const useCase = new GetLevelsUseCase(repo);

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result.levels).toHaveLength(1);
    expect(result.levels[0].levelId).toBe("550e8400-e29b-41d4-a716-446655440002");
  });

  it("should_return_empty_array_when_no_published_levels_exist", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makeDraftLevel(VALID_UUID));
    const useCase = new GetLevelsUseCase(repo);

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result.levels).toHaveLength(0);
  });

  it("should_return_level_summary_dto_with_expected_fields", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makePublishedLevel(VALID_UUID));
    const useCase = new GetLevelsUseCase(repo);

    // Act
    const result = await useCase.execute({});

    // Assert
    const dto = result.levels[0];
    expect(dto.levelId).toBe(VALID_UUID);
    expect(dto.name).toBe("Test Level");
    expect(typeof dto.difficulty).toBe("string");
    expect(dto.createdAt).toBeInstanceOf(Date);
  });

  it("should_not_return_archived_levels", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const { makeArchivedLevel } = await import("./helpers/levelFixtures");
    repo.seed(makeArchivedLevel(VALID_UUID));
    const useCase = new GetLevelsUseCase(repo);

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result.levels).toHaveLength(0);
  });
});
