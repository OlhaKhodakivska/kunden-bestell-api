import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import {
  createCustomerSchema,
  customerIdSchema
} from "./customer.schema.js";
import {
  createCustomer,
  getCustomerById
} from "./customer.service.js";

export const customerRouter = Router();

customerRouter.use(authenticate);

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