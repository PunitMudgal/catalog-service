import { expect, test } from "bun:test";
import healthRoutes from "./health.router.js";

test("live health check returns application status", async () => {
  const response = await healthRoutes.request("/live");
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toEqual({
    success: true,
    message: "Application is alive",
    data: {
      service: "application",
      status: "healthy",
    },
    status: 200,
  });
});
