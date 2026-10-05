import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Zu viele Anmeldeversuche. Bitte später erneut versuchen."
    }
  }
});