import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    customer: {
      create: vi.fn(),
      findUnique: vi.fn()
    }
  }
}));

import { createApp } from "../src/app.js";

describe("Grundlegendes API-Verhalten", () => {
  it("liefert den Health-Status mit HTTP 200", async () => {
    const response = await request(createApp())
      .get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "kunden-bestell-api"
    });
  });

  it("liefert HTTP 404 für eine unbekannte Route", async () => {
    const response = await request(createApp())
      .get("/api/v1/unbekannt");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
  });

  it("verweigert Zugriff ohne Token mit HTTP 401", async () => {
    const response = await request(createApp())
      .get("/api/v1/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("verweigert Zugriff mit ungültigem Token mit HTTP 401", async () => {
    const response = await request(createApp())
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });
});