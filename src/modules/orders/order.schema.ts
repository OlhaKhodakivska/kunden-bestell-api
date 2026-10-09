import { OrderStatus } from "@prisma/client";
import { z } from "zod";

const orderItemSchema = z
  .object({
    productId: z.string().uuid(),

    quantity: z
      .number()
      .int()
      .min(1)
      .max(1000)
  })
  .strict();

export const createOrderSchema = z
  .object({
    customerId: z.string().uuid(),

    items: z
      .array(orderItemSchema)
      .min(1)
      .max(100)
  })
  .strict()
  .superRefine((order, context) => {
    const seenProducts = new Set<string>();

    order.items.forEach((item, index) => {
      const productId = item.productId.toLowerCase();

      if (seenProducts.has(productId)) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "productId"],
          message: "Ein Produkt darf nur einmal pro Bestellung vorkommen."
        });
      }

      seenProducts.add(productId);
    });
  });

const positiveIntegerQuery = z
  .string()
  .regex(/^[1-9]\d*$/, "Eine positive ganze Zahl ist erforderlich.")
  .transform(Number)
  .pipe(z.number().int().max(Number.MAX_SAFE_INTEGER));

export const listOrdersSchema = z
  .object({
    customerId: z.string().uuid().optional(),

    status: z.enum(OrderStatus).optional(),

    page: positiveIntegerQuery
      .pipe(z.number().max(100000))
      .default(1),

    limit: positiveIntegerQuery
      .pipe(z.number().max(100))
      .default(10)
  })
  .strict();

export const updateOrderStatusSchema = z
  .object({
    status: z.enum(OrderStatus)
  })
  .strict();

export const orderIdSchema = z.string().uuid();

export type CreateOrderInput = z.infer<
  typeof createOrderSchema
>;

export type ListOrdersInput = z.infer<
  typeof listOrdersSchema
>;

export type UpdateOrderStatusInput = z.infer<
  typeof updateOrderStatusSchema
>;