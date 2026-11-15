import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !/\/\w+_test(\?|$)/.test(databaseUrl)) {
  throw new Error("Set TEST_DATABASE_URL to a database whose name ends with _test; these tests truncate every table.");
}

export default defineConfig({
  resolve: {
    alias: {
      "server-only": src("test/server-only-stub.ts"),
      "@": src(""),
    },
  },
  test: {
    include: ["src/**/*.int.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    env: {
      DATABASE_URL: databaseUrl,
      STORAGE_ROOT: fileURLToPath(new URL("./storage-test", import.meta.url)),
    },
  },
});
