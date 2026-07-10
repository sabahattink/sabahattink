import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // .worktrees/ holds nested git worktrees (see .gitignore) that contain their
    // own copies of this same test suite — without this exclude, running tests
    // from the main checkout double-counts every test file found in any active
    // worktree directory.
    exclude: [...configDefaults.exclude, "**/.worktrees/**"],
  },
});
