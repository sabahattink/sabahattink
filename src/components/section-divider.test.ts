import { describe, it, expect } from "vitest";
import satori from "satori";
import { SectionDivider } from "./section-divider.js";
import { loadFonts } from "../fonts.js";
import { spacing, colors } from "../tokens.js";
import { assertSvgDimensions } from "../test-utils/svg.js";

describe("SectionDivider", () => {
  it("renders a pill-badged label between two hairlines at the token-defined size", async () => {
    const fonts = await loadFonts();
    const node = SectionDivider("dark", "TECH STACK");
    const svg = await satori(node as never, {
      width: spacing.heroWidth,
      height: spacing.dividerHeight,
      fonts,
      embedFont: false,
    });

    expect(svg).toContain("TECH");
    expect(svg).toContain("STACK");
    assertSvgDimensions(svg, spacing.heroWidth, spacing.dividerHeight);

    // Regression guard for the actual change this task makes: the old
    // divider rendered bare text with no pill wrapper at all, so it never
    // painted anything in accentSoft. A spread of a removed typeScale field
    // (e.g. the old `typeScale.meta`) is a silent no-op at runtime in JS —
    // it does NOT throw — so the two assertions above would already pass
    // against the pre-rewrite component and wouldn't actually catch a
    // skipped rewrite. This is the one assertion that only passes once the
    // pill badge is genuinely present.
    expect(svg).toContain(colors.dark.accentSoft);
  });
});
