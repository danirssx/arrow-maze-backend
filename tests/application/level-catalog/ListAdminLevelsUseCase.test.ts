import { ListAdminLevelsUseCase } from "../../../src/application/level-catalog/use-cases/ListAdminLevelsUseCase.js";
import { LevelStatus } from "../../../src/domain/level-catalog/enums/LevelStatus.js";
import {
  FakeLevelRepository,
  makeArchivedLevel,
  makeDraftLevel,
  makePublishedLevel,
  makeTimedDraftLevel,
} from "./helpers/levelFixtures.js";

// Subject to human review — application use-case test

const DRAFT_ID = "550e8400-e29b-41d4-a716-446655440001";
const PUB_ID = "550e8400-e29b-41d4-a716-446655440002";
const ARC_ID = "550e8400-e29b-41d4-a716-446655440003";

function seededRepo(): FakeLevelRepository {
  const repo = new FakeLevelRepository();
  repo.seed(makeDraftLevel(DRAFT_ID), makePublishedLevel(PUB_ID), makeArchivedLevel(ARC_ID));
  return repo;
}

describe("ListAdminLevelsUseCase", () => {
  it("should_return_all_levels_with_their_status_when_no_filter", async () => {
    const result = await new ListAdminLevelsUseCase(seededRepo()).execute({});

    const statusById = new Map(result.levels.map((l) => [l.levelId, l.status]));
    expect(result.levels).toHaveLength(3);
    expect(statusById.get(DRAFT_ID)).toBe("DRAFT");
    expect(statusById.get(PUB_ID)).toBe("PUBLISHED");
    expect(statusById.get(ARC_ID)).toBe("ARCHIVED");
  });

  it("should_expose_summary_fields_for_each_level", async () => {
    const result = await new ListAdminLevelsUseCase(seededRepo()).execute({});

    const item = result.levels.find((l) => l.levelId === DRAFT_ID)!;
    expect(item).toMatchObject({
      name: "Test Level",
      difficulty: "EASY",
      status: "DRAFT",
      arrowCount: 1,
    });
    expect(typeof item.attempts).toBe("number");
    expect(item.createdAt).toBeInstanceOf(Date);
  });

  it("should_expose_time_limit_seconds_for_timed_levels_and_omit_it_otherwise", async () => {
    const repo = new FakeLevelRepository();
    repo.seed(makeTimedDraftLevel(DRAFT_ID, 90), makePublishedLevel(PUB_ID));

    const result = await new ListAdminLevelsUseCase(repo).execute({});

    const timed = result.levels.find((l) => l.levelId === DRAFT_ID)!;
    const untimed = result.levels.find((l) => l.levelId === PUB_ID)!;
    expect(timed.timeLimitSeconds).toBe(90);
    expect(untimed.timeLimitSeconds).toBeUndefined();
  });

  it("should_filter_by_status_when_a_status_is_given", async () => {
    const result = await new ListAdminLevelsUseCase(seededRepo()).execute({
      status: LevelStatus.DRAFT,
    });

    expect(result.levels.map((l) => l.levelId)).toEqual([DRAFT_ID]);
  });
});
