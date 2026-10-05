import { Role } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { loginLimiter } from "../../middleware/login-limiter.js";
import { validateBody } from "../../middleware/validate.js";
import { loginSchema } from "./auth.schema.js";
import { login } from "./auth.service.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  async (request, response, next) => {
    try {
      const result = await login(request.body);

      response.status(200).json({
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

authRouter.get("/me", authenticate, (request, response) => {
  response.status(200).json({
    data: request.user
  });
});

authRouter.get(
  "/users",
  authenticate,
  authorize(Role.ADMIN),
  async (_request, response, next) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      response.status(200).json({
        data: users
      });
    } catch (error) {
      next(error);
    }
  }
);