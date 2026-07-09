import {
  recordToLevel,
  boardShapeToRecord,
} from '../../../src/infrastructure/level-catalog/LevelMapper.js';
import { InfrastructureError } from '../../../src/shared/errors/InfrastructureError.js';
import type { LevelRecord } from '../../../src/infrastructure/level-catalog/LevelMapper.js';
import {
  makePublishedLevel,
  makeShapedPublishedLevel,
} from '../../application/level-catalog/helpers/levelFixtures.js';

const LEVEL_ID = '550e8400-e29b-41d4-a716-446655440010';

const validLevelRecord: LevelRecord = {
  id: LEVEL_ID,
  name: 'Tutorial',
  description: 'Learn the basics',
  difficulty: 'EASY',
  status: 'PUBLISHED',
  version: 1,
  arrows: [{ id: 'a', color: '#5262FB', path: [{ row: 0, col: 0 }], direction: 'UP' }],
  attempts: 5,
  timeLimitSeconds: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('LevelMapper.recordToLevel', () => {
  it('should_reconstitute_level_when_record_data_is_valid', () => {
    const level = recordToLevel(validLevelRecord);

    expect(level.id.value).toBe(LEVEL_ID);
    expect(level.name.value).toBe('Tutorial');
    expect(level.definition.arrows).toHaveLength(1);
    expect(level.definition.attempts).toBe(5);
  });

  it('should_throw_infrastructure_error_when_difficulty_is_corrupted_in_db', () => {
    const corruptRecord: LevelRecord = { ...validLevelRecord, difficulty: 'CORRUPTED' };

    expect(() => recordToLevel(corruptRecord)).toThrow(InfrastructureError);
  });

  it('should_throw_infrastructure_error_when_status_is_corrupted_in_db', () => {
    const corruptRecord: LevelRecord = { ...validLevelRecord, status: 'UNKNOWN' };

    expect(() => recordToLevel(corruptRecord)).toThrow(InfrastructureError);
  });

  it('should_throw_infrastructure_error_when_arrows_are_not_an_array', () => {
    const corruptRecord: LevelRecord = { ...validLevelRecord, arrows: {} };

    expect(() => recordToLevel(corruptRecord)).toThrow(InfrastructureError);
  });

  it('should_throw_infrastructure_error_when_arrow_direction_is_corrupted_in_db', () => {
    const corruptRecord: LevelRecord = {
      ...validLevelRecord,
      arrows: [{ id: 'a', color: '#5262FB', path: [{ row: 0, col: 0 }], direction: 'DIAGONAL' }],
    };

    expect(() => recordToLevel(corruptRecord)).toThrow(InfrastructureError);
  });

  it('should_reconstitute_board_shape_when_record_has_one', () => {
    const record: LevelRecord = {
      ...validLevelRecord,
      boardShape: {
        type: 'CELL_MASK',
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
      },
    };

    const level = recordToLevel(record);

    expect(level.boardShape).toBeDefined();
    expect(level.boardShape!.size).toBe(2);
  });

  it('should_reconstitute_without_board_shape_when_record_has_none', () => {
    expect(recordToLevel(validLevelRecord).boardShape).toBeUndefined();
  });

  it('should_throw_infrastructure_error_when_board_shape_is_corrupted_in_db', () => {
    const corruptRecord: LevelRecord = {
      ...validLevelRecord,
      boardShape: { type: 'CELL_MASK', cells: 'not-an-array' },
    };

    expect(() => recordToLevel(corruptRecord)).toThrow(InfrastructureError);
  });
});

describe('LevelMapper.boardShapeToRecord', () => {
  it('should_serialize_board_shape_when_level_has_one', () => {
    const record = boardShapeToRecord(makeShapedPublishedLevel());

    expect(record).not.toBeNull();
    expect(record!.type).toBe('CELL_MASK');
    expect(record!.cells).toHaveLength(4);
  });

  it('should_return_null_when_level_has_no_board_shape', () => {
    expect(boardShapeToRecord(makePublishedLevel())).toBeNull();
  });
});
