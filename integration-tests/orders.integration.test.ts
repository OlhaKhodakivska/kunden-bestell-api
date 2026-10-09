import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it
} from "vitest";
import { env } from "../src/config/env.js";
import { prisma } from "../src/lib/prisma.js";
import { createOrder } from "../src/modules/orders/order.service.js";

const databaseUrl = new URL(env.DATABASE_URL);

if (
  env.NODE_ENV !== "test" ||
  databaseUrl.pathname !== "/kunden_bestell_api_test" ||
  !["localhost", "127.0.0.1"].includes(databaseUrl.hostname)
) {
  throw new Error("Eine lokale Testdatenbank ist erforderlich.");
}

let customerId = "";
let cupId = "";
let plateId = "";

beforeEach(async () => {
  customerId = randomUUID();
  cupId = randomUUID();
  plateId = randomUUID();

  await prisma.customer.create({
    data: {
      id: customerId,
      email: `${customerId}@example.com`,
      firstName: "Integration",
      lastName: "Test"
    }
  });

  await prisma.product.createMany({
    data: [
      {
        id: cupId,
        sku: `TEST-CUP-${cupId}`,
        name: "Testtasse",
        priceCents: 2199,
        stock: 20
      },
      {
        id: plateId,
        sku: `TEST-PLATE-${plateId}`,
        name: "Testteller",
        priceCents: 1500,
        stock: 10
      }
    ]
  });
});

afterEach(async () => {
  if (customerId) {
    await prisma.order.deleteMany({
      where: { customerId }
    });
  }

  if (cupId && plateId) {
    await prisma.product.deleteMany({
      where: {
        id: { in: [cupId, plateId] }
      }
    });
  }

  if (customerId) {
    await prisma.customer.deleteMany({
      where: { id: customerId }
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Bestellungen mit echter PostgreSQL-Datenbank", () => {
  it("speichert Positionen, Preise und Lageränderungen", async () => {
    const order = await createOrder({
      customerId,
      items: [
        { productId: cupId, quantity: 2 },
        { productId: plateId, quantity: 1 }
      ]
    });

    expect(order.status).toBe("PENDING");
    expect(order.totalCents).toBe(5898);
    expect(order.items).toHaveLength(2);

    const storedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true }
    });

    expect(storedOrder.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId: cupId,
          quantity: 2,
          unitPriceCents: 2199
        }),
        expect.objectContaining({
          productId: plateId,
          quantity: 1,
          unitPriceCents: 1500
        })
      ])
    );

    const cup = await prisma.product.findUniqueOrThrow({
      where: { id: cupId }
    });

    const plate = await prisma.product.findUniqueOrThrow({
      where: { id: plateId }
    });

    expect(cup.stock).toBe(18);
    expect(plate.stock).toBe(9);
  });

  it("setzt Lageränderungen bei einem Fehler beim Speichern zurück", async () => {
    const constraintName =
      `rollback_${randomUUID().replace(/-/g, "")}`;

    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Order"
       ADD CONSTRAINT "${constraintName}"
       CHECK ("customerId" <> '${customerId}')`
    );

    try {
      await expect(
        createOrder({
          customerId,
          items: [
            { productId: cupId, quantity: 2 },
            { productId: plateId, quantity: 1 }
          ]
        })
      ).rejects.toThrow();

      const cup = await prisma.product.findUniqueOrThrow({
        where: { id: cupId }
      });

      const plate = await prisma.product.findUniqueOrThrow({
        where: { id: plateId }
      });

      expect(cup.stock).toBe(20);
      expect(plate.stock).toBe(10);

      expect(
        await prisma.order.count({
          where: { customerId }
        })
      ).toBe(0);

      expect(
        await prisma.orderItem.count({
          where: {
            productId: { in: [cupId, plateId] }
          }
        })
      ).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Order" DROP CONSTRAINT "${constraintName}"`
      );
    }
  });

  it("verkauft den letzten Artikel bei gleichzeitigen Bestellungen nur einmal", async () => {
    await prisma.product.update({
      where: { id: cupId },
      data: { stock: 1 }
    });

    const input = {
      customerId,
      items: [{ productId: cupId, quantity: 1 }]
    };

    const results = await Promise.allSettled([
      createOrder(input),
      createOrder(input)
    ]);

    const successful = results.filter(
      (result) => result.status === "fulfilled"
    );

    const failed = results.filter(
      (result) => result.status === "rejected"
    );

    expect(successful).toHaveLength(1);
    expect(failed).toHaveLength(1);

    for (const result of failed) {
      if (result.status === "rejected") {
        expect(result.reason.statusCode).toBe(409);
        expect([
          "INSUFFICIENT_STOCK",
          "ORDER_CONFLICT"
        ]).toContain(result.reason.code);
      }
    }

    const cup = await prisma.product.findUniqueOrThrow({
      where: { id: cupId }
    });

    expect(cup.stock).toBe(0);

    expect(
      await prisma.order.count({
        where: { customerId }
      })
    ).toBe(1);

    const positions = await prisma.orderItem.findMany({
      where: { productId: cupId }
    });

    expect(positions).toHaveLength(1);
    expect(positions[0]?.quantity).toBe(1);
  });
});