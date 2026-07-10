import { describe, it, expect } from "vitest";
import satori from "satori";
import { Hero } from "./hero.js";
import { loadFonts } from "../fonts.js";
import { assertSvgDimensions, getAttr } from "../test-utils/svg.js";

describe("Hero", () => {
  it("renders to a valid 1200x300 SVG containing the name and spec-rail fields", async () => {
    const fonts = await loadFonts();
    const node = Hero("dark", {
      name: "Sabahattin Kalkan",
      kicker: "SYSTEMS ARCHITECT",
      missionLine: "Building systems where AI infrastructure, developer tooling and automation intersect.",
      focus: "AI Infra · Dev Tooling",
      stack: "TypeScript · Rust · Python",
      based: "Baku, Azerbaijan",
      revDate: "2026.07.09",
    });

    // embedFont: false — satori's default (true) converts all text to vector glyph
    // paths and never emits literal text anywhere in the SVG, which would make the
    // string assertions below meaningless. Rendering with plain <text> elements here
    // is what actually lets us assert on rendered content; the shipped generator
    // (src/generate.ts) still uses satori's default (embedFont: true) for pixel-perfect,
    // font-independent output.
    const svg = await satori(node as never, { width: 1200, height: 300, fonts, embedFont: false });

    // Satori always segments multi-word text into one <text> element per word (plus
    // separate space elements) for line-wrapping measurement, even with embedFont:
    // false — so "Sabahattin Kalkan" never appears as one contiguous run. Assert on
    // each word instead; this still verifies the name is actually rendered.
    expect(svg).toContain("<svg");
    expect(svg).toContain("Sabahattin");
    expect(svg).toContain("Kalkan");
    expect(svg).toContain("FOCUS");
    expect(svg).toContain("BASED");
  });

  it("renders within a 1200x300 box with no element overflowing the canvas", async () => {
    const fonts = await loadFonts();
    const node = Hero("dark", {
      name: "Sabahattin Kalkan",
      kicker: "SYSTEMS ARCHITECT",
      missionLine: "Building systems where AI infrastructure, developer tooling and automation intersect.",
      focus: "AI Infra · Dev Tooling",
      stack: "TypeScript · Rust · Python",
      based: "Baku, Azerbaijan",
      revDate: "2026.07.09",
    });

    const svg = await satori(node as never, { width: 1200, height: 300, fonts, embedFont: false });

    // Root <svg> must declare the exact canvas size the generator asks for.
    assertSvgDimensions(svg, 1200, 300);

    // Thin local wrapper around the shared getAttr: this component's sweeps treat a
    // missing attribute as 0 (so every element still yields a comparable number),
    // which is a policy specific to this test rather than the shared extractor.
    const attr = (attrs: string, name: string): number => Number(getAttr(attrs, name) ?? 0);

    // Coarse regex sweep over every <rect>/<text> element's x/y + width/height:
    // nothing should extend past the 1200x300 canvas (guards against a regression
    // like the divider-margin overflow bug this component previously had, e.g. if
    // someone edits marginX/heroWidth/column widths without rebalancing the sum).
    const elementPattern = /<(rect|text)\s+([^>]*)\/?>/g;
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
      expect(x + w).toBeLessThanOrEqual(1200);
      expect(y + h).toBeLessThanOrEqual(300);
      checkedCount += 1;
    }

    // Sanity check that the sweep actually inspected elements, so this test can't
    // silently pass by matching nothing.
    expect(checkedCount).toBeGreaterThan(10);

    // Tighter regression guard: the 1200x300 canvas check above is real but too loose
    // to catch the actual bug class this component is prone to. The divider-margin
    // overflow previously ended the right column's box at x=1173 — still comfortably
    // under 1200 — and its *text glyphs* never got anywhere near 1136 either, because
    // "AI Infra · Dev Tooling" etc. are far narrower than the 320px column box they
    // sit in. The only element that actually exposes that class of bug is the right
    // column's own clipping-mask rect (x=853, width=320 when broken), so — unlike the
    // canvas-bounds sweep above — this check must NOT strip <mask> rects wholesale, or
    // it would strip away the one signal that catches the regression.
    //
    // Instead, exclude only the small set of legitimate full-bleed container boxes:
    // any rect/mask-rect whose own box starts at x=0 and spans the full width=1200
    // (the outer hero background, the meta-bar row's pre-padding box, and the
    // two-column row's pre-padding box — each is a flex child that intentionally
    // fills its 1200-wide parent before its own padding narrows the visible content).
    // Nothing else should ever legitimately reach x=0/width=1200, since all real
    // content sits inside the marginX=64 padding. Every other rect/mask-rect/text —
    // including each column's own box — must keep x + width <= 1136
    // (heroWidth - marginX = 1200 - 64, the intended right content boundary).
    const contentPattern = /<(rect|text)\s+([^>]*)\/?>/g;
    let contentMatch: RegExpExecArray | null;
    let contentCheckedCount = 0;

    while ((contentMatch = contentPattern.exec(svg)) !== null) {
      const attrs = contentMatch[2];
      const x = attr(attrs, "x");
      const w = attr(attrs, "width");
      const isFullBleedContainerBox = x === 0 && w === 1200;
      if (isFullBleedContainerBox) continue;

      expect(x + w).toBeLessThanOrEqual(1136);
      contentCheckedCount += 1;
    }

    expect(contentCheckedCount).toBeGreaterThan(10);
  });
});
