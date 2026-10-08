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
    product: {
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

const product = {
  id: "005b0c6e-1474-463d-98da-d686d265d237",
  sku: "TASSE-001",
  name: "Keramiktasse",
  description: null,
  priceCents: 1999,
  stock: 20,
  active: true,
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

function useAdmin() {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    ...user,
    role: Role.ADMIN
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user);
});

describe("Produktsuche und Paginierung", () => {
  it("verwendet Standardwerte ohne Aktivfilter", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[product], 1]);

    const response = await request(createApp())
      .get("/api/v1/products")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1
    });

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: {},
      skip: 0,
      take: 10,
      orderBy: [
        { name: "asc" },
        { id: "asc" }
      ]
    });
  });

  it("kombiniert Suche, active=false und Paginierung", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 7]);

    const response = await request(createApp())
      .get("/api/v1/products?search=tasse&active=false&page=2&limit=5")
      .set("Authorization", `Bearer ${token}`);

    const where = {
      active: false,
      OR: [
        { sku: { contains: "tasse", mode: "insensitive" } },
        { name: { contains: "tasse", mode: "insensitive" } },
        { description: { contains: "tasse", mode: "insensitive" } }
      ]
    };

    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 7,
      totalPages: 2
    });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        skip: 5,
        take: 5
      })
    );

    expect(prisma.product.count).toHaveBeenCalledWith({ where });
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Array),
      { isolationLevel: "RepeatableRead" }
    );
  });

  it.each([
    "active=yes",
    "page=0",
    "limit=101"
  ])("verweigert den Parameter %s", async (query) => {
    const response = await request(createApp())
      .get(`/api/v1/products?${query}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("Produkte aktualisieren", () => {
  it("erlaubt EMPLOYEE eine Preisänderung", async () => {
    vi.mocked(prisma.product.update).mockResolvedValue({
      ...product,
      priceCents: 2199
    });

    const response = await request(createApp())
      .patch(`/api/v1/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ priceCents: 2199 });

    expect(response.status).toBe(200);
    expect(response.body.data.priceCents).toBe(2199);
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { priceCents: 2199 }
    });
  });

  it("verweigert ein leeres Update", async () => {
    const response = await request(createApp())
      .patch(`/api/v1/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it("liefert HTTP 409 bei einer bereits vergebenen SKU", async () => {
    vi.mocked(prisma.product.update).mockRejectedValue(
      databaseError("P2002")
    );

    const response = await request(createApp())
      .patch(`/api/v1/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ sku: "OTHER-001" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("PRODUCT_SKU_EXISTS");
  });

  it("liefert HTTP 404 beim Update eines fehlenden Produkts", async () => {
    vi.mocked(prisma.product.update).mockRejectedValue(
      databaseError("P2025")
    );

    const response = await request(createApp())
      .patch(`/api/v1/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Neue Bezeichnung" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("verweigert EMPLOYEE eine Änderung des Aktivstatus", async () => {
    const response = await request(createApp())
      .patch(`/api/v1/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ active: false });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it("erlaubt ADMIN die Aktivierung eines Produkts", async () => {
    useAdmin();
    vi.mocked(prisma.product.update).mockResolvedValue(product);

    const response = await request(createApp())
      .patch(`/api/v1/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ active: true });

    expect(response.status).toBe(200);
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { active: true }
    });
  });
});

describe("Produkte deaktivieren", () => {
  it("verweigert EMPLOYEE die Deaktivierung", async () => {
    const response = await request(createApp())
      .delete(`/api/v1/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(prisma.product.update).not.toHaveBeenCalled();
    expect(prisma.product.delete).not.toHaveBeenCalled();
  });

  it("deaktiviert als ADMIN ohne den Datensatz zu löschen", async () => {
    useAdmin();
    vi.mocked(prisma.product.update).mockResolvedValue({
      ...product,
      active: false
    });

    const response = await request(createApp())
      .delete(`/api/v1/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { active: false }
    });
    expect(prisma.product.delete).not.toHaveBeenCalled();
  });

  it("liefert HTTP 404 bei einem fehlenden Produkt", async () => {
    useAdmin();
    vi.mocked(prisma.product.update).mockRejectedValue(
      databaseError("P2025")
    );

    const response = await request(createApp())
      .delete(`/api/v1/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PRODUCT_NOT_FOUND");
  });
});