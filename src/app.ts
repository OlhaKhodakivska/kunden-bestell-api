import express from "express";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/api/v1/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "kunden-bestell-api"
    });
  });

  return app;
};