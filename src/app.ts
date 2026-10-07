import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { healthRouter } from "./routes/health.js";
import { customerRouter } from "./modules/customers/customer.routes.js";
import { productRouter } from "./modules/products/product.routes.js";


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
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/customers", customerRouter);
  app.use("/api/v1/products", productRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
};