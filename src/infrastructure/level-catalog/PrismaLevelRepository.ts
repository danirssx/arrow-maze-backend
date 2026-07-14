// Pattern: Repository, Adapter
import { Prisma, type PrismaClient } from '@prisma/client';
import type { LevelRepository } from '../../application/level-catalog/ports/LevelRepository.js';
import type { Level } from '../../domain/level-catalog/Level.js';
import type { LevelId } from '../../domain/shared/LevelId.js';
import { LevelStatus } from '../../domain/level-catalog/enums/LevelStatus.js';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';
import { getClient } from '../database/prismaContext.js';
import { arrowsToRecord, boardShapeToRecord, recordToLevel } from './LevelMapper.js';

export class PrismaLevelRepository implements LevelRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: LevelId): Promise<Level | null> {
    try {
      const record = await getClient(this.prisma).level.findUnique({ where: { id: id.value } });
      return record ? recordToLevel(record) : null;
    } catch (err) {
      throw new InfrastructureError('Failed to find level by id', { cause: String(err) });
    }
  }

  async findAllPublished(): Promise<Level[]> {
    try {
      const records = await getClient(this.prisma).level.findMany({
        where: { status: LevelStatus.PUBLISHED },
        orderBy: { createdAt: 'asc' },
      });
      return records.map((record) => recordToLevel(record));
    } catch (err) {
      throw new InfrastructureError('Failed to find published levels', { cause: String(err) });
    }
  }

  async findAll(status?: LevelStatus): Promise<Level[]> {
    try {
      const records = await getClient(this.prisma).level.findMany({
        where: status === undefined ? {} : { status },
        orderBy: { createdAt: 'asc' },
      });
      return records.map((record) => recordToLevel(record));
    } catch (err) {
      throw new InfrastructureError('Failed to find levels', { cause: String(err) });
    }
  }

  async save(level: Level): Promise<void> {
    try {
      const arrows = arrowsToRecord(level) as unknown as Prisma.InputJsonValue;
      const shapeRecord = boardShapeToRecord(level);
      const boardShape: Prisma.InputJsonValue | typeof Prisma.DbNull =
        shapeRecord === null
          ? Prisma.DbNull
          : (shapeRecord as unknown as Prisma.InputJsonValue);
      await getClient(this.prisma).level.upsert({
        where: { id: level.id.value },
        create: {
          id: level.id.value,
          name: level.name.value,
          description: level.description.value,
          difficulty: level.difficulty,
          status: level.status,
          version: level.version.value,
          arrows,
          attempts: level.definition.attempts,
          timeLimitSeconds: level.timeLimit?.value ?? null,
          dimensions: level.definition.dimensions,
          boardShape,
          createdAt: level.createdAt,
          updatedAt: level.updatedAt,
        },
        update: {
          name: level.name.value,
          description: level.description.value,
          difficulty: level.difficulty,
          status: level.status,
          version: level.version.value,
          arrows,
          attempts: level.definition.attempts,
          timeLimitSeconds: level.timeLimit?.value ?? null,
          dimensions: level.definition.dimensions,
          boardShape,
          updatedAt: level.updatedAt,
        },
      });
    } catch (err) {
      if (err instanceof InfrastructureError) throw err;
      throw new InfrastructureError('Failed to save level', { cause: String(err) });
    }
  }
}
