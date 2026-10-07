import { z } from "zod";

const maxDatabaseInteger = 2147483647;

export const createProductSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .min(1)
      .max(50)
      .regex(
        /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
        "Die SKU darf nur Buchstaben, Zahlen und trennende Bindestriche enthalten."
      ),

    name: z
      .string()
      .trim()
      .min(1)
      .max(150),

    description: z
      .string()
      .trim()
      .min(1)
      .max(2000)
      .optional(),

    priceCents: z
      .number()
      .int()
      .min(1)
      .max(maxDatabaseInteger),

    stock: z
      .number()
      .int()
      .min(0)
      .max(maxDatabaseInteger)
      .default(0),

    active: z.boolean().default(true)
  })
  .strict();

export const productIdSchema = z.string().uuid();

export type CreateProductInput = z.infer<
  typeof createProductSchema
>;