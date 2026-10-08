import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type {
  CreateProductInput,
  ListProductsInput,
  UpdateProductInput
} from "./product.schema.js";

function handleDatabaseError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new AppError(
        409,
        "PRODUCT_SKU_EXISTS",
        "Ein Produkt mit dieser SKU existiert bereits."
      );
    }

    if (error.code === "P2025") {
      throw new AppError(
        404,
        "PRODUCT_NOT_FOUND",
        "Produkt nicht gefunden."
      );
    }
  }

  throw error;
}

export async function createProduct(input: CreateProductInput) {
  try {
    return await prisma.product.create({
      data: input
    });
  } catch (error) {
    handleDatabaseError(error);
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

export async function listProducts(input: ListProductsInput) {
  const { search, active, page, limit } = input;

  const where: Prisma.ProductWhereInput = {};

  if (active !== undefined) {
    where.active = active;
  }

  if (search) {
    where.OR = [
      {
        sku: {
          contains: search,
          mode: "insensitive"
        }
      },
      {
        name: {
          contains: search,
          mode: "insensitive"
        }
      },
      {
        description: {
          contains: search,
          mode: "insensitive"
        }
      }
    ];
  }

  const [products, total] = await prisma.$transaction(
    [
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { name: "asc" },
          { id: "asc" }
        ]
      }),
      prisma.product.count({ where })
    ],
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead
    }
  );

  return {
    data: products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput
) {
  try {
    return await prisma.product.update({
      where: { id },
      data: input
    });
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function deactivateProduct(id: string) {
  try {
    return await prisma.product.update({
      where: { id },
      data: { active: false }
    });
  } catch (error) {
    handleDatabaseError(error);
  }
}