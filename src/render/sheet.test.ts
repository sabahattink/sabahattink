import { describe, expect, it } from "vitest";
import { PRODUCTS } from "../config.js";
import { advance } from "../revisions.js";
import { scan } from "../test/fixtures.js";
import type { FontFaces } from "./fonts.js";
import { fitProblems, fitText, renderSheet } from "./sheet.js";
import { DARK, LIGHT } from "./theme.js";

const fonts: FontFaces = { sans400: "AA==", sans700: "AA==", mono400: "AA==" };

describe("renderSheet", () => {
  const state = advance(advance(null, scan()), scan("2026-11-01T09:00:00Z", { codediag: { release: "v2.0.0" } }));

  it("is byte-for-byte deterministic", () => {
    const a = renderSheet({ state, products: PRODUCTS, theme: LIGHT, fonts });
    const b = renderSheet({ state, products: PRODUCTS, theme: LIGHT, fonts });
    expect(a).toBe(b);
  });

  it("never leaks undefined or NaN into the markup", () => {
    for (const theme of [LIGHT, DARK]) {
      const svg = renderSheet({ state, products: PRODUCTS, theme, fonts });
      expect(svg).not.toMatch(/undefined|NaN|Infinity/);
    }
  });

  it("clouds exactly the changed product and stamps the revision", () => {
    const svg = renderSheet({ state, products: PRODUCTS, theme: LIGHT, fonts });
    expect(svg.match(/class="cloud"/g)).toHaveLength(1);
    expect(svg).toContain("codediag v2.0.0 released");
  });

  it("merges neighbouring changes into one cloud", () => {
    const both = advance(
      advance(null, scan()),
      scan("2026-11-01T09:00:00Z", { reasonkit: { stars: 5 }, sealed: { stars: 9 } }),
    );
    const svg = renderSheet({ state: both, products: PRODUCTS, theme: DARK, fonts });
    expect(svg.match(/class="cloud"/g)).toHaveLength(1);
  });

  it("blinks the status LED and counts alarms when a product faults", () => {
    const faulted = advance(advance(null, scan()), scan("2026-11-01T09:00:00Z", { Recall: { checks: "failing" } }));
    const svg = renderSheet({ state: faulted, products: PRODUCTS, theme: LIGHT, fonts });
    expect(svg).toContain("st-fault blink");
    expect(svg).toContain("1 active alarms");
  });

  it("draws no cloud on the first issue", () => {
    const first = advance(null, scan());
    const svg = renderSheet({ state: first, products: PRODUCTS, theme: LIGHT, fonts });
    expect(svg).not.toContain('class="cloud"');
    expect(svg).toContain("Sheet issued");
  });

  it("omits the star counter for repositories without stars", () => {
    const svg = renderSheet({ state, products: PRODUCTS, theme: LIGHT, fonts });
    expect(svg).not.toContain('class="star"');
  });

  it("respects reduced motion", () => {
    expect(renderSheet({ state, products: PRODUCTS, theme: LIGHT, fonts })).toContain("prefers-reduced-motion:reduce");
  });
});

describe("fit", () => {
  it("every configured label fits the symbol it is drawn in", () => {
    expect(fitProblems(PRODUCTS)).toEqual([]);
  });

  it("clips long text with an ellipsis instead of overflowing", () => {
    expect(fitText("v0.2.0-alpha.1+build.77", 40, 10, "sans")).toMatch(/\u2026$/);
    expect(fitText("v1.0.0", 200, 10, "sans")).toBe("v1.0.0");
  });
});
