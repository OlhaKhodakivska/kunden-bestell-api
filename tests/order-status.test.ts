import { OrderStatus, Role } from "@prisma/client";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  runTransaction: vi.fn(),
  transaction: {
    order: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn()
    },
    product: {
      updateMany: vi.fn()
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
const orderId = "82847102-6413-46ca-aae5-6ddd11dc8ceb";
const cupId = "005b0c6e-1474-463d-98da-d686d265d237";
const plateId = "1ee2df7a-2d07-48f4-a9a1-50de72791b8c";

const order = {
  id: orderId,
  customerId: "3d6fa886-91f3-4223-a848-78d29a3880fa",
  status: OrderStatus.PENDING,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      productId: cupId,
      quantity: 2,
      unitPriceCents: 2199
    },
    {
      productId: plateId,
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

function useAdmin() {
  mocks.userFindUnique.mockResolvedValue({
    id: userId,
    email: "admin@example.com",
    role: Role.ADMIN
  });
}

function changeStatus(status: OrderStatus) {
  return request(createApp())
    .patch(`/api/v1/orders/${orderId}/status`)
    .set("Authorization", `Bearer ${token}`)
    .send({ status });
}

function cancelOrder() {
  return request(createApp())
    .delete(`/api/v1/orders/${orderId}`)
    .set("Authorization", `Bearer ${token}`);
}

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

  mocks.transaction.order.findUnique.mockResolvedValue(order);

  mocks.transaction.order.findUniqueOrThrow.mockResolvedValue({
    ...order,
    status: OrderStatus.CONFIRMED
  });

  mocks.transaction.order.updateMany.mockResolvedValue({ count: 1 });
  mocks.transaction.product.updateMany.mockResolvedValue({ count: 1 });
});

describe("Bestellstatus", () => {
  it.each([
    [OrderStatus.PENDING, OrderStatus.CONFIRMED],
    [OrderStatus.CONFIRMED, OrderStatus.SHIPPED]
  ])("erlaubt %s → %s", async (current, target) => {
    mocks.transaction.order.findUnique.mockResolvedValue({
      ...order,
      status: current
    });

    mocks.transaction.order.findUniqueOrThrow.mockResolvedValue({
      ...order,
      status: target
    });

    const response = await changeStatus(target);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(target);
    expect(response.body.data.totalCents).toBe(5898);

    expect(mocks.transaction.order.updateMany).toHaveBeenCalledWith({
      where: { id: orderId, status: current },
      data: { status: target }
    });

    expect(mocks.transaction.product.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    [OrderStatus.PENDING, OrderStatus.SHIPPED],
    [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    [OrderStatus.CANCELLED, OrderStatus.CONFIRMED]
  ])("verweigert %s → %s", async (current, target) => {
    useAdmin();

    mocks.transaction.order.findUnique.mockResolvedValue({
      ...order,
      status: current
    });

    const response = await changeStatus(target);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    expect(mocks.transaction.order.updateMany).not.toHaveBeenCalled();
    expect(mocks.transaction.product.updateMany).not.toHaveBeenCalled();
  });

  it("ändert bei wiederholter Stornierung weder Status noch Bestand", async () => {
    useAdmin();

    mocks.transaction.order.findUnique.mockResolvedValue({
      ...order,
      status: OrderStatus.CANCELLED
    });

    const response = await changeStatus(OrderStatus.CANCELLED);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("CANCELLED");
    expect(mocks.transaction.order.updateMany).not.toHaveBeenCalled();
    expect(mocks.transaction.product.updateMany).not.toHaveBeenCalled();
  });

  it("storniert als ADMIN und stellt beide Positionen wieder her", async () => {
    useAdmin();

    mocks.transaction.order.findUniqueOrThrow.mockResolvedValue({
      ...order,
      status: OrderStatus.CANCELLED
    });

    const response = await changeStatus(OrderStatus.CANCELLED);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("CANCELLED");

    expect(mocks.transaction.product.updateMany).toHaveBeenCalledTimes(2);
    expect(mocks.transaction.product.updateMany).toHaveBeenCalledWith({
      where: {
        id: cupId,
        stock: { lte: 2147483645 }
      },
      data: {
        stock: { increment: 2 }
      }
    });
  });

  it("verweigert EMPLOYEE die Stornierung über PATCH", async () => {
    const response = await changeStatus(OrderStatus.CANCELLED);

    expect(response.status).toBe(403);
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });

  it("verweigert EMPLOYEE die Stornierung über DELETE", async () => {
    const response = await cancelOrder();

    expect(response.status).toBe(403);
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });

  it("liefert als ADMIN beim Stornieren über DELETE HTTP 204", async () => {
    useAdmin();

    mocks.transaction.order.findUniqueOrThrow.mockResolvedValue({
      ...order,
      status: OrderStatus.CANCELLED
    });

    const response = await cancelOrder();

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(mocks.transaction.product.updateMany).toHaveBeenCalledTimes(2);
  });

  it("liefert HTTP 404 bei einer fehlenden Bestellung", async () => {
    mocks.transaction.order.findUnique.mockResolvedValue(null);

    const response = await changeStatus(OrderStatus.CONFIRMED);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("ORDER_NOT_FOUND");
    expect(mocks.transaction.order.updateMany).not.toHaveBeenCalled();
  });

  it("verweigert eine unsichere Wiederherstellung des Bestands", async () => {
    useAdmin();
    mocks.transaction.product.updateMany.mockResolvedValue({ count: 0 });

    const response = await changeStatus(OrderStatus.CANCELLED);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("STOCK_LIMIT_EXCEEDED");
    expect(
      mocks.transaction.order.findUniqueOrThrow
    ).not.toHaveBeenCalled();
  });

  it("erkennt eine gleichzeitig erfolgte Statusänderung", async () => {
    mocks.transaction.order.updateMany.mockResolvedValue({ count: 0 });

    const response = await changeStatus(OrderStatus.CONFIRMED);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ORDER_CONFLICT");
    expect(mocks.transaction.product.updateMany).not.toHaveBeenCalled();
  });
});