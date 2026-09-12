import { describe, it, expect } from "vitest";
import { loadFonts } from "./fonts.js";

describe("loadFonts", () => {
  it("loads Space Grotesk (400/500/600) and Space Mono (400) as non-empty buffers", async () => {
    const fonts = await loadFonts();
    expect(fonts).toHaveLength(4);
    for (const font of fonts) {
      expect(font.data.byteLength).toBeGreaterThan(1000);
      expect(["Space Grotesk", "Space Mono"]).toContain(font.name);
    }
  });

  it("includes weights 400, 500, and 600 for Space Grotesk", async () => {
    const fonts = await loadFonts();
    const weights = fonts.filter((f) => f.name === "Space Grotesk").map((f) => f.weight);
    expect(weights).toContain(400);
    expect(weights).toContain(500);
    expect(weights).toContain(600);
  });

  it("includes weight 400 for Space Mono", async () => {
    const fonts = await loadFonts();
    const weights = fonts.filter((f) => f.name === "Space Mono").map((f) => f.weight);
    expect(weights).toContain(400);
  });
});
