export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Arrow Maze API",
    version: "0.1.0"
  },
  paths: {
    "/health": {
      get: {
        summary: "Check API health",
        responses: {
          "200": {
            description: "API is running"
          },
          "404": {
            description: "Route not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  status: "error",
                  error: {
                    code: "NOT_FOUND",
                    message: "Route not found: GET /unknown"
                  }
                }
              }
            }
          },
          "500": {
            description: "Unexpected server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  status: "error",
                  error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Internal server error"
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["status", "error"],
        properties: {
          status: { type: "string", enum: ["error"] },
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Validation failed" },
              details: { type: "object", additionalProperties: true, nullable: true }
            }
          }
        }
      }
    }
  }
} as const;
