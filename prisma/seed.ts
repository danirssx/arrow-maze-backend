/**
 * Database seed, executed by `prisma db seed` (configured in prisma.config.ts).
 *
 * Everything is written through Prisma Client so the seed honours the same
 * mappings and types as the application. The published catalog is sourced from the
 * JSON files in `seed-data/level-json/` (loaded + domain-validated by
 * `authoredLevels.ts` — drop a JSON, run `db:seed`, it appears); the demo
 * users/progress/leaderboards reproduce the former `002_seed_demo_data.sql`.
 *
 * The seed is idempotent: every write is an upsert keyed by id (or by the
 * relevant unique constraint), so re-running it is safe.
 */
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { createPrismaClient } from "../src/infrastructure/database/PrismaClientProvider.js";
import { loadAuthoredLevels } from "./seed-data/authoredLevels.js";
import { DEMO_USER_CREDENTIALS, DEMO_PASSWORD_BCRYPT_COST } from "./seed-data/demoCredentials.js";
import { DEMO_PROGRESS, DEMO_LEADERBOARDS } from "./seed-data/demoProgress.js";

/**
 * Base epoch for order-derived `createdAt`. `GET /levels` orders by `createdAt asc`,
 * so deriving it from the authored `order` lists the catalog in author order without
 * a schema change. The level number shown in the UI is the position in that list.
 */
const ORDER_EPOCH_MS = Date.UTC(2026, 0, 1, 0, 0, 0);

function resolveSsl(): boolean {
  if (process.env.DATABASE_SSL !== undefined) {
    return process.env.DATABASE_SSL === "true";
  }
  return process.env.NODE_ENV === "production";
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Missing required env var: DATABASE_URL");

  const prisma = createPrismaClient(databaseUrl, { ssl: resolveSsl() });
  const now = new Date();

  try {
    // The published catalog is sourced ENTIRELY from prisma/seed-data/level-json/.
    // The loader validates every file through the domain (ArrowSpec, board-shape mask
    // + containment, solvability) and enforces unique id/order before we publish.
    const catalogLevels = loadAuthoredLevels();
    for (const level of catalogLevels) {
      const arrows = level.arrows as unknown as Prisma.InputJsonValue;
      const boardShape: Prisma.InputJsonValue | typeof Prisma.DbNull =
        level.boardShape == null
          ? Prisma.DbNull
          : (level.boardShape as unknown as Prisma.InputJsonValue);
      const createdAt = new Date(ORDER_EPOCH_MS + level.order * 1000);
      const data = {
        name: level.name,
        description: level.description,
        difficulty: level.difficulty,
        status: level.status,
        version: level.version,
        arrows,
        attempts: level.attempts,
        timeLimitSeconds: level.timeLimitSeconds,
        boardShape,
        createdAt,
        updatedAt: now,
      };
      await prisma.level.upsert({
        where: { id: level.id },
        create: { id: level.id, ...data },
        update: data,
      });
    }
    process.stdout.write(`Seeded ${catalogLevels.length} catalog levels from level-json\n`);

    for (const user of DEMO_USER_CREDENTIALS) {
      const data = {
        email: user.email,
        username: user.username,
        passwordHash: await bcrypt.hash(user.password, DEMO_PASSWORD_BCRYPT_COST),
        role: "USER",
        status: "ACTIVE",
        updatedAt: now,
      };
      await prisma.user.upsert({
        where: { id: user.id },
        create: { id: user.id, createdAt: daysAgo(user.createdDaysAgo), ...data },
        update: data,
      });
    }

    await prisma.playerProgress.upsert({
      where: { id: DEMO_PROGRESS.id },
      create: { id: DEMO_PROGRESS.id, userId: DEMO_PROGRESS.userId, version: DEMO_PROGRESS.version, updatedAt: now },
      update: { version: DEMO_PROGRESS.version, updatedAt: now },
    });

    for (const level of DEMO_PROGRESS.completedLevels) {
      const data = {
        bestScore: level.bestScore,
        bestTimeSeconds: level.bestTimeSeconds,
        bestMovesCount: level.bestMovesCount,
        completedAt: daysAgo(level.completedDaysAgo),
        updatedAt: now,
      };
      await prisma.completedLevel.upsert({
        where: { progressId_levelId: { progressId: DEMO_PROGRESS.id, levelId: level.levelId } },
        create: { id: level.id, progressId: DEMO_PROGRESS.id, levelId: level.levelId, ...data },
        update: data,
      });
    }

    for (const board of DEMO_LEADERBOARDS) {
      await prisma.leaderboard.upsert({
        where: { id: board.id },
        create: { id: board.id, levelId: board.levelId, maxEntries: 10, updatedAt: now },
        update: { maxEntries: 10, updatedAt: now },
      });
      for (const entry of board.entries) {
        const data = {
          usernameSnapshot: entry.usernameSnapshot,
          score: entry.score,
          timeSeconds: entry.timeSeconds,
          movesCount: entry.movesCount,
          rank: entry.rank,
          submittedAt: daysAgo(entry.submittedDaysAgo),
        };
        await prisma.leaderboardEntry.upsert({
          where: { leaderboardId_userId: { leaderboardId: board.id, userId: entry.userId } },
          create: { id: entry.id, leaderboardId: board.id, userId: entry.userId, levelId: board.levelId, ...data },
          update: data,
        });
      }
    }
    process.stdout.write(`Seeded ${DEMO_USER_CREDENTIALS.length} demo users, progress and ${DEMO_LEADERBOARDS.length} leaderboards\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Seed failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
