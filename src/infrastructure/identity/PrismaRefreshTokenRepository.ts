// Pattern: Repository, Adapter
import type { PrismaClient } from '@prisma/client';
import type { RefreshTokenRepository } from '../../application/identity/ports/RefreshTokenRepository.js';
import { RefreshToken } from '../../domain/identity/RefreshToken.js';
import { RefreshTokenId } from '../../domain/identity/value-objects/RefreshTokenId.js';
import { UserId } from '../../domain/shared/UserId.js';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';
import { getClient } from '../database/prismaContext.js';

type RefreshTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
};

function recordToRefreshToken(record: RefreshTokenRecord): RefreshToken {
  return RefreshToken.reconstitute(
    RefreshTokenId.create(record.id),
    UserId.create(record.userId),
    record.tokenHash,
    record.expiresAt,
    record.createdAt,
    record.revokedAt,
    record.replacedByTokenId ? RefreshTokenId.create(record.replacedByTokenId) : null,
  );
}

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(token: RefreshToken): Promise<void> {
    try {
      await getClient(this.prisma).refreshToken.upsert({
        where: { id: token.id.value },
        create: {
          id: token.id.value,
          userId: token.userId.value,
          tokenHash: token.tokenHash,
          expiresAt: token.expiresAt,
          createdAt: token.createdAt,
          revokedAt: token.revokedAt,
          replacedByTokenId: token.replacedByTokenId?.value ?? null,
        },
        update: {
          revokedAt: token.revokedAt,
          replacedByTokenId: token.replacedByTokenId?.value ?? null,
        },
      });
    } catch (err) {
      throw new InfrastructureError('Failed to save refresh token', { cause: String(err) });
    }
  }

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    try {
      const record = await getClient(this.prisma).refreshToken.findUnique({ where: { tokenHash } });
      return record ? recordToRefreshToken(record) : null;
    } catch (err) {
      throw new InfrastructureError('Failed to find refresh token', { cause: String(err) });
    }
  }

  async revokeAllForUser(userId: UserId, now: Date): Promise<void> {
    try {
      await getClient(this.prisma).refreshToken.updateMany({
        where: { userId: userId.value, revokedAt: null },
        data: { revokedAt: now },
      });
    } catch (err) {
      throw new InfrastructureError('Failed to revoke refresh tokens', { cause: String(err) });
    }
  }
}
