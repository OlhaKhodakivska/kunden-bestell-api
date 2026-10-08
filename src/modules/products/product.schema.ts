import { z } from "zod";

const maxDatabaseInteger = 2147483647;

const productFields = {
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
    .max(2000),

  priceCents: z
    .number()
    .int()
    .min(1)
    .max(maxDatabaseInteger),

  stock: z
    .number()
    .int()
    .min(0)
    .max(maxDatabaseInteger),

  active: z.boolean()
};

export const createProductSchema = z
  .object({
    ...productFields,
    description: productFields.description.optional(),
    stock: productFields.stock.default(0),
    active: productFields.active.default(true)
  })
  .strict();

export const updateProductSchema = z
  .object({
    sku: productFields.sku.optional(),
    name: productFields.name.optional(),
    description: productFields.description.nullable().optional(),
    priceCents: productFields.priceCents.optional(),
    stock: productFields.stock.optional(),
    active: productFields.active.optional()
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "Mindestens ein Feld muss angegeben werden."
  );

const positiveIntegerQuery = z
  .string()
  .regex(/^[1-9]\d*$/, "Eine positive ganze Zahl ist erforderlich.")
  .transform(Number)
  .pipe(z.number().int().max(Number.MAX_SAFE_INTEGER));

export const listProductsSchema = z
  .object({
    search: z.string().trim().min(1).max(100).optional(),

    active: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),

    page: positiveIntegerQuery
      .pipe(z.number().max(100000))
      .default(1),

    limit: positiveIntegerQuery
      .pipe(z.number().max(100))
      .default(10)
  })
  .strict();

export const productIdSchema = z.string().uuid();

export type CreateProductInput = z.infer<
  typeof createProductSchema
>;

export type UpdateProductInput = z.infer<
  typeof updateProductSchema
>;

export type ListProductsInput = z.infer<
  typeof listProductsSchema
>;