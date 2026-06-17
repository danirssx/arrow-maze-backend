/**
 * Shared error kernel for Arrow Maze backend.
 *
 * `AppError` is the abstract base every layered error extends. It carries the
 * stable machine-readable `code`, the `httpStatus` used by the framework error
 * middleware, the human-readable `message`, and optional `details`.
 *
 * Layer note: this lives in `shared` (cross-cutting kernel) so domain,
 * application, and framework can all reference the same contract without a
 * framework dependency. `httpStatus` is a plain number, never an Express type,
 * so no layer is coupled to the HTTP framework.
 */
export type ErrorDetails = Record<string, unknown>;

export abstract class AppError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly details?: ErrorDetails;

  protected constructor(code: string, httpStatus: number, message: string, details?: ErrorDetails) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.httpStatus = httpStatus;
    if (details !== undefined) {
      this.details = details;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
