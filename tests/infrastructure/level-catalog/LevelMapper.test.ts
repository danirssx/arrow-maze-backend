import { rowToLevel } from '../../../src/infrastructure/level-catalog/LevelMapper.js';
import { InfrastructureError } from '../../../src/shared/errors/InfrastructureError.js';
import type { LevelRow, CellRow } from '../../../src/infrastructure/level-catalog/LevelMapper.js';

const LEVEL_ID = '550e8400-e29b-41d4-a716-446655440010';

const validLevelRow: LevelRow = {
  id: LEVEL_ID,
  name: 'Tutorial',
  description: 'Learn the basics',
  difficulty: 'EASY',
  status: 'PUBLISHED',
  version: 1,
  board_rows: 3,
  board_cols: 3,
  time_limit_seconds: null,
  move_count: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const validCellRows: CellRow[] = [
  { row: 0, col: 0, type: 'START', direction: 'RIGHT' },
  { row: 0, col: 1, type: 'ARROW', direction: 'DOWN' },
  { row: 1, col: 1, type: 'EXIT', direction: null },
];

describe('LevelMapper.rowToLevel', () => {
  it('should_reconstitute_level_when_row_data_is_valid', () => {
    // Arrange / Act
    const level = rowToLevel(validLevelRow, validCellRows);

    // Assert
    expect(level.id.value).toBe(LEVEL_ID);
    expect(level.name.value).toBe('Tutorial');
  });

  it('should_throw_infrastructure_error_when_difficulty_is_corrupted_in_db', () => {
    // Arrange
    const corruptRow: LevelRow = { ...validLevelRow, difficulty: 'CORRUPTED' };

    // Act / Assert
    expect(() => rowToLevel(corruptRow, validCellRows)).toThrow(InfrastructureError);
  });

  it('should_throw_infrastructure_error_when_status_is_corrupted_in_db', () => {
    // Arrange
    const corruptRow: LevelRow = { ...validLevelRow, status: 'UNKNOWN' };

    // Act / Assert
    expect(() => rowToLevel(corruptRow, validCellRows)).toThrow(InfrastructureError);
  });

  it('should_throw_infrastructure_error_when_cell_type_is_corrupted_in_db', () => {
    // Arrange
    const corruptCells: CellRow[] = [
      { row: 0, col: 0, type: 'CORRUPTED_TYPE', direction: 'RIGHT' },
      { row: 1, col: 1, type: 'EXIT', direction: null },
    ];

    // Act / Assert
    expect(() => rowToLevel(validLevelRow, corruptCells)).toThrow(InfrastructureError);
  });

  it('should_throw_infrastructure_error_when_cell_direction_is_corrupted_in_db', () => {
    // Arrange
    const corruptCells: CellRow[] = [
      { row: 0, col: 0, type: 'START', direction: 'DIAGONAL' },
      { row: 1, col: 1, type: 'EXIT', direction: null },
    ];

    // Act / Assert
    expect(() => rowToLevel(validLevelRow, corruptCells)).toThrow(InfrastructureError);
  });
});
