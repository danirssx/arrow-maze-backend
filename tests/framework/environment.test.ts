import { loadEnvironment } from "../../src/framework/config/environment.js";

describe("loadEnvironment - CORS origins", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      JWT_SECRET: "test-jwt-secret",
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("should_configure_trimmed_non_empty_cors_origins_when_CORS_ORIGIN_contains_commas", () => {
    process.env["CORS_ORIGIN"] = " http://localhost:8081, , http://localhost:5173 ";

    const env = loadEnvironment();

    expect(env.corsOrigins).toEqual(["http://localhost:8081", "http://localhost:5173"]);
  });
});
