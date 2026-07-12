import express from "express";
import request from "supertest";
import type { UseCase } from "../../src/application/aspects/UseCase.js";
import type {
  GetDailyChallengeInput,
  GetDailyChallengeOutput,
} from "../../src/application/daily-challenge/use-cases/GetDailyChallengeUseCase.js";
import type { Logger } from "../../src/application/ports/Logger.js";
import { ServiceUnavailableError } from "../../src/shared/errors/ApplicationError.js";
import { createErrorMiddleware } from "../../src/framework/errors/errorMiddleware.js";
import { DailyChallengeController } from "../../src/framework/daily-challenge/DailyChallengeController.js";
import { createDailyChallengeRouter } from "../../src/framework/daily-challenge/dailyChallengeRoutes.js";

// Subject to human review — API adapter tests for MAZ-218 @s2, @s8, @s9.

const CHALLENGE = {
  date: "2026-07-10",
  seed: "daily-2026-07-10",
  targetDifficulty: "MEDIUM",
  source: "gemini" as const,
  generatedAt: "2026-07-10T04:00:00.000Z",
  expiresAt: "2026-07-11T00:00:00.000Z",
  validation: {
    solvable: true as const,
    difficultyMatched: true as const,
    fallbackUsed: false,
  },
  level: {
    name: "Daily Challenge 2026-07-10",
    description: "A generated daily puzzle.",
    difficulty: "MEDIUM",
    definition: {
      attempts: 5,
      arrows: [
        {
          id: "arrow-0",
          color: "#4B6BFB",
          path: [{ row: 0, col: 0 }],
          direction: "RIGHT",
        },
      ],
      boardShape: {
        type: "CELL_MASK",
        cells: [{ row: 0, col: 0 }],
      },
    },
    timeLimitSeconds: 120,
  },
};

class FakeGetDailyChallengeUseCase
  implements UseCase<GetDailyChallengeInput, GetDailyChallengeOutput>
{
  calls = 0;

  constructor(private readonly result: GetDailyChallengeOutput | Error) {}

  async execute(_input: GetDailyChallengeInput): Promise<GetDailyChallengeOutput> {
    this.calls += 1;
    if (this.result instanceof Error) {
      throw this.result;
    }
    return this.result;
  }
}

class SilentLogger implements Logger {
  error(_message: string, _context?: Record<string, unknown>): void {}
  warn(_message: string, _context?: Record<string, unknown>): void {}
  info(_message: string, _context?: Record<string, unknown>): void {}
}

function createApp(useCase: UseCase<GetDailyChallengeInput, GetDailyChallengeOutput>) {
  const app = express();
  app.use(express.json());
  app.use(createDailyChallengeRouter(new DailyChallengeController(useCase)));
  app.use(createErrorMiddleware(new SilentLogger()));
  return app;
}

describe("GET /daily-challenge", () => {
  it("should_return_200_with_daily_challenge_when_available", async () => {
    // Arrange
    const useCase = new FakeGetDailyChallengeUseCase({ challenge: CHALLENGE });

    // Act
    const response = await request(createApp(useCase)).get("/daily-challenge");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      data: { challenge: CHALLENGE },
    });
    expect(useCase.calls).toBe(1);
  });

  it("should_return_same_payload_for_multiple_users_when_use_case_returns_cached_utc_challenge", async () => {
    // Arrange
    const useCase = new FakeGetDailyChallengeUseCase({ challenge: CHALLENGE });
    const app = createApp(useCase);

    // Act
    const first = await request(app).get("/daily-challenge").set("X-Timezone", "America/Caracas");
    const second = await request(app).get("/daily-challenge").set("X-Timezone", "Asia/Tokyo");

    // Assert
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.data.challenge).toEqual(second.body.data.challenge);
    expect(first.body.data.challenge.date).toBe("2026-07-10");
    expect(first.body.data.challenge.seed).toBe("daily-2026-07-10");
  });

  it("should_return_503_without_provider_details_when_generation_is_unavailable", async () => {
    // Arrange
    const useCase = new FakeGetDailyChallengeUseCase(
      new ServiceUnavailableError(
        "DAILY_CHALLENGE_UNAVAILABLE",
        "Daily challenge unavailable",
        { providerCause: "GEMINI_API_KEY stack trace" }
      )
    );

    // Act
    const response = await request(createApp(useCase)).get("/daily-challenge");

    // Assert
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("DAILY_CHALLENGE_UNAVAILABLE");
    expect(response.body.error.message).toBe("Daily challenge unavailable");
    expect(JSON.stringify(response.body)).not.toContain("GEMINI_API_KEY");
    expect(JSON.stringify(response.body)).not.toContain("stack trace");
  });
});
