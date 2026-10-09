import { Role } from "@prisma/client";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  runTransaction: vi.fn(),
  transaction: {
    customer: {
      findUnique: vi.fn()
    },
    product: {
      findMany: vi.fn(),
      updateMany: vi.fn()
    },
    order: {
      create: vi.fn()
    }
  }
}));

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique
    },
    $transaction: mocks.runTransaction
  }
}));

import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";

const userId = "e8426100-6a7b-4cd5-8ac6-71556a8ad1bf";
const customerId = "3d6fa886-91f3-4223-a848-78d29a3880fa";

const cup = {
  id: "005b0c6e-1474-463d-98da-d686d265d237",
  priceCents: 2199,
  stock: 20,
  active: true
};

const plate = {
  id: "1ee2df7a-2d07-48f4-a9a1-50de72791b8c",
  priceCents: 1500,
  stock: 10,
  active: true
};

const input = {
  customerId,
  items: [
    { productId: cup.id, quantity: 2 },
    { productId: plate.id, quantity: 1 }
  ]
};

const savedOrder = {
  id: "82847102-6413-46ca-aae5-6ddd11dc8ceb",
  customerId,
  status: "PENDING",
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      productId: cup.id,
      quantity: 2,
      unitPriceCents: 2199
    },
    {
      productId: plate.id,
      quantity: 1,
      unitPriceCents: 1500
    }
  ]
};

const token = jwt.sign(
  { role: Role.EMPLOYEE },
  env.JWT_SECRET,
  {
    subject: userId,
    expiresIn: "1h",
    algorithm: "HS256"
  }
);

beforeEach(() => {
  vi.resetAllMocks();

  mocks.userFindUnique.mockResolvedValue({
    id: userId,
    email: "employee@example.com",
    role: Role.EMPLOYEE
  });

  mocks.runTransaction.mockImplementation(
    async (
      callback: (
        transaction: typeof mocks.transaction
      ) => Promise<unknown>
    ) => callback(mocks.transaction)
  );

  mocks.transaction.customer.findUnique.mockResolvedValue({
    id: customerId
  });

  mocks.transaction.product.findMany.mockResolvedValue([cup, plate]);
  mocks.transaction.product.updateMany.mockResolvedValue({ count: 1 });
  mocks.transaction.order.create.mockResolvedValue(savedOrder);
});

describe("Bestellungen erstellen", () => {
  it("speichert zwei Positionen mit Datenbankpreisen und reduziert den Bestand", async () => {
    const response = await request(createApp())
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${token}`)
      .send(input);

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe("PENDING");
    expect(response.body.data.totalCents).toBe(5898);
    expect(response.body.data.items).toHaveLength(2);

    expect(mocks.transaction.order.create).toHaveBeenCalledWith({
      data: {
        customerId,
        items: {
          create: [
            {
              productId: cup.id,
              quantity: 2,
              unitPriceCents: 2199
            },
            {
              productId: plate.id,
              quantity: 1,
              unitPriceCents: 1500
            }
          ]
        }
      },
      include: { items: true }
    });

    expect(mocks.transaction.product.updateMany).toHaveBeenCalledTimes(2);

    expect(mocks.transaction.product.updateMany).toHaveBeenCalledWith({
      where: {
        id: cup.id,
        active: true,
        stock: { gte: 2 }
      },
      data: {
        stock: { decrement: 2 }
      }
    });

    expect(mocks.runTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      {
        isolationLevel: "Serializable",
        maxWait: 5000,
        timeout: 10000
      }
    );
  });

  it("verweigert eine leere Bestellung", async () => {
    const response = await request(createApp())
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ customerId, items: [] });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });

  it("verweigert doppelte Produkte", async () => {
    const response = await request(createApp())
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerId,
        items: [
          { productId: cup.id, quantity: 1 },
          { productId: cup.id, quantity: 2 }
        ]
      });

    expect(response.status).toBe(400);
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });

  it.each([0, 1.5])(
    "verweigert die ungültige Menge %s",
    async (quantity) => {
      const response = await request(createApp())
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({
          customerId,
          items: [{ productId: cup.id, quantity }]
        });

      expect(response.status).toBe(400);
      expect(mocks.runTransaction).not.toHaveBeenCalled();
    }
  );

  it("verweigert eine Bestellung ohne Token", async () => {
    const response = await request(createApp())
      .post("/api/v1/orders")
      .send(input);

    expect(response.status).toBe(401);
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });

  it("liefert HTTP 404 bei einem fehlenden Kunden", async () => {
    mocks.transaction.customer.findUnique.mockResolvedValue(null);

    const response = await request(createApp())
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${token}`)
      .send(input);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("CUSTOMER_NOT_FOUND");
    expect(mocks.transaction.product.updateMany).not.toHaveBeenCalled();
    expect(mocks.transaction.order.create).not.toHaveBeenCalled();
  });

  it("liefert HTTP 404 bei einem fehlenden Produkt", async () => {
    mocks.transaction.product.findMany.mockResolvedValue([cup]);

    const response = await request(createApp())
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${token}`)
      .send(input);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PRODUCT_NOT_FOUND");
    expect(mocks.transaction.product.updateMany).not.toHaveBeenCalled();
    expect(mocks.transaction.order.create).not.toHaveBeenCalled();
  });

  it("verweigert deaktivierte Produkte", async () => {
    mocks.transaction.product.findMany.mockResolvedValue([
      { ...cup, active: false },
      plate
    ]);

    const response = await request(createApp())
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${token}`)
      .send(input);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("PRODUCT_INACTIVE");
    expect(mocks.transaction.product.updateMany).not.toHaveBeenCalled();
    expect(mocks.transaction.order.create).not.toHaveBeenCalled();
  });

  it("verweigert eine Bestellung bei unzureichendem Bestand", async () => {
    mocks.transaction.product.findMany.mockResolvedValue([
      { ...cup, stock: 1 },
      plate
    ]);

    const response = await request(createApp())
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${token}`)
      .send(input);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INSUFFICIENT_STOCK");
    expect(mocks.transaction.product.updateMany).not.toHaveBeenCalled();
    expect(mocks.transaction.order.create).not.toHaveBeenCalled();
  });
});

    const response = await request(createApp())
      .post("/api/v1/orders")
