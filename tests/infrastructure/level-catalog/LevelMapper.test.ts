import {
  recordToLevel,
  boardShapeToRecord,
  arrowsToRecord,
} from '../../../src/infrastructure/level-catalog/LevelMapper.js';
import { InfrastructureError } from '../../../src/shared/errors/InfrastructureError.js';
import type { LevelRecord } from '../../../src/infrastructure/level-catalog/LevelMapper.js';
import {
  makePublishedLevel,
  makeShapedPublishedLevel,
  make3dPublishedLevel,
  makeShapedPublishedLevel3d,
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

  it('should_reconstitute_time_limit_when_record_has_time_limit_seconds', () => {
    const record: LevelRecord = { ...validLevelRecord, timeLimitSeconds: 60 };

    const level = recordToLevel(record);

    expect(level.timeLimit?.value).toBe(60);
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

// pre-@s1 — boardShape 3D read from DB
describe('LevelMapper.recordToLevel — 3D boardShape', () => {
  it('should_reconstitute_3d_board_shape_cell_when_db_record_has_z', () => {
    // Arrange — arrow and boardShape both live at z=2 so the shape invariant holds
    const record: LevelRecord = {
      ...validLevelRecord,
      arrows: [{ id: 'a', color: '#5262FB', path: [{ row: 0, col: 0, z: 2 }], direction: 'UP' }],
      boardShape: { type: 'CELL_MASK', cells: [{ row: 0, col: 0, z: 2 }] },
    };

    // Act
    const level = recordToLevel(record);

    // Assert
    expect(level.boardShape!.cells[0].z).toBe(2);
  });
});

// @s1 — recordToLevel reads z from DB record
describe('LevelMapper.recordToLevel — 3D support', () => {
  it('should_reconstitute_3d_arrow_path_when_db_record_has_z', () => {
    // Arrange
    const record: LevelRecord = {
      ...validLevelRecord,
      arrows: [{ id: 'a', color: '#5262FB', path: [{ row: 0, col: 0, z: 1 }], direction: 'FORWARD' }],
    };

    // Act
    const level = recordToLevel(record);

    // Assert
    expect(level.definition.arrows[0].path[0].z).toBe(1);
  });

  // @s2 — backward-compat: no z in legacy 2D DB record → z=0
  it('should_default_z_to_0_when_arrow_path_cell_omits_z', () => {
    // Arrange — validLevelRecord has { row: 0, col: 0 } without z

    // Act
    const level = recordToLevel(validLevelRecord);

    // Assert
    expect(level.definition.arrows[0].path[0].z).toBe(0);
  });

  // @s3 — corrupted z value
  it('should_throw_infrastructure_error_when_arrow_path_cell_has_non_integer_z', () => {
    // Arrange
    const record: LevelRecord = {
      ...validLevelRecord,
      arrows: [{ id: 'a', color: '#5262FB', path: [{ row: 0, col: 0, z: 'bad' as unknown as number }], direction: 'UP' }],
    };

    // Act / Assert
    expect(() => recordToLevel(record)).toThrow(InfrastructureError);
  });
});

// @s4 — arrowsToRecord serializes z
describe('LevelMapper.arrowsToRecord — 3D support', () => {
  it('should_serialize_z_coordinate_when_level_has_3d_arrow_path', () => {
    // Arrange
    const level = make3dPublishedLevel();

    // Act
    const records = arrowsToRecord(level);

    // Assert
    expect(records[0].path[0].z).toBe(1);
  });
});

// @s5 — boardShapeToRecord serializes z
describe('LevelMapper.boardShapeToRecord — 3D support', () => {
  it('should_serialize_z_coordinate_when_board_shape_has_3d_cells', () => {
    // Arrange
    const level = makeShapedPublishedLevel3d();

    // Act
    const record = boardShapeToRecord(level);

    // Assert
    expect(record).not.toBeNull();
    expect(record!.cells.some((c) => c.z === 1)).toBe(true);
  });
});
