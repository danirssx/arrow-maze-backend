import type { RequestHandler } from "express";

import { NotFoundError } from "../../shared/errors/index.js";

/**
 * Terminal middleware for unmatched routes. It forwards a `NotFoundError` to the
 * error middleware so unknown routes produce the same standard error envelope
 * instead of Express's default HTML stack-trace page.
 */
export const notFoundMiddleware: RequestHandler = (request, _response, next) => {
  next(new NotFoundError(`Route not found: ${request.method} ${request.path}`));
};
