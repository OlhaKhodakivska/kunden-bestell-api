import { OrderStatus, Prisma } from "@prisma/client";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type {
  CreateOrderInput,
  ListOrdersInput
} from "./order.schema.js";

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

function addOrderTotal<
  T extends {
    items: Array<{
      quantity: number;
      unitPriceCents: number;
    }>;
  }
>(order: T) {
  return {
    ...order,
    totalCents: order.items.reduce(
      (total, item) =>
        total + item.quantity * item.unitPriceCents,
      0
    )
  };
}

export async function getOrderById(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
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

  if (!order) {
    throw new AppError(
      404,
      "ORDER_NOT_FOUND",
      "Bestellung nicht gefunden."
    );
  }

  return addOrderTotal(order);
}

export async function listOrders(input: ListOrdersInput) {
  const { customerId, status, page, limit } = input;

  const where: Prisma.OrderWhereInput = {};

  if (customerId !== undefined) {
    where.customerId = customerId;
  }

  if (status !== undefined) {
    where.status = status;
  }

  const [orders, total] = await prisma.$transaction(
    [
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" }
        ],
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          items: true
        }
      }),
      prisma.order.count({ where })
    ],
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead
    }
  );

  return {
    data: orders.map((order) => addOrderTotal(order)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [
    OrderStatus.CONFIRMED,
    OrderStatus.CANCELLED
  ],
  CONFIRMED: [
    OrderStatus.SHIPPED,
    OrderStatus.CANCELLED
  ],
  SHIPPED: [],
  CANCELLED: []
};

export async function updateOrderStatus(
  id: string,
  targetStatus: OrderStatus
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const order = await transaction.order.findUnique({
            where: { id },
            include: { items: true }
          });

          if (!order) {
            throw new AppError(
              404,
              "ORDER_NOT_FOUND",
              "Bestellung nicht gefunden."
            );
          }

          if (order.status === targetStatus) {
            return addOrderTotal(order);
          }

          if (!allowedTransitions[order.status].includes(targetStatus)) {
            throw new AppError(
              409,
              "INVALID_STATUS_TRANSITION",
              "Dieser Statuswechsel ist nicht erlaubt."
            );
          }

          const updated = await transaction.order.updateMany({
            where: {
              id,
              status: order.status
            },
            data: {
              status: targetStatus
            }
          });

          if (updated.count !== 1) {
            throw new AppError(
              409,
              "ORDER_CONFLICT",
              "Der Bestellstatus wurde gleichzeitig geändert."
            );
          }

          if (targetStatus === OrderStatus.CANCELLED) {
            const sortedItems = [...order.items].sort((a, b) =>
              a.productId.localeCompare(b.productId)
            );

            for (const item of sortedItems) {
              const restored = await transaction.product.updateMany({
                where: {
                  id: item.productId,
                  stock: {
                    lte: 2147483647 - item.quantity
                  }
                },
                data: {
                  stock: {
                    increment: item.quantity
                  }
                }
              });

              if (restored.count !== 1) {
                throw new AppError(
                  409,
                  "STOCK_LIMIT_EXCEEDED",
                  "Der Lagerbestand kann nicht sicher wiederhergestellt werden."
                );
              }
            }
          }

          const result = await transaction.order.findUniqueOrThrow({
            where: { id },
            include: { items: true }
          });

          return addOrderTotal(result);
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
          "Gleichzeitige Änderungen. Bitte erneut versuchen."
        );
      }

      throw error;
    }
  }

  throw new AppError(
    409,
    "ORDER_CONFLICT",
    "Der Bestellstatus konnte nicht geändert werden."
  );
}