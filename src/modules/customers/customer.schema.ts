import { z } from "zod";

export const createCustomerSchema = z
  .object({
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
      .optional()
  })
  .strict();

export const customerIdSchema = z.string().uuid();

export type CreateCustomerInput = z.infer<
  typeof createCustomerSchema
>;