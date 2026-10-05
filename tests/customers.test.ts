import { Prisma, Role } from "@prisma/client";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const user = {
  id: "e8426100-6a7b-4cd5-8ac6-71556a8ad1bf",
  email: "employee@example.com",
  passwordHash: "test-hash",
  role: Role.EMPLOYEE,
  createdAt: new Date("2026-10-05T10:00:00Z"),
  updatedAt: new Date("2026-10-05T10:00:00Z")
};

const customer = {
  id: "3d6fa886-91f3-4223-a848-78d29a3880fa",
  email: "anna.beispiel@example.com",
  firstName: "Anna",
  lastName: "Beispiel",
  phone: null,
  createdAt: new Date("2026-10-05T10:00:00Z"),
  updatedAt: new Date("2026-10-05T10:00:00Z")
};

const token = jwt.sign(
  { role: Role.EMPLOYEE },
  env.JWT_SECRET,
  {
    subject: user.id,
    expiresIn: "1h",
    algorithm: "HS256"
  }
);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user);
});

describe("Kundenverwaltung", () => {
  it("erstellt einen Kunden und normalisiert die Eingaben", async () => {
    vi.mocked(prisma.customer.create).mockResolvedValue(customer);

    const response = await request(createApp())
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        email: " ANNA.BEISPIEL@EXAMPLE.COM ",
        firstName: " Anna ",
        lastName: " Beispiel "
      });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe(customer.id);
    expect(response.headers.location).toBe(
      `/api/v1/customers/${customer.id}`
    );

    expect(prisma.customer.create).toHaveBeenCalledWith({
      data: {
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName
      }
    });
  });

  it("liest einen vorhandenen Kunden", async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(customer);

    const response = await request(createApp())
      .get(`/api/v1/customers/${customer.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe(customer.email);
    expect(prisma.customer.findUnique).toHaveBeenCalledWith({
      where: { id: customer.id }
    });
  });

  it("verweigert ungültige Eingaben ohne Datenbank-Schreibzugriff", async () => {
    const response = await request(createApp())
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        email: "keine-email",
        firstName: "",
        lastName: "Beispiel"
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(prisma.customer.create).not.toHaveBeenCalled();
  });

  it("liefert HTTP 409 bei einer bereits vorhandenen E-Mail", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "6.12.0",
        meta: { target: ["email"] }
      }
    );

    vi.mocked(prisma.customer.create).mockRejectedValue(conflict);

    const response = await request(createApp())
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CUSTOMER_EMAIL_EXISTS");
  });

  it("liefert HTTP 404 für einen nicht vorhandenen Kunden", async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null);

    const response = await request(createApp())
      .get(`/api/v1/customers/${customer.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("CUSTOMER_NOT_FOUND");
  });

  it("verweigert eine ungültige Kunden-ID", async () => {
    const response = await request(createApp())
      .get("/api/v1/customers/keine-uuid")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(prisma.customer.findUnique).not.toHaveBeenCalled();
  });
});

describe("Rollenprüfung", () => {
  it("verweigert EMPLOYEE den Zugriff auf die Benutzerliste", async () => {
    const response = await request(createApp())
      .get("/api/v1/auth/users")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("erlaubt ADMIN den Zugriff anhand der aktuellen Datenbankrolle", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...user,
      role: Role.ADMIN
    });

    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    const response = await request(createApp())
      .get("/api/v1/auth/users")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(prisma.user.findMany).toHaveBeenCalledOnce();
  });
});