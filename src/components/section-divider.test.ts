import { describe, it, expect } from "vitest";
import satori from "satori";
import { SectionDivider } from "./section-divider.js";
import { loadFonts } from "../fonts.js";
import { assertSvgDimensions } from "../test-utils/svg.js";

describe("SectionDivider", () => {
  it("renders a labeled hairline at 1200x48", async () => {
    const fonts = await loadFonts();
    const node = SectionDivider("dark", "TECH STACK");
    const svg = await satori(node as never, { width: 1200, height: 48, fonts, embedFont: false });

    // Satori always segments multi-word text into one <text> element per word (plus
    // a separate space element) for line-wrapping measurement, even with embedFont:
    // false — same behavior Task 5 documented for "Sabahattin Kalkan". "TECH STACK"
    // never appears as one contiguous run, so assert on each word instead.
    expect(svg).toContain("<svg");
    expect(svg).toContain("TECH");
    expect(svg).toContain("STACK");

    // Root <svg> must declare the exact canvas size the generator asks for. Unlike
    // Hero, both hairlines here are flex:1 (not fixed widths that must sum to an
    // exact total), so there's no summed-fixed-widths overflow risk to sweep for —
    // but the outer width/height are still independent literals with nothing else
    // catching a regression if `height` or `spacing.heroWidth` ever changes.
    assertSvgDimensions(svg, 1200, 48);
  });
});
