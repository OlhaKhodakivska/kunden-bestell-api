import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { healthRouter } from "./routes/health.js";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true
    })
  );

  app.use(express.json({ limit: "100kb" }));

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 200,
      standardHeaders: "draft-8",
      legacyHeaders: false
    })
  );

  app.use("/api/v1/health", healthRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};