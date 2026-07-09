import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { generate } from "./generate.js";

const GENERATED_FILES = [
  "hero-dark.svg",
  "hero-light.svg",
  "stat-strip-dark.svg",
  "stat-strip-light.svg",
  "divider-dark.svg",
  "divider-light.svg",
];

describe("generate", () => {
  let outDir: string;

  beforeEach(async () => {
    // Write to a scratch temp directory rather than the real assets/ dir.
    // The generated SVGs are the actual production output that gets committed
    // for the GitHub profile README — a test that wrote to (and cleaned up)
    // the real assets/ dir would eventually `rm` those tracked files out of the
    // working tree every time `pnpm test` runs locally.
    outDir = await mkdtemp(path.join(tmpdir(), "generate-test-"));
  });

  afterEach(async () => {
    await rm(outDir, { recursive: true, force: true });
  });

  it("writes six SVG files (hero/stat-strip/divider × dark/light)", async () => {
    await generate({
      outDir,
      fetchStats: async () => ({ followers: 42, publicRepos: 27, totalStars: 36 }),
    });

    for (const f of GENERATED_FILES) {
      const content = await readFile(path.join(outDir, f), "utf-8");
      expect(content).toContain("<svg");
    }
  });

  it("renders distinct dark and light output for each component (guards against a mode-wiring copy-paste bug)", async () => {
    await generate({
      outDir,
      fetchStats: async () => ({ followers: 42, publicRepos: 27, totalStars: 36 }),
    });

    const pairs: Array<[string, string]> = [
      ["hero-dark.svg", "hero-light.svg"],
      ["stat-strip-dark.svg", "stat-strip-light.svg"],
      ["divider-dark.svg", "divider-light.svg"],
    ];

    for (const [darkFile, lightFile] of pairs) {
      const darkSvg = await readFile(path.join(outDir, darkFile), "utf-8");
      const lightSvg = await readFile(path.join(outDir, lightFile), "utf-8");
      expect(darkSvg).not.toEqual(lightSvg);
    }
  });
});
