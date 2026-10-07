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
    product: {
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
  createdAt: new Date(),
  updatedAt: new Date()
};

const product = {
  id: "005b0c6e-1474-463d-98da-d686d265d237",
  sku: "TASSE-001",
  name: "Keramiktasse",
  description: null,
  priceCents: 1999,
  stock: 0,
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

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user);
});

describe("Produkte anlegen", () => {
  it("normalisiert Eingaben und verwendet Standardwerte", async () => {
    vi.mocked(prisma.product.create).mockResolvedValue(product);

    const response = await request(createApp())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        sku: " tasse-001 ",
        name: " Keramiktasse ",
        priceCents: 1999
      });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe(product.id);
    expect(response.headers.location).toBe(
      `/api/v1/products/${product.id}`
    );

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        sku: "TASSE-001",
        name: "Keramiktasse",
        priceCents: 1999,
        stock: 0,
        active: true
      }
    });
  });

  it("übernimmt Beschreibung, Lagerbestand und Aktivstatus", async () => {
    vi.mocked(prisma.product.create).mockResolvedValue({
      ...product,
      description: "Weiße Tasse",
      stock: 20,
      active: false
    });

    const response = await request(createApp())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        sku: product.sku,
        name: product.name,
        description: " Weiße Tasse ",
        priceCents: 1999,
        stock: 20,
        active: false
      });

    expect(response.status).toBe(201);
    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        sku: product.sku,
        name: product.name,
        description: "Weiße Tasse",
        priceCents: 1999,
        stock: 20,
        active: false
      }
    });
  });

  it("liefert HTTP 409 bei einer doppelten SKU", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "6.12.0",
        meta: { target: ["sku"] }
      }
    );

    vi.mocked(prisma.product.create).mockRejectedValue(conflict);

    const response = await request(createApp())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        sku: product.sku,
        name: product.name,
        priceCents: product.priceCents
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("PRODUCT_SKU_EXISTS");
  });

  it.each([
    { field: "priceCents", value: -1 },
    { field: "priceCents", value: 19.99 },
    { field: "stock", value: -1 },
    { field: "sku", value: "SKU MIT LEERZEICHEN" }
  ])("verweigert $field mit dem Wert $value", async ({ field, value }) => {
    const response = await request(createApp())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        sku: product.sku,
        name: product.name,
        priceCents: product.priceCents,
        stock: 0,
        [field]: value
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it("verweigert das Anlegen ohne Token", async () => {
    const response = await request(createApp())
      .post("/api/v1/products")
      .send({
        sku: product.sku,
        name: product.name,
        priceCents: product.priceCents
      });

    expect(response.status).toBe(401);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });
});

describe("Produkte abrufen", () => {
  it("liefert ein vorhandenes Produkt", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(product);

    const response = await request(createApp())
      .get(`/api/v1/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.sku).toBe(product.sku);
    expect(prisma.product.findUnique).toHaveBeenCalledWith({
      where: { id: product.id }
    });
  });

  it("liefert HTTP 404 für ein fehlendes Produkt", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

    const response = await request(createApp())
      .get(`/api/v1/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("verweigert eine ungültige Produkt-ID", async () => {
    const response = await request(createApp())
      .get("/api/v1/products/keine-uuid")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(prisma.product.findUnique).not.toHaveBeenCalled();
  });

  it("verweigert das Abrufen ohne Token", async () => {
    const response = await request(createApp())
      .get(`/api/v1/products/${product.id}`);

    expect(response.status).toBe(401);
    expect(prisma.product.findUnique).not.toHaveBeenCalled();
  });
});