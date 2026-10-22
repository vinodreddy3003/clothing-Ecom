import { defineConfig } from "vitest/config";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";

// Tests run against a real Postgres (DATABASE_URL from .env.test) because the guarantees we test
// (no overselling, single stock restore) live in SQL conditional updates.
const testEnv = Object.fromEntries(
  (existsSync(".env.test") ? readFileSync(".env.test", "utf8") : `DATABASE_URL=${process.env.DATABASE_URL ?? ""}`)
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);

export default defineConfig({
  test: {
    env: testEnv,
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve("src"),
      "server-only": path.resolve("tests/empty.ts"),
    },
  },
});
