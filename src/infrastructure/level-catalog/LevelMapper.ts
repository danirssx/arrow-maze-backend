// Pattern: Mapper
import { Level } from '../../domain/level-catalog/Level.js';
import { ArrowSpec } from '../../domain/level-catalog/value-objects/ArrowSpec.js';
import { LevelDefinition } from '../../domain/level-catalog/value-objects/LevelDefinition.js';
import { LevelDescription } from '../../domain/level-catalog/value-objects/LevelDescription.js';
import { LevelName } from '../../domain/level-catalog/value-objects/LevelName.js';
import { LevelVersion } from '../../domain/level-catalog/value-objects/LevelVersion.js';
import { Position } from '../../domain/level-catalog/value-objects/Position.js';
import { TimeLimit } from '../../domain/level-catalog/value-objects/TimeLimit.js';
import { Difficulty } from '../../domain/level-catalog/enums/Difficulty.js';
import { LevelStatus } from '../../domain/level-catalog/enums/LevelStatus.js';
import { Direction } from '../../domain/level-catalog/enums/Direction.js';
import { LevelId } from '../../domain/shared/LevelId.js';
import { parseEnumFromDb } from '../../shared/parseEnum.js';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';

/**
 * Shape of a `levels` row as returned by Prisma (camelCase fields mapped from
 * the snake_case columns). `arrows` is the JSONB payload, typed `unknown` so the
 * mapper validates it before trusting it.
 */
export type LevelRecord = {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  status: string;
  version: number;
  arrows: unknown;
  attempts: number | null;
  timeLimitSeconds: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type ArrowRecord = {
  id: string;
  color: string;
  path: { row: number; col: number }[];
  direction: string;
};

export function recordToLevel(record: LevelRecord): Level {
  const arrows = parseArrowRecords(record.arrows).map((arrow) =>
    ArrowSpec.create(
      arrow.id,
      arrow.color,
      arrow.path.map((position) => Position.create(position.row, position.col)),
      parseEnumFromDb(Direction, arrow.direction, 'direction'),
    ),
  );
  return Level.reconstitute(
    LevelId.create(record.id),
    LevelName.create(record.name),
    LevelDescription.create(record.description),
    LevelDefinition.create(arrows, record.attempts ?? undefined),
    parseEnumFromDb(Difficulty, record.difficulty, 'difficulty'),
    parseEnumFromDb(LevelStatus, record.status, 'status'),
    LevelVersion.create(record.version),
    record.timeLimitSeconds !== null ? TimeLimit.create(record.timeLimitSeconds) : undefined,
    record.createdAt,
    record.updatedAt,
  );
}

export function arrowsToRecord(level: Level): ArrowRecord[] {
  return level.definition.arrows.map((arrow) => ({
    id: arrow.id,
    color: arrow.color,
    path: arrow.path.map((position) => ({ row: position.row, col: position.col })),
    direction: arrow.direction,
  }));
}

function parseArrowRecords(value: unknown): ArrowRecord[] {
  if (!Array.isArray(value)) {
    throw new InfrastructureError('Corrupted DB value for arrows: expected array');
  }
  return value.map((record) => {
    if (!isArrowRecord(record)) {
      throw new InfrastructureError('Corrupted DB value for arrows: invalid ArrowSpec record');
    }
    return record;
  });
}

function isArrowRecord(value: unknown): value is ArrowRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record['id'] === 'string' &&
    typeof record['color'] === 'string' &&
    typeof record['direction'] === 'string' &&
    Array.isArray(record['path']) &&
    record['path'].every(
      (pos) =>
        typeof pos === 'object' &&
        pos !== null &&
        Number.isInteger((pos as Record<string, unknown>)['row']) &&
        Number.isInteger((pos as Record<string, unknown>)['col']),
    )
  );
}
