import { describe, it, expect } from "vitest";
import satori from "satori";
import { Hero } from "./hero.js";
import { loadFonts } from "../fonts.js";
import { spacing, colors } from "../tokens.js";
import { assertSvgDimensions, getAttr } from "../test-utils/svg.js";

const SAMPLE_DATA = {
  name: "Sabahattin Kalkan",
  kicker: "SYSTEMS · SOFTWARE · BUILDINGS",
  missionLine: "Engineering software and physical systems from architecture to deployment.",
  focus: "Systems that connect software with physical infrastructure",
  domains: "Building Automation · Software Architecture · Engineering Tools",
  based: "Baku, Azerbaijan",
};

describe("Hero", () => {
  it("renders the expected canvas size and all content, with no REV/date field", async () => {
    const fonts = await loadFonts();
    const node = Hero("dark", SAMPLE_DATA);
    const svg = await satori(node as never, {
      width: spacing.heroWidth,
      height: spacing.heroHeight,
      fonts,
      embedFont: false,
    });

    assertSvgDimensions(svg, spacing.heroWidth, spacing.heroHeight);

    // Satori segments multi-word text into one <text> per word even with
    // embedFont: false, so assert on individual words rather than full phrases.
    for (const word of ["Sabahattin", "Kalkan", "SYSTEMS", "BUILDINGS", "FOCUS", "DOMAINS", "BASED"]) {
      expect(svg).toContain(word);
    }

    // The old meta bar's dynamic "REV {date}" field is gone — this is the
    // regression guard for that removal, not just an absence-of-content check.
    expect(svg).not.toContain("REV");
  });

  it("renders the card and nested panel as distinct backgrounds within canvas bounds", async () => {
    const fonts = await loadFonts();
    const node = Hero("dark", SAMPLE_DATA);
    const svg = await satori(node as never, {
      width: spacing.heroWidth,
      height: spacing.heroHeight,
      fonts,
      embedFont: false,
    });

    const { cardInset, heroWidth, heroHeight } = spacing;
    const cardWidth = heroWidth - cardInset * 2;
    const cardHeight = heroHeight - cardInset * 2;

    // The card's own background shape: inset by cardInset on all sides, sized
    // cardWidth x cardHeight, painted with the mode's surface color. This is
    // the specific regression guard for the "rebuilt as a dashboard card"
    // requirement — a plain re-skin without a real inset card would not
    // produce this element at these exact coordinates.
    //
    // Satori renders an element with both borderRadius and boxShadow as a
    // <path> (a rounded-rect path string), not a <rect> — confirmed by
    // rendering this exact shape standalone and inspecting the output. The
    // element still carries its box's x/y/width/height as plain attributes
    // even though it's a <path>, so match on the tag/attributes only, not on
    // the `d` curve data (which is an implementation detail of how Satori
    // draws rounded corners, not something this test should pin down).
    const cardShapePattern = new RegExp(
      `<path x="${cardInset}(?:\\.0+)?" y="${cardInset}(?:\\.0+)?" width="${cardWidth}(?:\\.0+)?" height="${cardHeight}(?:\\.0+)?" fill="${colors.dark.surface}"`
    );
    expect(svg).toMatch(cardShapePattern);

    // Regression guard for the specific gap a code-quality review found: this
    // test's own name promises the panel is a "distinct background" from the
    // card, but without this assertion, silently changing the panel's
    // backgroundColor to match the card's (c.surface instead of c.accentSoft)
    // still passed every other assertion in this file. Anchor on width (a
    // literal in hero.ts) + the accentSoft fill color, not exact x/y/height,
    // since those are emergent from text layout and more brittle to pin down
    // than the two facts that actually matter here.
    const panelShapePattern = new RegExp(
      `<path[^>]*width="380(?:\\.0+)?"[^>]*fill="${colors.dark.accentSoft}"`
    );
    expect(svg).toMatch(panelShapePattern);

    // Loose canvas-bound sweep: nothing should extend past the declared canvas,
    // regardless of how the card/panel layout evolves.
    const elementPattern = /<(rect|text)\s+([^>]*)\/?>/g;
    const attr = (attrs: string, name: string): number => Number(getAttr(attrs, name) ?? 0);
    let match: RegExpExecArray | null;
    let checkedCount = 0;

    while ((match = elementPattern.exec(svg)) !== null) {
      const attrs = match[2];
      const x = attr(attrs, "x");
      const y = attr(attrs, "y");
      const w = attr(attrs, "width");
      const h = attr(attrs, "height");

      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(heroWidth);
      expect(y + h).toBeLessThanOrEqual(heroHeight);
      checkedCount += 1;
    }

    expect(checkedCount).toBeGreaterThan(10);
  });
});
