import { describe, it, expect } from "vitest";
import { contrastRatio } from "./contrast.js";
import { colors } from "./tokens.js";

describe("contrastRatio", () => {
  it("computes known ratio: black on white is 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("computes known ratio: identical colors is 1:1", () => {
    expect(contrastRatio("#7c6cf6", "#7c6cf6")).toBeCloseTo(1, 1);
  });
});

describe("token contrast — WCAG AA (4.5:1 minimum)", () => {
  const AA = 4.5;
  const fields = ["neutralHigh", "neutralMid", "accent", "success", "warning"] as const;

  for (const mode of ["dark", "light"] as const) {
    for (const field of fields) {
      it(`${mode}.${field} vs ${mode}.bg passes AA`, () => {
        const ratio = contrastRatio(colors[mode][field], colors[mode].bg);
        expect(ratio).toBeGreaterThanOrEqual(AA);
      });
    }
  }
});

describe("accentSoft panel contrast — WCAG AA (4.5:1 minimum)", () => {
  const AA = 4.5;

  for (const mode of ["dark", "light"] as const) {
    it(`${mode}.neutralHigh vs ${mode}.accentSoft passes AA`, () => {
      const ratio = contrastRatio(colors[mode].neutralHigh, colors[mode].accentSoft);
      expect(ratio).toBeGreaterThanOrEqual(AA);
    });

    it(`${mode}.accent vs ${mode}.accentSoft passes AA`, () => {
      const ratio = contrastRatio(colors[mode].accent, colors[mode].accentSoft);
      expect(ratio).toBeGreaterThanOrEqual(AA);
    });
  }
});
