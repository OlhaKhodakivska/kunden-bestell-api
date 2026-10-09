import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import { createOrderSchema } from "./order.schema.js";
import { createOrder } from "./order.service.js";

export const orderRouter = Router();

orderRouter.use(authenticate);

orderRouter.post(
  "/",
  validateBody(createOrderSchema),
  async (request, response, next) => {
    try {
      const order = await createOrder(request.body);

      response.status(201).json({
        data: order
      });
    } catch (error) {
      next(error);
    }
  }
);