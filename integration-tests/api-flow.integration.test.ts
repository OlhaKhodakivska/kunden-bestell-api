import { randomUUID } from "node:crypto";
import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it
} from "vitest";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { prisma } from "../src/lib/prisma.js";

const databaseUrl = new URL(env.DATABASE_URL);

if (
  env.NODE_ENV !== "test" ||
  databaseUrl.pathname !== "/kunden_bestell_api_test" ||
  !["localhost", "127.0.0.1"].includes(databaseUrl.hostname)
) {
  throw new Error("Eine lokale Testdatenbank ist erforderlich.");
}

const app = createApp();

const employeeId = randomUUID();
const adminId = randomUUID();
const employeeEmail = `${employeeId}@example.com`;
const adminEmail = `${adminId}@example.com`;
const password = "integration-password-12345";

const customerEmail = `flow-${randomUUID()}@example.com`;
const productSku = `FLOW-${randomUUID()}`.toUpperCase();

let employeeToken = "";
let adminToken = "";

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.createMany({
    data: [
      {
        id: employeeId,
        email: employeeEmail,
        passwordHash,
        role: Role.EMPLOYEE
      },
      {
        id: adminId,
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN
      }
    ]
  });

  const employeeLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: employeeEmail,
      password
    });

  expect(employeeLogin.status).toBe(200);
  expect(employeeLogin.body.data.user.role).toBe("EMPLOYEE");
  expect(employeeLogin.body.data.user).not.toHaveProperty("passwordHash");
  employeeToken = employeeLogin.body.data.accessToken;

  const adminLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: adminEmail,
      password
    });

  expect(adminLogin.status).toBe(200);
  expect(adminLogin.body.data.user.role).toBe("ADMIN");
  adminToken = adminLogin.body.data.accessToken;
});

afterEach(async () => {
  const customers = await prisma.customer.findMany({
    where: { email: customerEmail },
    select: { id: true }
  });

  await prisma.order.deleteMany({
    where: {
      customerId: {
        in: customers.map((customer) => customer.id)
      }
    }
  });

  await prisma.product.deleteMany({
    where: { sku: productSku }
  });

  await prisma.customer.deleteMany({
    where: { email: customerEmail }
  });
});

afterAll(async () => {
  try {
    await prisma.user.deleteMany({
      where: {
        id: { in: [employeeId, adminId] }
      }
    });
  } finally {
    await prisma.$disconnect();
  }
});

async function createFixtures() {
  const customerResponse = await request(app)
    .post("/api/v1/customers")
    .set("Authorization", `Bearer ${employeeToken}`)
    .send({
      email: customerEmail,
      firstName: "HTTP",
      lastName: "Integration"
    });

  expect(customerResponse.status).toBe(201);

  const productResponse = await request(app)
    .post("/api/v1/products")
    .set("Authorization", `Bearer ${employeeToken}`)
    .send({
      sku: productSku,
      name: "HTTP-Testprodukt",
      priceCents: 1999,
      stock: 5
    });

  expect(productResponse.status).toBe(201);

  return {
    customerId: customerResponse.body.data.id as string,
    productId: productResponse.body.data.id as string
  };
}

describe("Vollständiger HTTP-Ablauf mit PostgreSQL", () => {
  it("erstellt, bestätigt und storniert eine Bestellung mit stabilen Preisen", async () => {
    const { customerId, productId } = await createFixtures();

    const created = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        customerId,
        items: [{ productId, quantity: 2 }]
      });

    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe("PENDING");
    expect(created.body.data.totalCents).toBe(3998);

    const orderId = created.body.data.id;

    expect(created.headers.location).toBe(
      `/api/v1/orders/${orderId}`
    );

    const productAfterOrder = await request(app)
      .get(`/api/v1/products/${productId}`)
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(productAfterOrder.status).toBe(200);
    expect(productAfterOrder.body.data.stock).toBe(3);

    const changedPrice = await request(app)
      .patch(`/api/v1/products/${productId}`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ priceCents: 2999 });

    expect(changedPrice.status).toBe(200);

    const details = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(details.status).toBe(200);
    expect(details.body.data.totalCents).toBe(3998);
    expect(details.body.data.items[0].unitPriceCents).toBe(1999);
    expect(details.body.data.customer.id).toBe(customerId);

    const confirmed = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ status: "CONFIRMED" });

    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.status).toBe("CONFIRMED");

    const forbidden = await request(app)
      .delete(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(forbidden.status).toBe(403);

    const cancelled = await request(app)
      .delete(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(cancelled.status).toBe(204);

    const repeated = await request(app)
      .delete(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(repeated.status).toBe(204);

    const productAfterCancellation = await request(app)
      .get(`/api/v1/products/${productId}`)
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(productAfterCancellation.status).toBe(200);
    expect(productAfterCancellation.body.data.stock).toBe(5);

    const storedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true }
    });

    expect(storedOrder.status).toBe("CANCELLED");
    expect(storedOrder.items).toHaveLength(1);
    expect(storedOrder.items[0]?.unitPriceCents).toBe(1999);

    const deleteCustomer = await request(app)
      .delete(`/api/v1/customers/${customerId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(deleteCustomer.status).toBe(409);
    expect(deleteCustomer.body.error.code).toBe("CUSTOMER_HAS_ORDERS");
  });
});

describe("HTTP-Fehlerfälle mit PostgreSQL", () => {
  it("verweigert einen falschen Login und gibt keine internen Details zurück", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: employeeEmail,
        password: "wrong-password"
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "E-Mail oder Passwort ist falsch."
      }
    });
  });

  it("verweigert das Erstellen einer Bestellung ohne Token", async () => {
    const { customerId, productId } = await createFixtures();

    const response = await request(app)
      .post("/api/v1/orders")
      .send({
        customerId,
        items: [{ productId, quantity: 1 }]
      });

    expect(response.status).toBe(401);

    expect(
      await prisma.order.count({ where: { customerId } })
    ).toBe(0);

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId }
    });

    expect(product.stock).toBe(5);
  });

  it("verweigert doppelte Kunden-E-Mails und Produkt-SKU", async () => {
    await createFixtures();

    const duplicateCustomer = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        email: customerEmail,
        firstName: "Duplicate",
        lastName: "Customer"
      });

    expect(duplicateCustomer.status).toBe(409);
    expect(duplicateCustomer.body.error.code).toBe(
      "CUSTOMER_EMAIL_EXISTS"
    );

    const duplicateProduct = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        sku: productSku,
        name: "Duplicate Product",
        priceCents: 100
      });

    expect(duplicateProduct.status).toBe(409);
    expect(duplicateProduct.body.error.code).toBe(
      "PRODUCT_SKU_EXISTS"
    );

    expect(
      await prisma.customer.count({
        where: { email: customerEmail }
      })
    ).toBe(1);

    expect(
      await prisma.product.count({
        where: { sku: productSku }
      })
    ).toBe(1);
  });

  it("verweigert eine zu große Bestellmenge ohne Datenänderung", async () => {
    const { customerId, productId } = await createFixtures();

    const response = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        customerId,
        items: [{ productId, quantity: 6 }]
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INSUFFICIENT_STOCK");

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId }
    });

    expect(product.stock).toBe(5);

    expect(
      await prisma.order.count({ where: { customerId } })
    ).toBe(0);
  });

  it("verweigert EMPLOYEE das Löschen eines Kunden", async () => {
    const { customerId } = await createFixtures();

    const response = await request(app)
      .delete(`/api/v1/customers/${customerId}`)
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(response.status).toBe(403);

    expect(
      await prisma.customer.findUnique({
        where: { id: customerId }
      })
    ).not.toBeNull();
  });

  it("verweigert ungültige Bestelldaten vor dem Speichern", async () => {
    const { customerId, productId } = await createFixtures();

    const response = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        customerId,
        items: [{ productId, quantity: 0 }]
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");

    expect(
      await prisma.order.count({ where: { customerId } })
    ).toBe(0);

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId }
    });

    expect(product.stock).toBe(5);
  });
});
