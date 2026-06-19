import { rowToLevel } from '../../../src/infrastructure/level-catalog/LevelMapper.js';
import { InfrastructureError } from '../../../src/shared/errors/InfrastructureError.js';
import type { LevelRow } from '../../../src/infrastructure/level-catalog/LevelMapper.js';

const LEVEL_ID = '550e8400-e29b-41d4-a716-446655440010';

const validLevelRow: LevelRow = {
  id: LEVEL_ID,
  name: 'Tutorial',
  description: 'Learn the basics',
  difficulty: 'EASY',
  status: 'PUBLISHED',
  version: 1,
  arrows: [{ id: 'a', color: '#5262FB', path: [{ row: 0, col: 0 }], direction: 'UP' }],
  attempts: 5,
  time_limit_seconds: null,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('LevelMapper.rowToLevel', () => {
  it('should_reconstitute_level_when_row_data_is_valid', () => {
    const level = rowToLevel(validLevelRow);

    expect(level.id.value).toBe(LEVEL_ID);
    expect(level.name.value).toBe('Tutorial');
    expect(level.definition.arrows).toHaveLength(1);
    expect(level.definition.attempts).toBe(5);
  });

  it('should_throw_infrastructure_error_when_difficulty_is_corrupted_in_db', () => {
    const corruptRow: LevelRow = { ...validLevelRow, difficulty: 'CORRUPTED' };

    expect(() => rowToLevel(corruptRow)).toThrow(InfrastructureError);
  });

  it('should_throw_infrastructure_error_when_status_is_corrupted_in_db', () => {
    const corruptRow: LevelRow = { ...validLevelRow, status: 'UNKNOWN' };

    expect(() => rowToLevel(corruptRow)).toThrow(InfrastructureError);
  });

  it('should_throw_infrastructure_error_when_arrows_are_not_an_array', () => {
    const corruptRow: LevelRow = { ...validLevelRow, arrows: {} };

    expect(() => rowToLevel(corruptRow)).toThrow(InfrastructureError);
  });

  it('should_throw_infrastructure_error_when_arrow_direction_is_corrupted_in_db', () => {
    const corruptRow: LevelRow = {
      ...validLevelRow,
      arrows: [{ id: 'a', color: '#5262FB', path: [{ row: 0, col: 0 }], direction: 'DIAGONAL' }],
    };

    expect(() => rowToLevel(corruptRow)).toThrow(InfrastructureError);
  });
});
