import { config } from "dotenv";
import { defineConfig } from "vitest/config";

const result = config({
  path: ".env.test",
  override: true
});

if (result.error || !result.parsed?.DATABASE_URL) {
  throw new Error(
    "Die Datei .env.test mit DATABASE_URL wird benötigt."
  );
}

const databaseUrl = new URL(result.parsed.DATABASE_URL);

if (
  databaseUrl.pathname !== "/kunden_bestell_api_test" ||
  !["localhost", "127.0.0.1"].includes(databaseUrl.hostname)
) {
  throw new Error(
    "Integrationstests dürfen nur die lokale Datenbank kunden_bestell_api_test verwenden."
  );
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["integration-tests/**/*.test.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 20000,
    hookTimeout: 20000,
    env: {
      ...result.parsed,
      NODE_ENV: "test"
    }
  }
});