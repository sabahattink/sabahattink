import { describe, it, expect, afterEach } from "vitest";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { generate } from "./generate.js";

const OUT_DIR = path.join(process.cwd(), "assets");
const GENERATED_FILES = [
  "hero-dark.svg",
  "hero-light.svg",
  "stat-strip-dark.svg",
  "stat-strip-light.svg",
  "divider-dark.svg",
  "divider-light.svg",
];

describe("generate", () => {
  afterEach(async () => {
    for (const f of GENERATED_FILES) {
      await rm(path.join(OUT_DIR, f), { force: true });
    }
  });

  it("writes six SVG files (hero/stat-strip/divider × dark/light)", async () => {
    await generate({
      fetchStats: async () => ({ followers: 42, publicRepos: 27, totalStars: 36 }),
    });

    for (const f of GENERATED_FILES) {
      const content = await readFile(path.join(OUT_DIR, f), "utf-8");
      expect(content).toContain("<svg");
    }
  });
});
