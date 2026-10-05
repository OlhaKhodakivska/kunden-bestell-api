import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type { LoginInput } from "./auth.schema.js";

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (!user) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "E-Mail oder Passwort ist falsch."
    );
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "E-Mail oder Passwort ist falsch."
    );
  }

  const accessToken = jwt.sign(
    { role: user.role },
    env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: env.JWT_EXPIRES_IN,
      algorithm: "HS256"
    }
  );

  return {
    accessToken,
    tokenType: "Bearer",
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  };
}