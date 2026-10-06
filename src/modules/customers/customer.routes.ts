import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import {
  createCustomerSchema,
  customerIdSchema,
  listCustomersSchema,
  updateCustomerSchema
} from "./customer.schema.js";
import {
  createCustomer,
  deleteCustomer,
  getCustomerById,
  listCustomers,
  updateCustomer
} from "./customer.service.js";

export const customerRouter = Router();

customerRouter.use(authenticate);

customerRouter.get("/", async (request, response, next) => {
  try {
    const query = listCustomersSchema.parse(request.query);
    const result = await listCustomers(query);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

customerRouter.post(
  "/",
  validateBody(createCustomerSchema),
  async (request, response, next) => {
    try {
      const customer = await createCustomer(request.body);

      response
        .location(`/api/v1/customers/${customer.id}`)
        .status(201)
        .json({
          data: customer
        });
    } catch (error) {
      next(error);
    }
  }
);

customerRouter.get("/:id", async (request, response, next) => {
  try {
    const id = customerIdSchema.parse(request.params.id);
    const customer = await getCustomerById(id);

    response.status(200).json({
      data: customer
    });
  } catch (error) {
    next(error);
  }
});

customerRouter.patch(
  "/:id",
  validateBody(updateCustomerSchema),
  async (request, response, next) => {
    try {
      const id = customerIdSchema.parse(request.params.id);
      const customer = await updateCustomer(id, request.body);

      response.status(200).json({
        data: customer
      });
    } catch (error) {
      next(error);
    }
  }
);

customerRouter.delete(
  "/:id",
  authorize(Role.ADMIN),
  async (request, response, next) => {
    try {
      const id = customerIdSchema.parse(request.params.id);

      await deleteCustomer(id);

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);