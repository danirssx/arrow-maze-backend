import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import { createErrorMiddleware } from "./errors/errorMiddleware.js";
import { loadEnvironment } from "./config/environment.js";
import { createHealthRouter } from "./routes/healthRoutes.js";
import { openApiSpec } from "./swagger/openApiSpec.js";

export function createApp() {
  const environment = loadEnvironment();
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: environment.corsOrigin }));
  app.use(express.json());
  app.use(createHealthRouter());
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use(createErrorMiddleware({ error: () => {}, warn: () => {}, info: () => {} }));

  return app;
}
