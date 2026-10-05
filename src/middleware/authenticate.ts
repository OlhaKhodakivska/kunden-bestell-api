import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";

const payloadSchema = z.object({
  sub: z.string().uuid(),
  exp: z.number().int()
});

export const authenticate: RequestHandler = async (
  request,
  _response,
  next
) => {
  const authorization = request.get("Authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);

  if (!match?.[1]) {
    next(
      new AppError(
        401,
        "UNAUTHORIZED",
        "Ein gültiger Bearer-Token ist erforderlich."
      )
    );
    return;
  }

  let userId: string;

  try {
    const decoded = jwt.verify(match[1], env.JWT_SECRET, {
      algorithms: ["HS256"]
    });

    const payload = payloadSchema.safeParse(decoded);

    if (!payload.success) {
      throw new Error("Ungültiger Token-Inhalt.");
    }

    userId = payload.data.sub;
  } catch {
    next(
      new AppError(
        401,
        "UNAUTHORIZED",
        "Der Token ist ungültig oder abgelaufen."
      )
    );
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      next(
        new AppError(
          401,
          "UNAUTHORIZED",
          "Anmeldung erforderlich."
        )
      );
      return;
    }

    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
};