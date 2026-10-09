import { Role } from "@prisma/client";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  runTransaction: vi.fn(),
  orderFindUnique: vi.fn(),
  orderFindMany: vi.fn(),
  orderCount: vi.fn()
}));

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique
    },
    order: {
      findUnique: mocks.orderFindUnique,
      findMany: mocks.orderFindMany,
      count: mocks.orderCount
    },
    $transaction: mocks.runTransaction
  }
}));

import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";

const userId = "e8426100-6a7b-4cd5-8ac6-71556a8ad1bf";
const customerId = "3d6fa886-91f3-4223-a848-78d29a3880fa";
const orderId = "82847102-6413-46ca-aae5-6ddd11dc8ceb";

const order = {
  id: orderId,
  customerId,
  status: "PENDING",
  createdAt: new Date(),
  updatedAt: new Date(),
  customer: {
    id: customerId,
    firstName: "Anna",
    lastName: "Beispiel"
  },
  items: [
    {
      productId: "005b0c6e-1474-463d-98da-d686d265d237",
      quantity: 2,
      unitPriceCents: 2199
    },
    {
      productId: "1ee2df7a-2d07-48f4-a9a1-50de72791b8c",
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
});

describe("Bestelldetails", () => {
  it("liefert die Bestellung mit der Summe gespeicherter Positionspreise", async () => {
    mocks.orderFindUnique.mockResolvedValue(order);

    const response = await request(createApp())
      .get(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.totalCents).toBe(5898);
    expect(response.body.data.customer.id).toBe(customerId);

    expect(mocks.orderFindUnique).toHaveBeenCalledWith({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true
              }
            }
          }
        }
      }
    });
  });

  it("liefert HTTP 404 bei einer fehlenden Bestellung", async () => {
    mocks.orderFindUnique.mockResolvedValue(null);

    const response = await request(createApp())
      .get(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("ORDER_NOT_FOUND");
  });

  it("verweigert eine ungültige UUID", async () => {
    const response = await request(createApp())
      .get("/api/v1/orders/keine-uuid")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(mocks.orderFindUnique).not.toHaveBeenCalled();
  });
});

describe("Bestellliste", () => {
  it("verwendet Standardwerte und ergänzt die Bestellsumme", async () => {
    mocks.runTransaction.mockResolvedValue([[order], 1]);

    const response = await request(createApp())
      .get("/api/v1/orders")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data[0].totalCents).toBe(5898);
    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1
    });

    expect(mocks.orderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        skip: 0,
        take: 10,
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" }
        ]
      })
    );
  });

  it("kombiniert Kundenfilter, Status und Paginierung", async () => {
    mocks.runTransaction.mockResolvedValue([[], 7]);

    const response = await request(createApp())
      .get(
        `/api/v1/orders?customerId=${customerId}&status=CONFIRMED&page=2&limit=5`
      )
      .set("Authorization", `Bearer ${token}`);

    const where = {
      customerId,
      status: "CONFIRMED"
    };

    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 7,
      totalPages: 2
    });

    expect(mocks.orderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        skip: 5,
        take: 5
      })
    );

    expect(mocks.orderCount).toHaveBeenCalledWith({ where });
    expect(mocks.runTransaction).toHaveBeenCalledWith(
      expect.any(Array),
      { isolationLevel: "RepeatableRead" }
    );
  });

  it.each([
    "status=UNKNOWN",
    "limit=101"
  ])("verweigert ungültige Parameter: %s", async (query) => {
    const response = await request(createApp())
      .get(`/api/v1/orders?${query}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });
});