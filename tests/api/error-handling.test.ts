import express from "express";
import request from "supertest";

import { createApp } from "../../src/framework/app";
import { createErrorMiddleware } from "../../src/framework/errors/errorMiddleware";
import { notFoundMiddleware } from "../../src/framework/errors/notFoundMiddleware";
import type { Logger } from "../../src/application/ports/Logger";
import { BusinessRuleViolationError } from "../../src/domain/errors/DomainError";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError
} from "../../src/shared/errors/index";

const silentLogger: Logger = {
  error: () => {},
  warn: () => {},
  info: () => {}
};

function buildHarness() {
  const app = express();
  app.use(express.json());

  app.get("/throw/validation", () => {
    throw new ValidationError("Email is invalid", { field: "email" });
  });
  app.get("/throw/unauthorized", () => {
    throw new UnauthorizedError();
  });
  app.get("/throw/forbidden", () => {
    throw new ForbiddenError();
  });
  app.get("/throw/conflict", () => {
    throw new ConflictError();
  });
  app.get("/throw/domain", () => {
    throw new BusinessRuleViolationError("Move is not allowed");
  });
  app.get("/throw/unknown", () => {
    throw new Error("connection failed for password=supersecret");
  });

  app.use(notFoundMiddleware);
  app.use(createErrorMiddleware(silentLogger));

  return app;
}

describe("Error handling middleware", () => {
  it("should_return_standard_error_envelope_when_domain_error_is_thrown", async () => {
    const response = await request(buildHarness()).get("/throw/domain");

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      status: "error",
      error: {
        code: "BUSINESS_RULE_VIOLATION",
        message: "Move is not allowed"
      }
    });
  });

  it("should_include_details_when_error_carries_them", async () => {
    const response = await request(buildHarness()).get("/throw/validation");

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      status: "error",
      error: {
        code: "VALIDATION_ERROR",
        message: "Email is invalid",
        details: { field: "email" }
      }
    });
  });

  it.each([
    ["/throw/unauthorized", 401, "UNAUTHORIZED"],
    ["/throw/forbidden", 403, "FORBIDDEN"],
    ["/throw/conflict", 409, "CONFLICT"]
  ])("should_map_%s_to_status_%i", async (path, expectedStatus, expectedCode) => {
    const response = await request(buildHarness()).get(path);

    expect(response.status).toBe(expectedStatus);
    expect(response.body.status).toBe("error");
    expect(response.body.error.code).toBe(expectedCode);
  });

  it("should_hide_internal_message_and_stack_when_unexpected_error_is_thrown", async () => {
    const response = await request(buildHarness()).get("/throw/unknown");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      status: "error",
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error"
      }
    });
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain("supersecret");
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("at ");
  });
});

describe("Not found handling on the real app", () => {
  it("should_return_not_found_envelope_when_route_does_not_exist", async () => {
    const response = await request(createApp()).get("/this-route-does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.status).toBe("error");
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(JSON.stringify(response.body)).not.toContain("at ");
  });
});
