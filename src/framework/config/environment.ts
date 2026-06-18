export type Environment = {
  nodeEnv: string;
  port: number;
  corsOrigin: string;
  databaseUrl: string;
  jwtSecret: string;
};

export function loadEnvironment(): Environment {
  const databaseUrl = process.env.DATABASE_URL;
  const jwtSecret = process.env.JWT_SECRET;

  if (!databaseUrl) throw new Error("Missing required env var: DATABASE_URL");
  if (!jwtSecret) throw new Error("Missing required env var: JWT_SECRET");

  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT ?? 3000),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:8081",
    databaseUrl,
    jwtSecret
  };
}
