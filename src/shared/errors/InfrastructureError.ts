import { AppError, type ErrorDetails } from "./AppError.js";

/**
 * Infrastructure-layer errors: failures from external systems (database,
 * network, third-party services). These map to a 500 response and their
 * messages must never be forwarded verbatim to clients by the middleware.
 */
export class InfrastructureError extends AppError {
  constructor(message = "Internal infrastructure error", details?: ErrorDetails) {
    super("INFRASTRUCTURE_ERROR", 500, message, details);
  }
}
