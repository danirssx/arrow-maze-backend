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

  it("should_keep_gemini_key_optional_and_default_model_server_side", () => {
    delete process.env["GEMINI_API_KEY"];
    delete process.env["GEMINI_MODEL"];

    const env = loadEnvironment();

    expect(env.geminiApiKey).toBeUndefined();
    expect(env.geminiModel).toBe("gemini-3.5-flash");
  });

  it("should_read_gemini_key_and_model_from_backend_environment", () => {
    process.env["GEMINI_API_KEY"] = "local-gemini-key";
    process.env["GEMINI_MODEL"] = "gemini-test";

    const env = loadEnvironment();

    expect(env.geminiApiKey).toBe("local-gemini-key");
    expect(env.geminiModel).toBe("gemini-test");
  });
});
