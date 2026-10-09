import { OrderStatus, Role } from "@prisma/client";
import { Router } from "express";
import { AppError } from "../../errors/app-error.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import {
  createOrderSchema,
  listOrdersSchema,
  orderIdSchema,
  updateOrderStatusSchema
} from "./order.schema.js";
import {
  createOrder,
  getOrderById,
  listOrders,
  updateOrderStatus
} from "./order.service.js";

export const orderRouter = Router();

orderRouter.use(authenticate);

orderRouter.get("/", async (request, response, next) => {
  try {
    const query = listOrdersSchema.parse(request.query);
    const result = await listOrders(query);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

orderRouter.post(
  "/",
  validateBody(createOrderSchema),
  async (request, response, next) => {
    try {
      const order = await createOrder(request.body);

      response
        .location(`/api/v1/orders/${order.id}`)
        .status(201)
        .json({
          data: order
        });
    } catch (error) {
      next(error);
    }
  }
);

orderRouter.get("/:id", async (request, response, next) => {
  try {
    const id = orderIdSchema.parse(request.params.id);
    const order = await getOrderById(id);

    response.status(200).json({
      data: order
    });
  } catch (error) {
    next(error);
  }
});

orderRouter.patch(
  "/:id/status",
  validateBody(updateOrderStatusSchema),
  async (request, response, next) => {
    try {
      if (
        request.body.status === OrderStatus.CANCELLED &&
        request.user?.role !== Role.ADMIN
      ) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Nur Administratoren dürfen Bestellungen stornieren."
        );
      }

      const id = orderIdSchema.parse(request.params.id);
      const order = await updateOrderStatus(
        id,
        request.body.status
      );

      response.status(200).json({
        data: order
      });
    } catch (error) {
      next(error);
    }
  }
);

orderRouter.delete(
  "/:id",
  authorize(Role.ADMIN),
  async (request, response, next) => {
    try {
      const id = orderIdSchema.parse(request.params.id);

      await updateOrderStatus(id, OrderStatus.CANCELLED);

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);