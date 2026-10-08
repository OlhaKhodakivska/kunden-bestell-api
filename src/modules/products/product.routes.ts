import { Role } from "@prisma/client";
import { Router } from "express";
import { AppError } from "../../errors/app-error.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import {
  createProductSchema,
  listProductsSchema,
  productIdSchema,
  updateProductSchema
} from "./product.schema.js";
import {
  createProduct,
  deactivateProduct,
  getProductById,
  listProducts,
  updateProduct
} from "./product.service.js";

export const productRouter = Router();

productRouter.use(authenticate);

productRouter.get("/", async (request, response, next) => {
  try {
    const query = listProductsSchema.parse(request.query);
    const result = await listProducts(query);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

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

productRouter.patch(
  "/:id",
  validateBody(updateProductSchema),
  async (request, response, next) => {
    try {
      if (
        request.body.active !== undefined &&
        request.user?.role !== Role.ADMIN
      ) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Nur Administratoren dürfen den Aktivstatus ändern."
        );
      }

      const id = productIdSchema.parse(request.params.id);
      const product = await updateProduct(id, request.body);

      response.status(200).json({
        data: product
      });
    } catch (error) {
      next(error);
    }
  }
);

productRouter.delete(
  "/:id",
  authorize(Role.ADMIN),
  async (request, response, next) => {
    try {
      const id = productIdSchema.parse(request.params.id);

      await deactivateProduct(id);

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);