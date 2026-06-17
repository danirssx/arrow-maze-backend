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
    },
    "/auth/register": {
      post: {
        summary: "Register a new user",
        tags: ["Identity"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
              example: {
                email: "player@example.com",
                username: "arrow_player",
                rawPassword: "SecurePass1!"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterResponse" },
                example: {
                  status: "success",
                  data: { userId: "550e8400-e29b-41d4-a716-446655440000" }
                }
              }
            }
          },
          "400": {
            description: "Missing required fields",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  status: "error",
                  error: { code: "BAD_REQUEST", message: "email, username and rawPassword are required" }
                }
              }
            }
          },
          "409": {
            description: "Email or username already taken",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  status: "error",
                  error: { code: "CONFLICT", message: "Email already registered" }
                }
              }
            }
          },
          "422": {
            description: "Domain validation failed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  status: "error",
                  error: { code: "INVALID_ARGUMENT", message: "Invalid email format" }
                }
              }
            }
          }
        }
      }
    },
    "/auth/login": {
      post: {
        summary: "Authenticate a user and receive an access token",
        tags: ["Identity"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
              example: {
                email: "player@example.com",
                rawPassword: "SecurePass1!"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
                example: {
                  status: "success",
                  data: {
                    accessToken: "eyJhbGciOiJIUzI1NiJ9...",
                    userId: "550e8400-e29b-41d4-a716-446655440000",
                    username: "arrow_player",
                    role: "USER"
                  }
                }
              }
            }
          },
          "400": {
            description: "Missing required fields",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  status: "error",
                  error: { code: "BAD_REQUEST", message: "email and rawPassword are required" }
                }
              }
            }
          },
          "401": {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  status: "error",
                  error: { code: "UNAUTHORIZED", message: "Invalid credentials" }
                }
              }
            }
          },
          "403": {
            description: "Account suspended",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  status: "error",
                  error: { code: "FORBIDDEN", message: "Account is suspended" }
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
      },
      RegisterRequest: {
        type: "object",
        required: ["email", "username", "rawPassword"],
        properties: {
          email: { type: "string", format: "email", example: "player@example.com" },
          username: { type: "string", minLength: 3, maxLength: 30, example: "arrow_player" },
          rawPassword: { type: "string", minLength: 8, example: "SecurePass1!" }
        }
      },
      RegisterResponse: {
        type: "object",
        required: ["status", "data"],
        properties: {
          status: { type: "string", enum: ["success"] },
          data: {
            type: "object",
            required: ["userId"],
            properties: {
              userId: { type: "string", format: "uuid" }
            }
          }
        }
      },
      LoginRequest: {
        type: "object",
        required: ["email", "rawPassword"],
        properties: {
          email: { type: "string", format: "email", example: "player@example.com" },
          rawPassword: { type: "string", minLength: 8, example: "SecurePass1!" }
        }
      },
      LoginResponse: {
        type: "object",
        required: ["status", "data"],
        properties: {
          status: { type: "string", enum: ["success"] },
          data: {
            type: "object",
            required: ["accessToken", "userId", "username", "role"],
            properties: {
              accessToken: { type: "string" },
              userId: { type: "string", format: "uuid" },
              username: { type: "string" },
              role: { type: "string", enum: ["USER", "ADMIN"] }
            }
          }
        }
      }
    }
  }
} as const;
