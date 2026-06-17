import { ApiResponsePresenter } from "../../src/framework/errors/ApiResponsePresenter";

describe("ApiResponsePresenter", () => {
  it("should_wrap_payload_in_success_envelope_when_success_is_built", () => {
    const response = ApiResponsePresenter.success({ id: 1, name: "Level 1" });

    expect(response).toEqual({
      status: "success",
      data: { id: 1, name: "Level 1" }
    });
  });

  it("should_build_error_envelope_without_details_when_none_provided", () => {
    const response = ApiResponsePresenter.error("NOT_FOUND", "Resource not found");

    expect(response).toEqual({
      status: "error",
      error: { code: "NOT_FOUND", message: "Resource not found" }
    });
  });

  it("should_include_details_in_error_envelope_when_provided", () => {
    const response = ApiResponsePresenter.error("VALIDATION_ERROR", "Validation failed", {
      field: "email"
    });

    expect(response).toEqual({
      status: "error",
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: { field: "email" }
      }
    });
  });
});
