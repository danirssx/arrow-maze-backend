import request from "supertest";

import { createApp } from "../../src/framework/app.js";

describe("CORS origin allowlist", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      JWT_SECRET: "test-jwt-secret",
      CORS_ORIGIN: "http://localhost:8081,http://localhost:5173",
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("should_allow_expo_origin_when_origin_is_configured", async () => {
    const response = await request(createApp())
      .get("/health")
      .set("Origin", "http://localhost:8081");

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:8081");
  });

  it("should_allow_admin_web_origin_when_origin_is_configured", async () => {
    const response = await request(createApp())
      .get("/health")
      .set("Origin", "http://localhost:5173");

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("should_not_allow_unknown_origin_when_origin_is_not_configured", async () => {
    const response = await request(createApp())
      .get("/health")
      .set("Origin", "http://malicious.local");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("should_not_reject_request_when_origin_header_is_missing", async () => {
    const response = await request(createApp()).get("/health");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
