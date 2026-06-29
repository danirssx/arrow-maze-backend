import { jest } from "@jest/globals";
import type { PrismaClient } from "@prisma/client";
import { PrismaRefreshTokenRepository } from "../../../src/infrastructure/identity/PrismaRefreshTokenRepository";
import { RefreshToken } from "../../../src/domain/identity/RefreshToken";
import { RefreshTokenId } from "../../../src/domain/identity/value-objects/RefreshTokenId";
import { UserId } from "../../../src/domain/shared/UserId.js";
import { InfrastructureError } from "../../../src/shared/errors/InfrastructureError";

// Subject to human review — infrastructure adapter test

type Delegate = { upsert: jest.Mock; findUnique: jest.Mock; updateMany: jest.Mock };

function makePrisma(overrides: Partial<Delegate> = {}): { prisma: PrismaClient; refreshToken: Delegate } {
  const refreshToken: Delegate = {
    upsert: jest.fn().mockResolvedValue(undefined),
    findUnique: jest.fn().mockResolvedValue(null),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    ...overrides,
  };
  return { prisma: { refreshToken } as unknown as PrismaClient, refreshToken };
}

const TOKEN_ID = "550e8400-e29b-41d4-a716-446655440010";
const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const NOW = new Date("2024-01-15T10:00:00.000Z");
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

const makeToken = (): RefreshToken =>
  RefreshToken.issue(RefreshTokenId.create(TOKEN_ID), UserId.create(USER_ID), "hash-1", NOW, TTL_MS);

const makeRecord = () => ({
  id: TOKEN_ID,
  userId: USER_ID,
  tokenHash: "hash-1",
  expiresAt: new Date(NOW.getTime() + TTL_MS),
  createdAt: NOW,
  revokedAt: null,
  replacedByTokenId: null,
});

describe("PrismaRefreshTokenRepository", () => {
  it("should_upsert_the_token_when_saving", async () => {
    const { prisma, refreshToken } = makePrisma();
    await new PrismaRefreshTokenRepository(prisma).save(makeToken());

    expect(refreshToken.upsert).toHaveBeenCalledTimes(1);
    const arg = refreshToken.upsert.mock.calls[0][0] as { where: unknown; create: Record<string, unknown> };
    expect(arg.where).toEqual({ id: TOKEN_ID });
    expect(arg.create.userId).toBe(USER_ID);
    expect(arg.create.tokenHash).toBe("hash-1");
  });

  it("should_map_a_record_to_a_domain_token_when_found_by_hash", async () => {
    const { prisma } = makePrisma({ findUnique: jest.fn().mockResolvedValue(makeRecord()) });
    const token = await new PrismaRefreshTokenRepository(prisma).findByHash("hash-1");

    expect(token?.id.value).toBe(TOKEN_ID);
    expect(token?.userId.value).toBe(USER_ID);
    expect(token?.tokenHash).toBe("hash-1");
    expect(token?.isActive(NOW)).toBe(true);
  });

  it("should_return_null_when_no_token_matches_the_hash", async () => {
    const { prisma } = makePrisma();
    expect(await new PrismaRefreshTokenRepository(prisma).findByHash("nope")).toBeNull();
  });

  it("should_revoke_only_active_tokens_for_the_user", async () => {
    const { prisma, refreshToken } = makePrisma();
    await new PrismaRefreshTokenRepository(prisma).revokeAllForUser(UserId.create(USER_ID), NOW);

    expect(refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, revokedAt: null },
      data: { revokedAt: NOW },
    });
  });

  it("should_wrap_persistence_errors_as_infrastructure_errors", async () => {
    const { prisma } = makePrisma({ findUnique: jest.fn().mockRejectedValue(new Error("db down")) });
    await expect(new PrismaRefreshTokenRepository(prisma).findByHash("x")).rejects.toBeInstanceOf(InfrastructureError);
  });
});
