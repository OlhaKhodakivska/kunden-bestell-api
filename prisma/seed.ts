import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient, Role } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const seedSchema = z.object({
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
  const result = seedSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      "SEED_ADMIN_EMAIL oder SEED_ADMIN_PASSWORD ist ungültig."
    );
  }

  const email = result.data.SEED_ADMIN_EMAIL;

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    console.log("Benutzer existiert bereits. Keine Änderungen vorgenommen.");
    return;
  }

  const passwordHash = await bcrypt.hash(
    result.data.SEED_ADMIN_PASSWORD,
    12
  );

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.ADMIN
    }
  });

  console.log("Administrator erfolgreich erstellt.");
}

main()
  .catch(() => {
    console.error(
      "Seed fehlgeschlagen. Bitte Konfiguration und Datenbank prüfen."
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });