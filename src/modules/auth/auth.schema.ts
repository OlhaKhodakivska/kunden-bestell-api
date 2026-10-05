import { z } from "zod";

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z
      .string()
      .min(1)
      .refine(
        (password) => Buffer.byteLength(password, "utf8") <= 72,
        "Das Passwort darf höchstens 72 Bytes enthalten."
      )
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;