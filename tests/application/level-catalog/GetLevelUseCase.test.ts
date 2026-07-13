import { GetLevelUseCase } from "../../../src/application/level-catalog/use-cases/GetLevelUseCase";
import { NotFoundError } from "../../../src/shared/errors/ApplicationError";
import {
  FakeLevelRepository,
  makePublishedLevel,
  makeShapedPublishedLevel,
  make3dPublishedLevel,
  makeShapedPublishedLevel3d,
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
    expect(typeof result.level.createdAt).toBe('string');
    expect(result.level.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof result.level.updatedAt).toBe('string');
    expect(result.level.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
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

  it("should_include_time_limit_seconds_in_dto_when_level_has_time_limit", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    const { makeTimedDraftLevel } = await import("./helpers/levelFixtures");
    const timedLevel = makeTimedDraftLevel(VALID_UUID, 120);
    repo.seed(timedLevel);
    const useCase = new GetLevelUseCase(repo);

    // Act
    const result = await useCase.execute({ levelId: VALID_UUID });

    // Assert
    expect(result.level.timeLimitSeconds).toBe(120);
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

  // @s3 — 3D gate: 3D level hidden from client without capability
  it("should_throw_not_found_when_level_is_3d_and_supports3d_is_false", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(make3dPublishedLevel(VALID_UUID));
    const useCase = new GetLevelUseCase(repo);

    // Act / Assert
    await expect(
      useCase.execute({ levelId: VALID_UUID, supports3d: false })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  // @s4 — 3D gate: 3D level returned to capable client
  it("should_return_3d_level_when_supports3d_is_true", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(make3dPublishedLevel(VALID_UUID));
    const useCase = new GetLevelUseCase(repo);

    // Act
    const result = await useCase.execute({ levelId: VALID_UUID, supports3d: true });

    // Assert
    expect(result.level.levelId).toBe(VALID_UUID);
  });

  // @s5 — 3D gate: 2D level always returned regardless of capability flag
  it("should_return_2d_level_when_supports3d_is_false", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makePublishedLevel(VALID_UUID));
    const useCase = new GetLevelUseCase(repo);

    // Act
    const result = await useCase.execute({ levelId: VALID_UUID, supports3d: false });

    // Assert
    expect(result.level.levelId).toBe(VALID_UUID);
  });

  // @s6 — DTO includes z in arrow path cells
  it("should_include_z_in_arrow_path_cells_when_level_is_3d", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(make3dPublishedLevel(VALID_UUID));
    const useCase = new GetLevelUseCase(repo);

    // Act
    const result = await useCase.execute({ levelId: VALID_UUID, supports3d: true });

    // Assert
    expect(result.level.definition.arrows[0].path[0].z).toBe(1);
  });

  // @s7 — DTO includes z in board shape cells
  it("should_include_z_in_board_shape_cells_when_shape_is_3d", async () => {
    // Arrange
    const repo = new FakeLevelRepository();
    repo.seed(makeShapedPublishedLevel3d(VALID_UUID));
    const useCase = new GetLevelUseCase(repo);

    // Act
    const result = await useCase.execute({ levelId: VALID_UUID, supports3d: true });

    // Assert
    expect(result.level.definition.boardShape!.cells.some((c) => c.z === 1)).toBe(true);
  });
});
