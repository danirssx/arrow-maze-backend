import { jest } from '@jest/globals';
import { PlayerProgress } from '../../../src/domain/progress/PlayerProgress.js';
import { CompletedLevel } from '../../../src/domain/progress/CompletedLevel.js';
import { LevelCompletionResult } from '../../../src/domain/progress/LevelCompletionResult.js';
import { LevelCompletedEvent } from '../../../src/domain/progress/events/LevelCompletedEvent.js';
import { LevelBestScoreUpdatedEvent } from '../../../src/domain/progress/events/LevelBestScoreUpdatedEvent.js';
import { ProgressMergePolicy } from '../../../src/domain/progress/policies/ProgressMergePolicy.js';
import { ProgressUserMismatchError } from '../../../src/domain/progress/errors/ProgressErrors.js';
import { ProgressId } from '../../../src/domain/progress/value-objects/ProgressId.js';
import { LevelScore } from '../../../src/domain/progress/value-objects/LevelScore.js';
import { CompletedAt } from '../../../src/domain/progress/value-objects/CompletedAt.js';
import { ProgressVersion } from '../../../src/domain/progress/value-objects/ProgressVersion.js';
import { CompletedLevelId } from '../../../src/domain/progress/value-objects/CompletedLevelId.js';
import { UpdatedAt } from '../../../src/domain/progress/value-objects/UpdatedAt.js';
import { UserId } from '../../../src/domain/shared/UserId.js';
import { LevelId } from '../../../src/domain/shared/LevelId.js';
import { InvalidArgumentError } from '../../../src/domain/errors/DomainError.js';

const USER_1 = '550e8400-e29b-41d4-a716-446655440001';
const USER_A = '550e8400-e29b-41d4-a716-446655440002';
const USER_B = '550e8400-e29b-41d4-a716-446655440003';
const USER_U1 = '550e8400-e29b-41d4-a716-446655440004';
const LEVEL_1 = '550e8400-e29b-41d4-a716-446655440010';
const LEVEL_2 = '550e8400-e29b-41d4-a716-446655440011';

const pid = ProgressId.create('550e8400-e29b-41d4-a716-446655440020');
const uid = UserId.create(USER_1);
const lid1 = LevelId.create(LEVEL_1);
const lid2 = LevelId.create(LEVEL_2);

function makeResult(levelId: LevelId, score: number, time = 30, moves = 10): LevelCompletionResult {
  return new LevelCompletionResult(levelId, new LevelScore(score, time, moves), CompletedAt.now());
}

function makeProgressWithLevel(progressId: string, levelId: LevelId, score: number): PlayerProgress {
  const progress = PlayerProgress.empty(ProgressId.create('550e8400-e29b-41d4-a716-446655440020'), UserId.create(USER_U1));
  progress.recordCompletion(makeResult(levelId, score));
  progress.clearEvents();
  return progress;
}

describe('PlayerProgress.recordCompletion', () => {
  it('should_add_completed_level_when_not_previously_completed', () => {
    const progress = PlayerProgress.empty(pid, uid);

    progress.recordCompletion(makeResult(lid1, 100));

    expect(progress.hasCompleted(lid1)).toBe(true);
    expect(progress.completedLevels).toHaveLength(1);
  });

  it('should_fire_LevelCompletedEvent_on_first_completion', () => {
    const progress = PlayerProgress.empty(pid, uid);

    progress.recordCompletion(makeResult(lid1, 100));

    expect(progress.domainEvents).toHaveLength(1);
    expect(progress.domainEvents[0]).toBeInstanceOf(LevelCompletedEvent);
  });

  it('should_preserve_best_score_when_new_result_is_worse', () => {
    const progress = PlayerProgress.empty(pid, uid);
    progress.recordCompletion(makeResult(lid1, 200));
    progress.clearEvents();

    progress.recordCompletion(makeResult(lid1, 50));

    expect(progress.completedLevels[0].bestScore.score).toBe(200);
    expect(progress.domainEvents).toHaveLength(0);
  });

  it('should_update_best_score_when_new_result_is_better', () => {
    const progress = PlayerProgress.empty(pid, uid);
    progress.recordCompletion(makeResult(lid1, 100));
    progress.clearEvents();

    progress.recordCompletion(makeResult(lid1, 300));

    expect(progress.completedLevels[0].bestScore.score).toBe(300);
    expect(progress.domainEvents[0]).toBeInstanceOf(LevelBestScoreUpdatedEvent);
  });

  it('should_fire_LevelBestScoreUpdatedEvent_when_better_score_replaces_old', () => {
    const progress = PlayerProgress.empty(pid, uid);
    progress.recordCompletion(makeResult(lid1, 100));
    progress.clearEvents();

    progress.recordCompletion(makeResult(lid1, 200));

    expect(progress.domainEvents).toHaveLength(1);
    expect(progress.domainEvents[0]).toBeInstanceOf(LevelBestScoreUpdatedEvent);
  });

  it('should_increment_version_on_each_recordCompletion', () => {
    const progress = PlayerProgress.empty(pid, uid);
    const v0 = progress.version.value;

    progress.recordCompletion(makeResult(lid1, 100));
    progress.recordCompletion(makeResult(lid2, 200));

    expect(progress.version.value).toBe(v0 + 2);
  });

  it('should_keep_score_tied_on_same_score_but_worse_time', () => {
    const progress = PlayerProgress.empty(pid, uid);
    progress.recordCompletion(makeResult(lid1, 100, 20));
    progress.clearEvents();

    progress.recordCompletion(makeResult(lid1, 100, 50));

    expect(progress.completedLevels[0].bestScore.timeSeconds).toBe(20);
  });
});

describe('ProgressMergePolicy', () => {
  const policy = new ProgressMergePolicy();

  it('should_include_all_completed_levels_from_both_progresses', () => {
    const local = makeProgressWithLevel('p1', lid1, 100);
    const remote = makeProgressWithLevel('p1', lid2, 200);

    const merged = policy.merge(local, remote);

    expect(merged.completedLevels).toHaveLength(2);
  });

  it('should_not_lose_completed_level_only_in_local', () => {
    const local = makeProgressWithLevel('p1', lid1, 100);
    const remote = makeProgressWithLevel('p1', lid2, 200);

    const merged = policy.merge(local, remote);

    expect(merged.hasCompleted(lid1)).toBe(true);
  });

  it('should_not_lose_completed_level_only_in_remote', () => {
    const local = makeProgressWithLevel('p1', lid1, 100);
    const remote = makeProgressWithLevel('p1', lid2, 200);

    const merged = policy.merge(local, remote);

    expect(merged.hasCompleted(lid2)).toBe(true);
  });

  it('should_keep_best_score_when_same_level_in_both', () => {
    const local = makeProgressWithLevel('p1', lid1, 100);
    const remote = makeProgressWithLevel('p1', lid1, 300);

    const merged = policy.merge(local, remote);

    expect(merged.completedLevels[0].bestScore.score).toBe(300);
  });

  it('should_not_rollback_to_lower_score_when_merging', () => {
    const local = makeProgressWithLevel('p1', lid1, 500);
    const remote = makeProgressWithLevel('p1', lid1, 100);

    const merged = policy.merge(local, remote);

    expect(merged.completedLevels[0].bestScore.score).toBe(500);
  });

  it('should_increment_version_above_max_of_both', () => {
    const local = PlayerProgress.create({
      id: ProgressId.create('550e8400-e29b-41d4-a716-446655440020'), userId: UserId.create(USER_U1),
      completedLevels: [], version: new ProgressVersion(5), updatedAt: UpdatedAt.now(),
    });
    const remote = PlayerProgress.create({
      id: ProgressId.create('550e8400-e29b-41d4-a716-446655440020'), userId: UserId.create(USER_U1),
      completedLevels: [], version: new ProgressVersion(3), updatedAt: UpdatedAt.now(),
    });

    const merged = policy.merge(local, remote);

    expect(merged.version.value).toBe(6);
  });

  it('should_throw_when_merging_different_users', () => {
    const local = PlayerProgress.empty(ProgressId.create('550e8400-e29b-41d4-a716-446655440020'), UserId.create(USER_A));
    const remote = PlayerProgress.empty(ProgressId.create('550e8400-e29b-41d4-a716-446655440020'), UserId.create(USER_B));

    expect(() => policy.merge(local, remote)).toThrow(ProgressUserMismatchError);
  });
});

describe('Progress value objects', () => {
  it('should_throw_invalid_argument_error_when_level_score_has_negative_score', () => {
    expect(() => new LevelScore(-1, 10, 5)).toThrow(InvalidArgumentError);
  });

  it('should_throw_invalid_argument_error_when_level_score_has_zero_time', () => {
    expect(() => new LevelScore(100, 0, 5)).toThrow(InvalidArgumentError);
  });

  it('should_throw_invalid_argument_error_when_level_score_has_zero_moves', () => {
    expect(() => new LevelScore(100, 10, 0)).toThrow(InvalidArgumentError);
  });

  it('should_throw_invalid_argument_error_when_progress_version_is_negative', () => {
    expect(() => new ProgressVersion(-1)).toThrow(InvalidArgumentError);
  });

  it('should_not_expose_http_status_on_progress_vo_error', () => {
    try {
      new ProgressVersion(-1);
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidArgumentError);
      expect('httpStatus' in (e as object)).toBe(false);
    }
  });
});
