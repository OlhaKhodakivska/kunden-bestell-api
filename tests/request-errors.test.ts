import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}));

import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Allgemeine Anfragefehler", () => {
  it("liefert HTTP 400 für beschädigtes JSON", async () => {
    const response = await request(createApp())
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_JSON",
        message: "Der Anfragekörper enthält kein gültiges JSON."
      }
    });

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("liefert HTTP 413 für einen zu großen JSON-Body", async () => {
    const body = JSON.stringify({
      padding: "x".repeat(110 * 1024)
    });

    const response = await request(createApp())
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send(body);

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Der Anfragekörper überschreitet die erlaubte Größe."
      }
    });

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it(
    "liefert beim allgemeinen Rate Limit HTTP 429 im JSON-Format",
    async () => {
      const app = createApp();

      for (let attempt = 0; attempt < 200; attempt++) {
        const response = await request(app)
          .get("/api/v1/health");

        expect(response.status).toBe(200);
      }

      const limited = await request(app)
        .get("/api/v1/health");

      expect(limited.status).toBe(429);
      expect(limited.body).toEqual({
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Zu viele Anfragen. Bitte später erneut versuchen."
        }
      });

      expect(limited.headers["retry-after"]).toBeDefined();
    },
    10000
  );
});