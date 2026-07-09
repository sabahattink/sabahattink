import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // TODO: remove once src/ has test files (Task 1 adds the first one)
    passWithNoTests: true,
  },
});
