import { describe, it, expect } from "vitest";
import satori from "satori";
import { StatStrip, type StatTileData } from "./stat-strip.js";
import { loadFonts } from "../fonts.js";
import { spacing, colors } from "../tokens.js";
import { assertSvgDimensions } from "../test-utils/svg.js";

const SAMPLE_TILES: StatTileData[] = [
  { tag: "03", value: "CORE DISCIPLINES", caption: "Systems · Software · Buildings" },
  { tag: "FIELD", value: "→ PRODUCTION", caption: "From physical infrastructure to deployed software" },
  { tag: "BAKU", value: "AZ", caption: "Engineering from Azerbaijan" },
];

describe("StatStrip", () => {
  it("renders each tile's tag, value, and caption at the expected canvas size", async () => {
    const fonts = await loadFonts();
    const node = StatStrip("dark", SAMPLE_TILES);
    const svg = await satori(node as never, {
      width: spacing.heroWidth,
      height: spacing.statStripHeight,
      fonts,
      embedFont: false,
    });

    assertSvgDimensions(svg, spacing.heroWidth, spacing.statStripHeight);

    for (const word of ["03", "CORE", "DISCIPLINES", "FIELD", "PRODUCTION", "BAKU", "AZ"]) {
      expect(svg).toContain(word);
    }

    // This is now a positioning strip, not a metrics dashboard — regression
    // guard against the old GitHub-metrics content ever reappearing here.
    for (const oldWord of ["FOLLOWERS", "REPOS", "STARS"]) {
      expect(svg).not.toContain(oldWord);
    }
  });

  it("renders three equal-width bordered tiles that sum to the full canvas width", async () => {
    const fonts = await loadFonts();
    const node = StatStrip("dark", SAMPLE_TILES);
    const svg = await satori(node as never, {
      width: spacing.heroWidth,
      height: spacing.statStripHeight,
      fonts,
      embedFont: false,
    });

    // Every tile shares the hairline border color as its stroke — count
    // matches of that stroke color, expect exactly 3 (one per tile card).
    // `colors` is imported at the top of this file rather than required
    // lazily: this project is "type": "module" and Vitest transforms .ts
    // in-memory, so there is no compiled tokens.js on disk for a CJS
    // require() to resolve — a plain top-level import is both simpler and
    // the only approach that actually works here.
    const strokeMatches = svg.match(new RegExp(`stroke="${colors.dark.hairline}"`, "g")) ?? [];
    expect(strokeMatches.length).toBe(3);
  });
});
