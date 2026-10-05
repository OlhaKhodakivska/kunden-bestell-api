import type { Role } from "@prisma/client";
import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";

export const authorize = (...allowedRoles: Role[]): RequestHandler => {
  return (request, _response, next) => {
    if (!request.user) {
      next(
        new AppError(
          401,
          "UNAUTHORIZED",
          "Anmeldung erforderlich."
        )
      );
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      next(
        new AppError(
          403,
          "FORBIDDEN",
          "Keine Berechtigung für diese Aktion."
        )
      );
      return;
    }

    next();
  };
};