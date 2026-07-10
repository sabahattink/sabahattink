import { describe, it, expect } from "vitest";
import satori from "satori";
import { StatStrip } from "./stat-strip.js";
import { loadFonts } from "../fonts.js";
import { colors, spacing } from "../tokens.js";
import { assertSvgDimensions } from "../test-utils/svg.js";

describe("StatStrip", () => {
  it("renders follower, repo, and star counts", async () => {
    const fonts = await loadFonts();
    const node = StatStrip("dark", { followers: 42, publicRepos: 27, totalStars: 36 });
    // Render at the component's own current token-derived size, not a hardcoded
    // 1200x60 — so this test (and the root-dimension assertion below) stays valid
    // even after Task 11 retunes spacing.statStripHeight during integration.
    const svg = await satori(node as never, {
      width: spacing.heroWidth,
      height: spacing.statStripHeight,
      fonts,
      embedFont: false,
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain("42");
    expect(svg).toContain("27");
    expect(svg).toContain("36");

    // Root <svg> must declare the exact canvas size the generator asks for, mirroring
    // the check SectionDivider's test performs. Asserted against the live tokens
    // (spacing.heroWidth/statStripHeight) rather than literals, so a future resize
    // doesn't require touching this test.
    assertSvgDimensions(svg, spacing.heroWidth, spacing.statStripHeight);

    // Regression guard for this component's whole reason for existing: it must share
    // Hero's hairline-rule language (a top and bottom hairline framing the content),
    // not just be a bare row of numbers. Sweep every <rect> in the rendered SVG and
    // count how many are painted with the dark-mode hairline color token — if a future
    // edit drops a hairline or miscolors it, this catches it without hardcoding any
    // pixel position (which Task 11's integration pass may still adjust).
    const hairlineColor = colors.dark.hairline;
    const rectFillPattern = /<rect\s+[^>]*fill="([^"]+)"[^>]*\/?>/g;
    let fillMatch: RegExpExecArray | null;
    let hairlineRectCount = 0;
    while ((fillMatch = rectFillPattern.exec(svg)) !== null) {
      if (fillMatch[1] === hairlineColor) hairlineRectCount += 1;
    }
    expect(hairlineRectCount).toBeGreaterThanOrEqual(2);
  });
});
