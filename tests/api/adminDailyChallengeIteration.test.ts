import express from "express";
import request from "supertest";
import type { UseCase } from "../../src/application/aspects/UseCase.js";
import type {
  StartDailyChallengeIterationInput,
  StartDailyChallengeIterationOutput,
} from "../../src/application/daily-challenge/use-cases/StartDailyChallengeIterationUseCase.js";
import type {
  GetDailyChallengeIterationInput,
  GetDailyChallengeIterationOutput,
} from "../../src/application/daily-challenge/use-cases/GetDailyChallengeIterationUseCase.js";
import type { DailyChallengeIterationDto } from "../../src/application/daily-challenge/DailyChallengeIterationTypes.js";
import type { Logger } from "../../src/application/ports/Logger.js";
import type { TokenService } from "../../src/application/identity/ports/TokenService.js";
import { InvalidDailyChallengeDateError } from "../../src/application/daily-challenge/DailyChallengeIterationErrors.js";
import { DailyChallengeIterationNotFoundError } from "../../src/application/daily-challenge/DailyChallengeIterationErrors.js";
import { UserRole } from "../../src/domain/identity/enums/UserRole.js";
import { createErrorMiddleware } from "../../src/framework/errors/errorMiddleware.js";
import { createAuthMiddleware } from "../../src/framework/middleware/authMiddleware.js";
import { AdminDailyChallengeIterationController } from "../../src/framework/daily-challenge/AdminDailyChallengeIterationController.js";
import { createAdminDailyChallengeIterationRouter } from "../../src/framework/daily-challenge/adminDailyChallengeIterationRoutes.js";

// Subject to human review — API adapter tests for MAZ-224 @s6..@s11.

const RUNNING_OPERATION: DailyChallengeIterationDto = {
  operationId: "f39dd177-bde0-4fd8-84cb-8cd353ffc224",
  date: "2026-07-11",
  status: "RUNNING",
  requestedAt: "2026-07-11T14:00:00.000Z",
  completedAt: null,
  events: [
    { sequence: 1, type: "REQUESTED", message: "requested", createdAt: "2026-07-11T14:00:00.000Z" },
  ],
  challenge: null,
};

const SUCCEEDED_OPERATION: DailyChallengeIterationDto = {
  ...RUNNING_OPERATION,
  status: "SUCCEEDED",
  completedAt: "2026-07-11T14:00:04.000Z",
  events: [
    { sequence: 1, type: "REQUESTED", message: "requested", createdAt: "2026-07-11T14:00:00.000Z" },
    { sequence: 2, type: "CACHE_REPLACED", message: "replaced", createdAt: "2026-07-11T14:00:04.000Z" },
  ],
};

class FakeStartUseCase
  implements UseCase<StartDailyChallengeIterationInput, StartDailyChallengeIterationOutput>
{
  calls = 0;
  constructor(private readonly result: StartDailyChallengeIterationOutput | Error) {}
  async execute(): Promise<StartDailyChallengeIterationOutput> {
    this.calls += 1;
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

class FakeGetUseCase
  implements UseCase<GetDailyChallengeIterationInput, GetDailyChallengeIterationOutput>
{
  calls = 0;
  constructor(private readonly result: GetDailyChallengeIterationOutput | Error) {}
  async execute(): Promise<GetDailyChallengeIterationOutput> {
    this.calls += 1;
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

class SilentLogger implements Logger {
  error(): void {}
  warn(): void {}
  info(): void {}
}

const tokenService: TokenService = {
  sign: () => "unused",
  verify: (token: string) => {
    if (token === "admin-token") return { userId: "u-admin", role: UserRole.ADMIN };
    if (token === "user-token") return { userId: "u-user", role: UserRole.USER };
    throw new Error("invalid token");
  },
} as unknown as TokenService;

function createApp(start: FakeStartUseCase, get: FakeGetUseCase) {
  const app = express();
  app.use(express.json());
  const controller = new AdminDailyChallengeIterationController(start, get);
  app.use(createAdminDailyChallengeIterationRouter(controller, createAuthMiddleware(tokenService)));
  app.use(createErrorMiddleware(new SilentLogger()));
  return app;
}

describe("admin daily challenge iteration API", () => {
  it("should_return_202_with_running_operation_when_admin_starts", async () => {
    // @s1
    const start = new FakeStartUseCase({ operation: RUNNING_OPERATION, alreadyRunning: false });
    const app = createApp(start, new FakeGetUseCase(new Error("unused")));

    const response = await request(app)
      .post("/admin/daily-challenge/iterations")
      .set("Authorization", "Bearer admin-token")
      .send({});

    expect(response.status).toBe(202);
    expect(response.body.data.operation.status).toBe("RUNNING");
    expect(response.body.data.operation.events).toHaveLength(1);
  });

  it("should_return_409_with_running_operation_when_iteration_already_in_progress", async () => {
    // @s9
    const start = new FakeStartUseCase({ operation: RUNNING_OPERATION, alreadyRunning: true });
    const app = createApp(start, new FakeGetUseCase(new Error("unused")));

    const response = await request(app)
      .post("/admin/daily-challenge/iterations")
      .set("Authorization", "Bearer admin-token")
      .send({ date: "2026-07-11" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("DAILY_CHALLENGE_ITERATION_IN_PROGRESS");
    expect(response.body.data.operation.operationId).toBe(RUNNING_OPERATION.operationId);
  });

  it("should_return_400_when_date_is_invalid", async () => {
    // @s10
    const start = new FakeStartUseCase(new InvalidDailyChallengeDateError());
    const app = createApp(start, new FakeGetUseCase(new Error("unused")));

    const response = await request(app)
      .post("/admin/daily-challenge/iterations")
      .set("Authorization", "Bearer admin-token")
      .send({ date: "not-a-date" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_DAILY_CHALLENGE_DATE");
  });

  it("should_return_400_with_default_message_when_date_is_not_a_string", async () => {
    // @s10 — controller-level transport validation before the use case runs
    const start = new FakeStartUseCase({ operation: RUNNING_OPERATION, alreadyRunning: false });
    const app = createApp(start, new FakeGetUseCase(new Error("unused")));

    const response = await request(app)
      .post("/admin/daily-challenge/iterations")
      .set("Authorization", "Bearer admin-token")
      .send({ date: 123 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_DAILY_CHALLENGE_DATE");
    expect(response.body.error.message).toBe("Invalid daily challenge date");
    expect(start.calls).toBe(0);
  });

  it("should_return_401_and_not_start_when_unauthenticated", async () => {
    // @s6
    const start = new FakeStartUseCase({ operation: RUNNING_OPERATION, alreadyRunning: false });
    const app = createApp(start, new FakeGetUseCase(new Error("unused")));

    const response = await request(app).post("/admin/daily-challenge/iterations").send({});

    expect(response.status).toBe(401);
    expect(start.calls).toBe(0);
  });

  it("should_return_403_and_not_start_when_authenticated_user_is_not_admin", async () => {
    // @s7
    const start = new FakeStartUseCase({ operation: RUNNING_OPERATION, alreadyRunning: false });
    const app = createApp(start, new FakeGetUseCase(new Error("unused")));

    const response = await request(app)
      .post("/admin/daily-challenge/iterations")
      .set("Authorization", "Bearer user-token")
      .send({});

    expect(response.status).toBe(403);
    expect(start.calls).toBe(0);
  });

  it("should_return_200_with_ordered_events_when_admin_polls_operation", async () => {
    // @s8
    const get = new FakeGetUseCase({ operation: SUCCEEDED_OPERATION });
    const app = createApp(
      new FakeStartUseCase({ operation: RUNNING_OPERATION, alreadyRunning: false }),
      get
    );

    const response = await request(app)
      .get(`/admin/daily-challenge/iterations/${SUCCEEDED_OPERATION.operationId}`)
      .set("Authorization", "Bearer admin-token");

    expect(response.status).toBe(200);
    expect(response.body.data.operation.status).toBe("SUCCEEDED");
    expect(response.body.data.operation.events.map((e: { sequence: number }) => e.sequence)).toEqual([
      1, 2,
    ]);
  });

  it("should_return_404_when_polling_unknown_operation", async () => {
    // @s8
    const get = new FakeGetUseCase(new DailyChallengeIterationNotFoundError());
    const app = createApp(
      new FakeStartUseCase({ operation: RUNNING_OPERATION, alreadyRunning: false }),
      get
    );

    const response = await request(app)
      .get("/admin/daily-challenge/iterations/missing")
      .set("Authorization", "Bearer admin-token");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("DAILY_CHALLENGE_ITERATION_NOT_FOUND");
  });

  it("should_return_401_and_not_read_when_polling_without_auth", async () => {
    // @s6
    const get = new FakeGetUseCase({ operation: SUCCEEDED_OPERATION });
    const app = createApp(
      new FakeStartUseCase({ operation: RUNNING_OPERATION, alreadyRunning: false }),
      get
    );

    const response = await request(app).get("/admin/daily-challenge/iterations/op-1");

    expect(response.status).toBe(401);
    expect(get.calls).toBe(0);
  });
});
