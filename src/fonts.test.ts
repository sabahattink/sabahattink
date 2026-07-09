import { describe, it, expect } from "vitest";
import { loadFonts } from "./fonts.js";

describe("loadFonts", () => {
  it("loads Inter regular, Inter bold, and JetBrains Mono as non-empty buffers", async () => {
    const fonts = await loadFonts();
    expect(fonts).toHaveLength(3);
    for (const font of fonts) {
      expect(font.data.byteLength).toBeGreaterThan(1000);
      expect(["Inter", "JetBrains Mono"]).toContain(font.name);
    }
  });

  it("includes both weight 400 and 600 for Inter", async () => {
    const fonts = await loadFonts();
    const interWeights = fonts.filter((f) => f.name === "Inter").map((f) => f.weight);
    expect(interWeights).toContain(400);
    expect(interWeights).toContain(600);
  });
});
