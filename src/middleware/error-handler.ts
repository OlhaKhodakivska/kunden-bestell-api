import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  next
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const parserError =
    typeof error === "object" && error !== null
      ? (error as { type?: unknown; status?: unknown })
      : undefined;

  if (
    parserError?.type === "entity.parse.failed" &&
    parserError.status === 400
  ) {
    response.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Der Anfragekörper enthält kein gültiges JSON."
      }
    });
    return;
  }

  if (
    parserError?.type === "entity.too.large" &&
    parserError.status === 413
  ) {
    response.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Der Anfragekörper überschreitet die erlaubte Größe."
      }
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined && {
          details: error.details
        })
      }
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Die Eingabedaten sind ungültig.",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      }
    });
    return;
  }

  console.error(error);

  response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Ein interner Fehler ist aufgetreten."
    }
  });
};