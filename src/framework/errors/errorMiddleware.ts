import type { ErrorRequestHandler } from "express";

import { sanitizeLogContext } from "../../application/aspects/sanitizeLogContext.js";
import type { Logger } from "../../application/ports/Logger.js";
import { AppError } from "../../shared/errors/index.js";
import { ApiResponsePresenter } from "./ApiResponsePresenter.js";

/**
 * Cross-cutting (AOP) error handler. It is the single place that maps any error
 * reaching Express into the standard API error envelope.
 *
 * Known `AppError`s expose a safe `code`/`message`/`httpStatus` and are returned
 * as-is. Any other error is treated as unexpected: the client receives a generic
 * 500 with no internal message, and the real cause is logged server-side through
 * the sanitized logger so stack traces and secrets are never leaked.
 */
const INTERNAL_ERROR_CODE = "INTERNAL_SERVER_ERROR";
const INTERNAL_ERROR_MESSAGE = "Internal server error";

export function createErrorMiddleware(logger: Logger): ErrorRequestHandler {
  return (error, request, response, _next) => {
    if (error instanceof AppError) {
      if (error.httpStatus >= 500) {
        logger.error(error.code, sanitizeLogContext({ message: error.message, path: request.path }));
      }
      response
        .status(error.httpStatus)
        .json(ApiResponsePresenter.error(error.code, error.message, error.details));
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    logger.error(INTERNAL_ERROR_CODE, sanitizeLogContext({ message, path: request.path }));
    response.status(500).json(ApiResponsePresenter.error(INTERNAL_ERROR_CODE, INTERNAL_ERROR_MESSAGE));
  };
}
