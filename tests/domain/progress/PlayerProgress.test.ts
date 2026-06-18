import { jest } from '@jest/globals';
import { PlayerProgress } from '../../../src/domain/progress/PlayerProgress.js';
import { CompletedLevel } from '../../../src/domain/progress/CompletedLevel.js';
import { LevelCompletionResult } from '../../../src/domain/progress/LevelCompletionResult.js';
import { LevelCompletedEvent } from '../../../src/domain/progress/events/LevelCompletedEvent.js';
import { LevelBestScoreUpdatedEvent } from '../../../src/domain/progress/events/LevelBestScoreUpdatedEvent.js';
import { ProgressMergePolicy } from '../../../src/domain/progress/policies/ProgressMergePolicy.js';
import { ProgressUserMismatchError } from '../../../src/domain/progress/errors/ProgressErrors.js';
import { ProgressId } from '../../../src/domain/progress/value-objects/ProgressId.js';
import { UserId } from '../../../src/domain/progress/value-objects/UserId.js';
import { LevelId } from '../../../src/domain/progress/value-objects/LevelId.js';
import { LevelScore } from '../../../src/domain/progress/value-objects/LevelScore.js';
import { CompletedAt } from '../../../src/domain/progress/value-objects/CompletedAt.js';
import { ProgressVersion } from '../../../src/domain/progress/value-objects/ProgressVersion.js';
import { CompletedLevelId } from '../../../src/domain/progress/value-objects/CompletedLevelId.js';
import { UpdatedAt } from '../../../src/domain/progress/value-objects/UpdatedAt.js';

const pid = new ProgressId('progress-1');
const uid = new UserId('user-1');
const lid1 = new LevelId('level-1');
const lid2 = new LevelId('level-2');

function makeResult(levelId: LevelId, score: number, time = 30, moves = 10): LevelCompletionResult {
  return new LevelCompletionResult(levelId, new LevelScore(score, time, moves), CompletedAt.now());
}

function makeProgressWithLevel(progressId: string, userId: string, levelId: LevelId, score: number): PlayerProgress {
  const progress = PlayerProgress.empty(new ProgressId(progressId), new UserId(userId));
  progress.recordCompletion(makeResult(levelId, score));
  progress.clearEvents();
  return progress;
}

describe('PlayerProgress.recordCompletion', () => {
  it('should_add_completed_level_when_not_previously_completed', () => {
    // Arrange
    const progress = PlayerProgress.empty(pid, uid);

    // Act
    progress.recordCompletion(makeResult(lid1, 100));

    // Assert
    expect(progress.hasCompleted(lid1)).toBe(true);
    expect(progress.completedLevels).toHaveLength(1);
  });

  it('should_fire_LevelCompletedEvent_on_first_completion', () => {
    // Arrange
    const progress = PlayerProgress.empty(pid, uid);

    // Act
    progress.recordCompletion(makeResult(lid1, 100));

    // Assert
    expect(progress.domainEvents).toHaveLength(1);
    expect(progress.domainEvents[0]).toBeInstanceOf(LevelCompletedEvent);
  });

  it('should_preserve_best_score_when_new_result_is_worse', () => {
    // Arrange
    const progress = PlayerProgress.empty(pid, uid);
    progress.recordCompletion(makeResult(lid1, 200));
    progress.clearEvents();

    // Act
    progress.recordCompletion(makeResult(lid1, 50));

    // Assert
    expect(progress.completedLevels[0].bestScore.score).toBe(200);
    expect(progress.domainEvents).toHaveLength(0);
  });

  it('should_update_best_score_when_new_result_is_better', () => {
    // Arrange
    const progress = PlayerProgress.empty(pid, uid);
    progress.recordCompletion(makeResult(lid1, 100));
    progress.clearEvents();

    // Act
    progress.recordCompletion(makeResult(lid1, 300));

    // Assert
    expect(progress.completedLevels[0].bestScore.score).toBe(300);
    expect(progress.domainEvents[0]).toBeInstanceOf(LevelBestScoreUpdatedEvent);
  });

  it('should_fire_LevelBestScoreUpdatedEvent_when_better_score_replaces_old', () => {
    // Arrange
    const progress = PlayerProgress.empty(pid, uid);
    progress.recordCompletion(makeResult(lid1, 100));
    progress.clearEvents();

    // Act
    progress.recordCompletion(makeResult(lid1, 200));

    // Assert
    expect(progress.domainEvents).toHaveLength(1);
    expect(progress.domainEvents[0]).toBeInstanceOf(LevelBestScoreUpdatedEvent);
  });

  it('should_increment_version_on_each_recordCompletion', () => {
    // Arrange
    const progress = PlayerProgress.empty(pid, uid);
    const v0 = progress.version.value;

    // Act
    progress.recordCompletion(makeResult(lid1, 100));
    progress.recordCompletion(makeResult(lid2, 200));

    // Assert
    expect(progress.version.value).toBe(v0 + 2);
  });

  it('should_keep_score_tied_on_same_score_but_worse_time', () => {
    // Arrange
    const progress = PlayerProgress.empty(pid, uid);
    progress.recordCompletion(makeResult(lid1, 100, 20));
    progress.clearEvents();

    // Act — same score, worse time
    progress.recordCompletion(makeResult(lid1, 100, 50));

    // Assert — best time should be preserved
    expect(progress.completedLevels[0].bestScore.timeSeconds).toBe(20);
  });
});

describe('ProgressMergePolicy', () => {
  const policy = new ProgressMergePolicy();

  it('should_include_all_completed_levels_from_both_progresses', () => {
    // Arrange
    const local = makeProgressWithLevel('p1', 'u1', lid1, 100);
    const remote = makeProgressWithLevel('p1', 'u1', lid2, 200);

    // Act
    const merged = policy.merge(local, remote);

    // Assert
    expect(merged.completedLevels).toHaveLength(2);
  });

  it('should_not_lose_completed_level_only_in_local', () => {
    // Arrange
    const local = makeProgressWithLevel('p1', 'u1', lid1, 100);
    const remote = makeProgressWithLevel('p1', 'u1', lid2, 200);

    // Act
    const merged = policy.merge(local, remote);

    // Assert
    expect(merged.hasCompleted(lid1)).toBe(true);
  });

  it('should_not_lose_completed_level_only_in_remote', () => {
    // Arrange
    const local = makeProgressWithLevel('p1', 'u1', lid1, 100);
    const remote = makeProgressWithLevel('p1', 'u1', lid2, 200);

    // Act
    const merged = policy.merge(local, remote);

    // Assert
    expect(merged.hasCompleted(lid2)).toBe(true);
  });

  it('should_keep_best_score_when_same_level_in_both', () => {
    // Arrange
    const local = makeProgressWithLevel('p1', 'u1', lid1, 100);
    const remote = makeProgressWithLevel('p1', 'u1', lid1, 300);

    // Act
    const merged = policy.merge(local, remote);

    // Assert
    expect(merged.completedLevels[0].bestScore.score).toBe(300);
  });

  it('should_not_rollback_to_lower_score_when_merging', () => {
    // Arrange — local has better score
    const local = makeProgressWithLevel('p1', 'u1', lid1, 500);
    const remote = makeProgressWithLevel('p1', 'u1', lid1, 100);

    // Act
    const merged = policy.merge(local, remote);

    // Assert
    expect(merged.completedLevels[0].bestScore.score).toBe(500);
  });

  it('should_increment_version_above_max_of_both', () => {
    // Arrange
    const local = PlayerProgress.create({
      id: new ProgressId('p1'), userId: new UserId('u1'),
      completedLevels: [], version: new ProgressVersion(5), updatedAt: UpdatedAt.now(),
    });
    const remote = PlayerProgress.create({
      id: new ProgressId('p1'), userId: new UserId('u1'),
      completedLevels: [], version: new ProgressVersion(3), updatedAt: UpdatedAt.now(),
    });

    // Act
    const merged = policy.merge(local, remote);

    // Assert — version should be > max(5, 3)
    expect(merged.version.value).toBe(6);
  });

  it('should_throw_when_merging_different_users', () => {
    // Arrange
    const local = PlayerProgress.empty(new ProgressId('p1'), new UserId('user-A'));
    const remote = PlayerProgress.empty(new ProgressId('p1'), new UserId('user-B'));

    // Act & Assert
    expect(() => policy.merge(local, remote)).toThrow(ProgressUserMismatchError);
  });
});
