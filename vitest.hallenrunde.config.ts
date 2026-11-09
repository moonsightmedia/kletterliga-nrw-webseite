import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["server/hallenrunde.integration.test.ts"] },
});
