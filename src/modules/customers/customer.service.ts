import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type {
  CreateCustomerInput,
  ListCustomersInput,
  UpdateCustomerInput
} from "./customer.schema.js";

function handleDatabaseError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new AppError(
        409,
        "CUSTOMER_EMAIL_EXISTS",
        "Ein Kunde mit dieser E-Mail-Adresse existiert bereits."
      );
    }

    if (error.code === "P2025") {
      throw new AppError(
        404,
        "CUSTOMER_NOT_FOUND",
        "Kunde nicht gefunden."
      );
    }

    if (error.code === "P2003") {
      throw new AppError(
        409,
        "CUSTOMER_HAS_ORDERS",
        "Kunden mit Bestellungen können nicht gelöscht werden."
      );
    }
  }

  throw error;
}

export async function createCustomer(input: CreateCustomerInput) {
  try {
    return await prisma.customer.create({
      data: input
    });
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id }
  });

  if (!customer) {
    throw new AppError(
      404,
      "CUSTOMER_NOT_FOUND",
      "Kunde nicht gefunden."
    );
  }

  return customer;
}

export async function listCustomers(input: ListCustomersInput) {
  const { search, page, limit } = input;

  const where: Prisma.CustomerWhereInput = search
    ? {
        OR: [
          {
            firstName: {
              contains: search,
              mode: "insensitive"
            }
          },
          {
            lastName: {
              contains: search,
              mode: "insensitive"
            }
          },
          {
            email: {
              contains: search,
              mode: "insensitive"
            }
          }
        ]
      }
    : {};

  const [customers, total] = await prisma.$transaction(
    [
      prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { lastName: "asc" },
          { firstName: "asc" },
          { id: "asc" }
        ]
      }),
      prisma.customer.count({ where })
    ],
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead
    }
  );

  return {
    data: customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput
) {
  try {
    return await prisma.customer.update({
      where: { id },
      data: input
    });
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function deleteCustomer(id: string) {
  try {
    await prisma.customer.delete({
      where: { id }
    });
  } catch (error) {
    handleDatabaseError(error);
  }
}