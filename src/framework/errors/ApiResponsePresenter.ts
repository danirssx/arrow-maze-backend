/**
 * ApiResponsePresenter builds the single, consistent response envelope used by
 * every controller in the API.
 *
 * Success: { status: "success", data }
 * Error:   { status: "error", error: { code, message, details? } }
 *
 * Keeping the envelope in one presenter prevents controllers and the error
 * middleware from hand-rolling response shapes.
 */
export type ApiErrorBody = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type ApiErrorResponse = {
  status: "error";
  error: ApiErrorBody;
};

export type ApiSuccessResponse<T> = {
  status: "success";
  data: T;
};

export class ApiResponsePresenter {
  static success<T>(data: T): ApiSuccessResponse<T> {
    return { status: "success", data };
  }

  static error(code: string, message: string, details?: Record<string, unknown>): ApiErrorResponse {
    const error: ApiErrorBody = { code, message };
    if (details !== undefined) {
      error.details = details;
    }
    return { status: "error", error };
  }
}
