import { createPrismaClient } from "../../../src/infrastructure/database/PrismaClientProvider.js";

// Subject to human review — infrastructure adapter test

const URL = "postgresql://user:pass@localhost:5432/db";

describe("createPrismaClient", () => {
  it("should_build_a_usable_client_without_ssl_when_ssl_option_is_false", async () => {
    const client = createPrismaClient(URL, { ssl: false });
    expect(typeof client.$transaction).toBe("function");
    expect(typeof client.$disconnect).toBe("function");
    await client.$disconnect();
  });

  it("should_build_a_usable_client_with_ssl_when_ssl_option_is_true", async () => {
    const client = createPrismaClient(URL, { ssl: true });
    expect(typeof client.$transaction).toBe("function");
    await client.$disconnect();
  });

  it("should_build_a_usable_client_when_options_are_omitted", async () => {
    const client = createPrismaClient(URL);
    expect(typeof client.$transaction).toBe("function");
    await client.$disconnect();
  });
});

describe("loadEnvironment — databaseSsl", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("should_set_databaseSsl_true_when_DATABASE_SSL_env_is_true", async () => {
    process.env["DATABASE_SSL"] = "true";
    process.env["NODE_ENV"] = "development";
    const { loadEnvironment } = await import("../../../src/framework/config/environment.js");
    const env = loadEnvironment();
    expect(env.databaseSsl).toBe(true);
  });

  it("should_set_databaseSsl_false_when_DATABASE_SSL_env_is_false", async () => {
    process.env["DATABASE_SSL"] = "false";
    process.env["NODE_ENV"] = "production";
    const { loadEnvironment } = await import("../../../src/framework/config/environment.js");
    const env = loadEnvironment();
    expect(env.databaseSsl).toBe(false);
  });

  it("should_default_databaseSsl_to_true_when_NODE_ENV_is_production_and_no_override", async () => {
    delete process.env["DATABASE_SSL"];
    process.env["NODE_ENV"] = "production";
    const { loadEnvironment } = await import("../../../src/framework/config/environment.js");
    const env = loadEnvironment();
    expect(env.databaseSsl).toBe(true);
  });

  it("should_default_databaseSsl_to_false_when_NODE_ENV_is_development_and_no_override", async () => {
    delete process.env["DATABASE_SSL"];
    process.env["NODE_ENV"] = "development";
    const { loadEnvironment } = await import("../../../src/framework/config/environment.js");
    const env = loadEnvironment();
    expect(env.databaseSsl).toBe(false);
  });
});
