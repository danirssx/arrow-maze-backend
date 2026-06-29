export type Environment = {
  nodeEnv: string;
  port: number;
  corsOrigin: string;
  databaseUrl: string;
  databaseSsl: boolean;
  jwtSecret: string;
  jwtAccessExpiresIn: string;
  refreshTokenTtlDays: number;
};

export function loadEnvironment(): Environment {
  const databaseUrl = process.env.DATABASE_URL;
  const jwtSecret = process.env.JWT_SECRET;

  if (!databaseUrl) throw new Error("Missing required env var: DATABASE_URL");
  if (!jwtSecret) throw new Error("Missing required env var: JWT_SECRET");

  const nodeEnv = process.env.NODE_ENV ?? "development";
  // SSL defaults to true in production; can be overridden with DATABASE_SSL=false
  const databaseSsl =
    process.env.DATABASE_SSL !== undefined
      ? process.env.DATABASE_SSL === "true"
      : nodeEnv === "production";

  return {
    nodeEnv,
    port: Number(process.env.PORT ?? 3000),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:8081",
    databaseUrl,
    databaseSsl,
    jwtSecret,
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30)
  };
}
