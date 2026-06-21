/**
 * Database seed, executed by `prisma db seed` (configured in prisma.config.ts).
 *
 * Everything is written through Prisma Client so the seed honours the same
 * mappings and types as the application. Published levels come from the
 * generated `seed-data/levels.ts` module (`npm run seed:generate`); the demo
 * users/progress/leaderboards reproduce the former `002_seed_demo_data.sql`.
 *
 * The seed is idempotent: every write is an upsert keyed by id (or by the
 * relevant unique constraint), so re-running it is safe.
 */
import { Prisma } from "@prisma/client";
import { createPrismaClient } from "../src/infrastructure/database/PrismaClientProvider.js";
import { SEED_LEVELS } from "./seed-data/levels.js";
import { loadAuthoredLevels } from "./seed-data/authoredLevels.js";

function resolveSsl(): boolean {
  if (process.env.DATABASE_SSL !== undefined) {
    return process.env.DATABASE_SSL === "true";
  }
  return process.env.NODE_ENV === "production";
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

const DEMO_PASSWORD_HASH = "$2b$10$aa37iFFglWjt6nlwkyNV3OCnnZCXGnN2o81ujv6Yf3ZSzJKYhlnPq";

const DEMO_USERS = [
  { id: "660e8400-e29b-41d4-a716-446655440001", email: "demo@arrowmaze.test", username: "demo_player", createdDaysAgo: 6 },
  { id: "660e8400-e29b-41d4-a716-446655440002", email: "mika@arrowmaze.test", username: "mika_arrows", createdDaysAgo: 5 },
  { id: "660e8400-e29b-41d4-a716-446655440003", email: "noah@arrowmaze.test", username: "noah_escape", createdDaysAgo: 4 },
];

const DEMO_PROGRESS = {
  id: "770e8400-e29b-41d4-a716-446655440001",
  userId: "660e8400-e29b-41d4-a716-446655440001",
  version: 3,
  completedLevels: [
    { id: "880e8400-e29b-41d4-a716-446655440001", levelId: "550e8400-e29b-41d4-a716-446655440010", bestScore: 980, bestTimeSeconds: 18, bestMovesCount: 4, completedDaysAgo: 3 },
    { id: "880e8400-e29b-41d4-a716-446655440002", levelId: "550e8400-e29b-41d4-a716-446655440011", bestScore: 920, bestTimeSeconds: 35, bestMovesCount: 7, completedDaysAgo: 2 },
    { id: "880e8400-e29b-41d4-a716-446655440003", levelId: "550e8400-e29b-41d4-a716-446655440012", bestScore: 860, bestTimeSeconds: 62, bestMovesCount: 10, completedDaysAgo: 1 },
  ],
};

const DEMO_LEADERBOARDS = [
  {
    id: "990e8400-e29b-41d4-a716-446655440010",
    levelId: "550e8400-e29b-41d4-a716-446655440010",
    entries: [
      { id: "aa0e8400-e29b-41d4-a716-446655440101", userId: "660e8400-e29b-41d4-a716-446655440001", usernameSnapshot: "demo_player", score: 980, timeSeconds: 18, movesCount: 4, rank: 1, submittedDaysAgo: 3 },
      { id: "aa0e8400-e29b-41d4-a716-446655440102", userId: "660e8400-e29b-41d4-a716-446655440002", usernameSnapshot: "mika_arrows", score: 940, timeSeconds: 22, movesCount: 5, rank: 2, submittedDaysAgo: 2 },
      { id: "aa0e8400-e29b-41d4-a716-446655440103", userId: "660e8400-e29b-41d4-a716-446655440003", usernameSnapshot: "noah_escape", score: 900, timeSeconds: 31, movesCount: 6, rank: 3, submittedDaysAgo: 1 },
    ],
  },
  {
    id: "990e8400-e29b-41d4-a716-446655440011",
    levelId: "550e8400-e29b-41d4-a716-446655440011",
    entries: [
      { id: "aa0e8400-e29b-41d4-a716-446655440111", userId: "660e8400-e29b-41d4-a716-446655440002", usernameSnapshot: "mika_arrows", score: 960, timeSeconds: 29, movesCount: 6, rank: 1, submittedDaysAgo: 3 },
      { id: "aa0e8400-e29b-41d4-a716-446655440112", userId: "660e8400-e29b-41d4-a716-446655440001", usernameSnapshot: "demo_player", score: 920, timeSeconds: 35, movesCount: 7, rank: 2, submittedDaysAgo: 2 },
      { id: "aa0e8400-e29b-41d4-a716-446655440113", userId: "660e8400-e29b-41d4-a716-446655440003", usernameSnapshot: "noah_escape", score: 870, timeSeconds: 47, movesCount: 9, rank: 3, submittedDaysAgo: 1 },
    ],
  },
  {
    id: "990e8400-e29b-41d4-a716-446655440012",
    levelId: "550e8400-e29b-41d4-a716-446655440012",
    entries: [
      { id: "aa0e8400-e29b-41d4-a716-446655440121", userId: "660e8400-e29b-41d4-a716-446655440003", usernameSnapshot: "noah_escape", score: 910, timeSeconds: 55, movesCount: 9, rank: 1, submittedDaysAgo: 3 },
      { id: "aa0e8400-e29b-41d4-a716-446655440122", userId: "660e8400-e29b-41d4-a716-446655440001", usernameSnapshot: "demo_player", score: 860, timeSeconds: 62, movesCount: 10, rank: 2, submittedDaysAgo: 2 },
      { id: "aa0e8400-e29b-41d4-a716-446655440123", userId: "660e8400-e29b-41d4-a716-446655440002", usernameSnapshot: "mika_arrows", score: 800, timeSeconds: 78, movesCount: 12, rank: 3, submittedDaysAgo: 1 },
    ],
  },
];

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Missing required env var: DATABASE_URL");

  const prisma = createPrismaClient(databaseUrl, { ssl: resolveSsl() });
  const now = new Date();

  try {
    for (const level of SEED_LEVELS) {
      const arrows = level.arrows as unknown as Prisma.InputJsonValue;
      const data = {
        name: level.name,
        description: level.description,
        difficulty: level.difficulty,
        status: level.status,
        version: level.version,
        arrows,
        attempts: level.attempts,
        timeLimitSeconds: level.timeLimitSeconds,
        updatedAt: now,
      };
      await prisma.level.upsert({
        where: { id: level.id },
        create: { id: level.id, createdAt: now, ...data },
        update: data,
      });
    }
    process.stdout.write(`Seeded ${SEED_LEVELS.length} published levels\n`);

    // Authored abstract shaped levels (Option A) — validated through the domain
    // path by the loader before they are published here.
    const authoredLevels = loadAuthoredLevels();
    for (const level of authoredLevels) {
      const arrows = level.arrows as unknown as Prisma.InputJsonValue;
      const boardShape: Prisma.InputJsonValue | typeof Prisma.DbNull =
        level.boardShape == null
          ? Prisma.DbNull
          : (level.boardShape as unknown as Prisma.InputJsonValue);
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
        updatedAt: now,
      };
      await prisma.level.upsert({
        where: { id: level.id },
        create: { id: level.id, createdAt: now, ...data },
        update: data,
      });
    }
    process.stdout.write(`Seeded ${authoredLevels.length} authored shaped levels\n`);

    for (const user of DEMO_USERS) {
      const data = {
        email: user.email,
        username: user.username,
        passwordHash: DEMO_PASSWORD_HASH,
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
    process.stdout.write(`Seeded ${DEMO_USERS.length} demo users, progress and ${DEMO_LEADERBOARDS.length} leaderboards\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Seed failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
