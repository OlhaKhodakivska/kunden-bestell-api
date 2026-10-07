import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type { CreateProductInput } from "./product.schema.js";

export async function createProduct(input: CreateProductInput) {
  try {
    return await prisma.product.create({
      data: input
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        409,
        "PRODUCT_SKU_EXISTS",
        "Ein Produkt mit dieser SKU existiert bereits."
      );
    }

    throw error;
  }
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id }
  });

  if (!product) {
    throw new AppError(
      404,
      "PRODUCT_NOT_FOUND",
      "Produkt nicht gefunden."
    );
  }

  return product;
}