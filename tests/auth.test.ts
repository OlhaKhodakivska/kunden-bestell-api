import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

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
import { env } from "../src/config/env.js";
import { prisma } from "../src/lib/prisma.js";

const password = "test-password-12345";

const user = {
  id: "e8426100-6a7b-4cd5-8ac6-71556a8ad1bf",
  email: "admin@example.com",
  passwordHash: "",
  role: Role.ADMIN,
  createdAt: new Date("2026-10-05T10:00:00Z"),
  updatedAt: new Date("2026-10-05T10:00:00Z")
};

beforeAll(async () => {
  user.passwordHash = await bcrypt.hash(password, 4);
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user);
});

describe("Authentifizierung", () => {
  it("liefert einen gültigen JWT bei erfolgreichem Login", async () => {
    const response = await request(createApp())
      .post("/api/v1/auth/login")
      .send({
        email: user.email,
        password
      });

    expect(response.status).toBe(200);
    expect(response.body.data.tokenType).toBe("Bearer");
    expect(response.body.data.user).toEqual({
      id: user.id,
      email: user.email,
      role: user.role
    });

    const payload = jwt.verify(
      response.body.data.accessToken,
      env.JWT_SECRET,
      { algorithms: ["HS256"] }
    );

    expect(payload).toMatchObject({
      sub: user.id,
      role: Role.ADMIN
    });

    expect(response.body.data.user).not.toHaveProperty("passwordHash");
    expect(response.body.data.user).not.toHaveProperty("password");
  });

  it("verweigert einen falschen Passwortwert mit HTTP 401", async () => {
    const response = await request(createApp())
      .post("/api/v1/auth/login")
      .send({
        email: user.email,
        password: "wrong-password"
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("verweigert eine unbekannte E-Mail mit derselben Fehlermeldung", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const response = await request(createApp())
      .post("/api/v1/auth/login")
      .send({
        email: "unknown@example.com",
        password
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toEqual({
      code: "INVALID_CREDENTIALS",
      message: "E-Mail oder Passwort ist falsch."
    });
  });

  it("verweigert ungültige Login-Daten vor dem Datenbankzugriff", async () => {
    const response = await request(createApp())
      .post("/api/v1/auth/login")
      .send({
        email: "keine-email",
        password: ""
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("verweigert einen abgelaufenen JWT", async () => {
    const expiredToken = jwt.sign(
      { role: Role.ADMIN },
      env.JWT_SECRET,
      {
        subject: user.id,
        expiresIn: -1,
        algorithm: "HS256"
      }
    );

    const response = await request(createApp())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("begrenzt wiederholte fehlgeschlagene Login-Versuche", async () => {
    const app = createApp();
    let lastStatus = 0;
    let lastCode = "";

    for (let attempt = 0; attempt < 11; attempt++) {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: user.email,
          password: "wrong-password"
        });

      lastStatus = response.status;
      lastCode = response.body.error.code;
    }

    expect(lastStatus).toBe(429);
    expect(lastCode).toBe("TOO_MANY_REQUESTS");
  });
});