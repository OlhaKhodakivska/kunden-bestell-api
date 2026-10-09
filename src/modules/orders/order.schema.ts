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

export const orderIdSchema = z.string().uuid();

export type CreateOrderInput = z.infer<
  typeof createOrderSchema
>;