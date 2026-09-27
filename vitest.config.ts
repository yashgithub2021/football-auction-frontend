import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@domain": fileURLToPath(new URL("../backend/src/domain", import.meta.url)),
      "@protocol": fileURLToPath(new URL("../backend/src/protocol/index.ts", import.meta.url)),
      // Test fixtures only: builds real results the way the server does. App code reads snapshot.results.
      "@results": fileURLToPath(new URL("../backend/src/results/index.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Frontend tests are component/client tests in jsdom. The real-backend
    // integration test opts into node with `// @vitest-environment node`.
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
