// Pattern: Mapper
import { Level } from '../../domain/level-catalog/Level.js';
import { BoardSize } from '../../domain/level-catalog/value-objects/BoardSize.js';
import { CellSpec } from '../../domain/level-catalog/value-objects/CellSpec.js';
import { LevelDefinition } from '../../domain/level-catalog/value-objects/LevelDefinition.js';
import { LevelDescription } from '../../domain/level-catalog/value-objects/LevelDescription.js';
import { LevelName } from '../../domain/level-catalog/value-objects/LevelName.js';
import { LevelVersion } from '../../domain/level-catalog/value-objects/LevelVersion.js';
import { MoveCount } from '../../domain/level-catalog/value-objects/MoveCount.js';
import { Position } from '../../domain/level-catalog/value-objects/Position.js';
import { TimeLimit } from '../../domain/level-catalog/value-objects/TimeLimit.js';
import { Difficulty } from '../../domain/level-catalog/enums/Difficulty.js';
import { LevelStatus } from '../../domain/level-catalog/enums/LevelStatus.js';
import { CellType } from '../../domain/level-catalog/enums/CellType.js';
import { Direction } from '../../domain/level-catalog/enums/Direction.js';
import { LevelId } from '../../domain/shared/LevelId.js';
import { parseEnumFromDb } from '../../shared/parseEnum.js';

export type LevelRow = {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  status: string;
  version: number;
  board_rows: number;
  board_cols: number;
  time_limit_seconds: number | null;
  move_count: number | null;
  created_at: Date;
  updated_at: Date;
};

export type CellRow = {
  row: number;
  col: number;
  type: string;
  direction: string | null;
};

export function rowToLevel(levelRow: LevelRow, cellRows: CellRow[]): Level {
  const boardSize = BoardSize.create(levelRow.board_rows, levelRow.board_cols);

  const cells = cellRows.map((c) => {
    const cellType = parseEnumFromDb(CellType, c.type, 'cell type');
    const direction = c.direction !== null
      ? parseEnumFromDb(Direction, c.direction, 'direction')
      : undefined;
    return CellSpec.create(Position.create(c.row, c.col), cellType, direction);
  });

  return Level.reconstitute(
    LevelId.create(levelRow.id),
    LevelName.create(levelRow.name),
    LevelDescription.create(levelRow.description),
    LevelDefinition.create(boardSize, cells),
    parseEnumFromDb(Difficulty, levelRow.difficulty, 'difficulty'),
    parseEnumFromDb(LevelStatus, levelRow.status, 'status'),
    LevelVersion.create(levelRow.version),
    levelRow.time_limit_seconds !== null
      ? TimeLimit.create(levelRow.time_limit_seconds)
      : undefined,
    levelRow.move_count !== null
      ? MoveCount.create(levelRow.move_count)
      : undefined,
    levelRow.created_at,
    levelRow.updated_at,
  );
}
