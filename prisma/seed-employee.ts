import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient, Role } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const configSchema = z.object({
  SEED_EMPLOYEE_EMAIL: z.string().trim().toLowerCase().email(),
  SEED_EMPLOYEE_PASSWORD: z
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

  const email = config.data.SEED_EMPLOYEE_EMAIL;

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    console.log("Benutzer existiert bereits. Keine Änderungen vorgenommen.");
    return;
  }

  const passwordHash = await bcrypt.hash(
    config.data.SEED_EMPLOYEE_PASSWORD,
    12
  );

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.EMPLOYEE
    }
  });

  console.log("Mitarbeiter erfolgreich erstellt.");
}

main()
  .catch(() => {
    console.error(
      "Seed fehlgeschlagen. Konfiguration und Datenbank prüfen."
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });