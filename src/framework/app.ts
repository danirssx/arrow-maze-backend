import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import { ConsoleLogger } from "../infrastructure/logging/ConsoleLogger.js";
import { loadEnvironment } from "./config/environment.js";
import { createErrorMiddleware } from "./errors/errorMiddleware.js";
import { notFoundMiddleware } from "./errors/notFoundMiddleware.js";
import { createHealthRouter } from "./routes/healthRoutes.js";
import { openApiSpec } from "./swagger/openApiSpec.js";

export function createApp() {
  const environment = loadEnvironment();
  const logger = new ConsoleLogger();
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: environment.corsOrigin }));
  app.use(express.json());
  app.use(createHealthRouter());
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use(notFoundMiddleware);
  app.use(createErrorMiddleware(logger));

  return app;
}
