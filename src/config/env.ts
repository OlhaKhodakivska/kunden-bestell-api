import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(3000),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),

  JWT_EXPIRES_IN: z.string().default("1h"),

  CORS_ORIGIN: z.string().url()
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Ungültige Umgebungsvariablen:",
    result.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const env = result.data;