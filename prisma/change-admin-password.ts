import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const configSchema = z.object({
  SEED_ADMIN_EMAIL: z.string().trim().toLowerCase().email(),
  SEED_ADMIN_PASSWORD: z
    .string()
    .min(12)
    .refine(
      (password) => Buffer.byteLength(password, "utf8") <= 72,
      "Das Passwort darf höchstens 72 Bytes enthalten."
    )
});

async function main() {
  const config = configSchema.safeParse(process.env);

  if (!config.success) {
    throw new Error("Ungültige Konfiguration.");
  }

  const user = await prisma.user.findUnique({
    where: { email: config.data.SEED_ADMIN_EMAIL }
  });

  if (!user || user.role !== "ADMIN") {
    throw new Error("Administrator nicht gefunden.");
  }

  const passwordHash = await bcrypt.hash(
    config.data.SEED_ADMIN_PASSWORD,
    12
  );

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash }
  });

  console.log("Administrator-Passwort erfolgreich geändert.");
}

main()
  .catch(() => {
    console.error(
      "Passwortänderung fehlgeschlagen. Konfiguration und Datenbank prüfen."
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });