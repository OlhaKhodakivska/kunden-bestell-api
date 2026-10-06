import { z } from "zod";

const customerFields = {
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254),

  firstName: z
    .string()
    .trim()
    .min(1)
    .max(100),

  lastName: z
    .string()
    .trim()
    .min(1)
    .max(100),

  phone: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(
      /^\+?[0-9 ()-]+$/,
      "Die Telefonnummer enthält ungültige Zeichen."
    )
};

export const createCustomerSchema = z
  .object({
    ...customerFields,
    phone: customerFields.phone.optional()
  })
  .strict();

export const updateCustomerSchema = z
  .object({
    email: customerFields.email.optional(),
    firstName: customerFields.firstName.optional(),
    lastName: customerFields.lastName.optional(),
    phone: customerFields.phone.nullable().optional()
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

export const listCustomersSchema = z
  .object({
    search: z.string().trim().min(1).max(100).optional(),

    page: positiveIntegerQuery
      .pipe(z.number().max(100000))
      .default(1),

    limit: positiveIntegerQuery
      .pipe(z.number().max(100))
      .default(10)
  })
  .strict();

export const customerIdSchema = z.string().uuid();

export type CreateCustomerInput = z.infer<
  typeof createCustomerSchema
>;

export type UpdateCustomerInput = z.infer<
  typeof updateCustomerSchema
>;

export type ListCustomersInput = z.infer<
  typeof listCustomersSchema
>;