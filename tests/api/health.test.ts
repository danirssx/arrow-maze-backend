import request from "supertest";

import { createApp } from "../../src/framework/app";

describe("GET /health", () => {
  it("should_return_ok_status_when_api_is_running", async () => {
    const app = createApp();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "arrow-maze-backend"
    });
  });
});
