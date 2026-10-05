import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type { CreateCustomerInput } from "./customer.schema.js";

export async function createCustomer(input: CreateCustomerInput) {
  try {
    return await prisma.customer.create({
      data: input
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        409,
        "CUSTOMER_EMAIL_EXISTS",
        "Ein Kunde mit dieser E-Mail-Adresse existiert bereits."
      );
    }

    throw error;
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