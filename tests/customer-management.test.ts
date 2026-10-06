import { Prisma, Role } from "@prisma/client";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    customer: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
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
  createdAt: new Date(),
  updatedAt: new Date()
};

const customer = {
  id: "3d6fa886-91f3-4223-a848-78d29a3880fa",
  email: "anna.beispiel@example.com",
  firstName: "Anna",
  lastName: "Beispiel",
  phone: "+49 123 456789",
  createdAt: new Date(),
  updatedAt: new Date()
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

function databaseError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(
    "Test database error",
    { code, clientVersion: "6.12.0" }
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user);
});

describe("Kundensuche und Paginierung", () => {
  it("verwendet Standardwerte für die erste Seite", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[customer], 1]);

    const response = await request(createApp())
      .get("/api/v1/customers")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1
    });

    expect(prisma.customer.findMany).toHaveBeenCalledWith({
      where: {},
      skip: 0,
      take: 10,
      orderBy: [
        { lastName: "asc" },
        { firstName: "asc" },
        { id: "asc" }
      ]
    });
  });

  it("übergibt Suche und Seitenparameter an Prisma", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[customer], 7]);

    const response = await request(createApp())
      .get("/api/v1/customers?search=Anna&page=2&limit=5")
      .set("Authorization", `Bearer ${token}`);

    const where = {
      OR: [
        { firstName: { contains: "Anna", mode: "insensitive" } },
        { lastName: { contains: "Anna", mode: "insensitive" } },
        { email: { contains: "Anna", mode: "insensitive" } }
      ]
    };

    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 7,
      totalPages: 2
    });

    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        skip: 5,
        take: 5
      })
    );

    expect(prisma.customer.count).toHaveBeenCalledWith({ where });
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Array),
      { isolationLevel: "RepeatableRead" }
    );
  });

  it("verweigert eine ungültige Seitennummer", async () => {
    const response = await request(createApp())
      .get("/api/v1/customers?page=0")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("Kunden aktualisieren", () => {
  it("ändert nur die angegebenen Felder", async () => {
    vi.mocked(prisma.customer.update).mockResolvedValue({
      ...customer,
      firstName: "Anne"
    });

    const response = await request(createApp())
      .patch(`/api/v1/customers/${customer.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: " Anne " });

    expect(response.status).toBe(200);
    expect(response.body.data.firstName).toBe("Anne");
    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: customer.id },
      data: { firstName: "Anne" }
    });
  });

  it("entfernt die Telefonnummer mit null", async () => {
    vi.mocked(prisma.customer.update).mockResolvedValue({
      ...customer,
      phone: null
    });

    const response = await request(createApp())
      .patch(`/api/v1/customers/${customer.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ phone: null });

    expect(response.status).toBe(200);
    expect(response.body.data.phone).toBeNull();
    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: customer.id },
      data: { phone: null }
    });
  });

  it("verweigert ein leeres Update", async () => {
    const response = await request(createApp())
      .patch(`/api/v1/customers/${customer.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(prisma.customer.update).not.toHaveBeenCalled();
  });

  it("liefert HTTP 409 bei einer bereits vergebenen E-Mail", async () => {
    vi.mocked(prisma.customer.update).mockRejectedValue(
      databaseError("P2002")
    );

    const response = await request(createApp())
      .patch(`/api/v1/customers/${customer.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "other@example.com" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CUSTOMER_EMAIL_EXISTS");
  });

  it("liefert HTTP 404 beim Update eines fehlenden Kunden", async () => {
    vi.mocked(prisma.customer.update).mockRejectedValue(
      databaseError("P2025")
    );

    const response = await request(createApp())
      .patch(`/api/v1/customers/${customer.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Anne" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("CUSTOMER_NOT_FOUND");
  });
});

describe("Kunden löschen", () => {
  it("verweigert EMPLOYEE das Löschen", async () => {
    const response = await request(createApp())
      .delete(`/api/v1/customers/${customer.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(prisma.customer.delete).not.toHaveBeenCalled();
  });

  it("erlaubt ADMIN das Löschen mit HTTP 204", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...user,
      role: Role.ADMIN
    });
    vi.mocked(prisma.customer.delete).mockResolvedValue(customer);

    const response = await request(createApp())
      .delete(`/api/v1/customers/${customer.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(prisma.customer.delete).toHaveBeenCalledWith({
      where: { id: customer.id }
    });
  });

  it("übersetzt einen Fremdschlüsselkonflikt in HTTP 409", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...user,
      role: Role.ADMIN
    });
    vi.mocked(prisma.customer.delete).mockRejectedValue(
      databaseError("P2003")
    );

    const response = await request(createApp())
      .delete(`/api/v1/customers/${customer.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CUSTOMER_HAS_ORDERS");
  });

  it("liefert HTTP 404 beim Löschen eines fehlenden Kunden", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...user,
      role: Role.ADMIN
    });
    vi.mocked(prisma.customer.delete).mockRejectedValue(
      databaseError("P2025")
    );

    const response = await request(createApp())
      .delete(`/api/v1/customers/${customer.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("CUSTOMER_NOT_FOUND");
  });
});