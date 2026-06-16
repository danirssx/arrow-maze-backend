export type Environment = {
  nodeEnv: string;
  port: number;
  corsOrigin: string;
};

export function loadEnvironment(): Environment {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT ?? 3000),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:8081"
  };
}
