import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import {
  createProductSchema,
  productIdSchema
} from "./product.schema.js";
import {
  createProduct,
  getProductById
} from "./product.service.js";

export const productRouter = Router();

productRouter.use(authenticate);

productRouter.post(
  "/",
  validateBody(createProductSchema),
  async (request, response, next) => {
    try {
      const product = await createProduct(request.body);

      response
        .location(`/api/v1/products/${product.id}`)
        .status(201)
        .json({
          data: product
        });
    } catch (error) {
      next(error);
    }
  }
);

productRouter.get("/:id", async (request, response, next) => {
  try {
    const id = productIdSchema.parse(request.params.id);
    const product = await getProductById(id);

    response.status(200).json({
      data: product
    });
  } catch (error) {
    next(error);
  }
});