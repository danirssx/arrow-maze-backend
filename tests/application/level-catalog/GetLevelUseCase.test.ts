import { GetLevelUseCase } from "../../../src/application/level-catalog/use-cases/GetLevelUseCase";
import { NotFoundError } from "../../../src/shared/errors/ApplicationError";
import {
  FakeLevelRepository,
  makePublishedLevel,
  makeShapedPublishedLevel,
  VALID_UUID,
} from "./helpers/levelFixtures";

// Subject to human review — application use case test

describe("GetLevelUseCase", () => {
  it("should_return_level_dto_when_level_exists", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makePublishedLevel(VALID_UUID));
    const useCase = new GetLevelUseCase(repo);

    // Act
    const result = await useCase.execute({ levelId: VALID_UUID });

    // Assert
    expect(result.level.levelId).toBe(VALID_UUID);
    expect(result.level.name).toBe("Test Level");
    expect(result.level.description).toBe("A test level");
    expect(typeof result.level.difficulty).toBe("string");
    expect(typeof result.level.status).toBe("string");
    expect(result.level.version).toBe(1);
    expect(result.level.createdAt).toBeInstanceOf(Date);
    expect(result.level.updatedAt).toBeInstanceOf(Date);
  });

  it("should_throw_not_found_when_level_does_not_exist", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new GetLevelUseCase(repo);

    // Act / Assert
    await expect(
      useCase.execute({ levelId: VALID_UUID })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("should_throw_when_level_id_format_is_invalid", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const useCase = new GetLevelUseCase(repo);

    // Act / Assert
    await expect(
      useCase.execute({ levelId: "not-a-uuid" })
    ).rejects.toThrow();
  });

  it("should_include_board_shape_in_definition_when_level_has_a_shape", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makeShapedPublishedLevel(VALID_UUID));
    const useCase = new GetLevelUseCase(repo);

    // Act
    const result = await useCase.execute({ levelId: VALID_UUID });

    // Assert
    expect(result.level.definition.boardShape).toBeDefined();
    expect(result.level.definition.boardShape!.type).toBe("CELL_MASK");
    expect(result.level.definition.boardShape!.cells).toHaveLength(4);
  });

  it("should_omit_board_shape_when_level_has_none", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makePublishedLevel(VALID_UUID));
    const useCase = new GetLevelUseCase(repo);

    // Act
    const result = await useCase.execute({ levelId: VALID_UUID });

    // Assert
    expect(result.level.definition.boardShape).toBeUndefined();
  });
});
