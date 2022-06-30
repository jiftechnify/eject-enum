import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    includeSource: ["test/**/*.test.ts"],
  },
});
