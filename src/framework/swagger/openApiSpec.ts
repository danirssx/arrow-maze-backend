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
          }
        }
      }
    }
  }
} as const;
