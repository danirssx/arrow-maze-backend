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
