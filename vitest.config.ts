import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      PORT: "3000",
      DATABASE_URL:
        "postgresql://test:test@localhost:5433/test_database",
      JWT_SECRET: "test-only-secret-with-at-least-32-characters",
      JWT_EXPIRES_IN: "1h",
      CORS_ORIGIN: "http://localhost:5173"
    }
  }
});