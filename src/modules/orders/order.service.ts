import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type { CreateOrderInput } from "./order.schema.js";

export async function createOrder(input: CreateOrderInput) {
  const sortedItems = [...input.items].sort((a, b) =>
    a.productId.toLowerCase().localeCompare(b.productId.toLowerCase())
  );

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const customer = await transaction.customer.findUnique({
            where: { id: input.customerId },
            select: { id: true }
          });

          if (!customer) {
            throw new AppError(
              404,
              "CUSTOMER_NOT_FOUND",
              "Kunde nicht gefunden."
            );
          }

          const products = await transaction.product.findMany({
            where: {
              id: {
                in: sortedItems.map((item) => item.productId)
              }
            }
          });

          const productsById = new Map(
            products.map((product) => [
              product.id.toLowerCase(),
              product
            ])
          );

          const orderItems = sortedItems.map((item) => {
            const product = productsById.get(
              item.productId.toLowerCase()
            );

            if (!product) {
              throw new AppError(
                404,
                "PRODUCT_NOT_FOUND",
                "Mindestens ein Produkt wurde nicht gefunden."
              );
            }

            if (!product.active) {
              throw new AppError(
                409,
                "PRODUCT_INACTIVE",
                "Deaktivierte Produkte können nicht bestellt werden."
              );
            }

            if (product.stock < item.quantity) {
              throw new AppError(
                409,
                "INSUFFICIENT_STOCK",
                "Der Lagerbestand reicht für die Bestellung nicht aus."
              );
            }

            return {
              productId: product.id,
              quantity: item.quantity,
              unitPriceCents: product.priceCents
            };
          });

          for (const item of orderItems) {
            const result = await transaction.product.updateMany({
              where: {
                id: item.productId,
                active: true,
                stock: { gte: item.quantity }
              },
              data: {
                stock: { decrement: item.quantity }
              }
            });

            if (result.count !== 1) {
              throw new AppError(
                409,
                "INSUFFICIENT_STOCK",
                "Das Produkt ist nicht mehr in ausreichender Menge verfügbar."
              );
            }
          }

          const order = await transaction.order.create({
            data: {
              customerId: customer.id,
              items: {
                create: orderItems
              }
            },
            include: {
              items: true
            }
          });

          const totalCents = order.items.reduce(
            (total, item) =>
              total + item.quantity * item.unitPriceCents,
            0
          );

          return {
            ...order,
            totalCents
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000
        }
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        if (attempt < 2) {
          continue;
        }

        throw new AppError(
          409,
          "ORDER_CONFLICT",
          "Gleichzeitige Änderungen. Bitte die Bestellung erneut versuchen."
        );
      }

      throw error;
    }
  }

  throw new AppError(
    409,
    "ORDER_CONFLICT",
    "Die Bestellung konnte nicht abgeschlossen werden."
  );
}