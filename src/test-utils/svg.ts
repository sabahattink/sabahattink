import { expect } from "vitest";

/**
 * Asserts that the root <svg> element declares the exact width/height the
 * generator asked for. Satori always emits `width`/`height` as the first two
 * attributes on the root <svg> tag, so anchoring on `^<svg width="..." height="..."`
 * is a reliable way to catch a canvas-size regression (e.g. a token change that
 * isn't reflected in the render call).
 */
export function assertSvgDimensions(svg: string, width: number, height: number): void {
  const rootMatch = svg.match(/^<svg width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/);
  expect(rootMatch).not.toBeNull();
  expect(Number(rootMatch![1])).toBe(width);
  expect(Number(rootMatch![2])).toBe(height);
}

/**
 * Attribute extraction helper. Note the `\b` (word boundary) rather than a
 * literal leading space: Satori always emits `x` as an element's *first*
 * attribute (e.g. `<rect x="853" y="90" .../>`), so a captured attribute
 * substring never has a leading space before "x=" — a `\s` anchor there
 * silently fails to match and falls back to a default of 0 for every single
 * element, making any x-based assertion vacuously true. `\b` matches correctly
 * whether or not "x=" is preceded by whitespace.
 *
 * Returns the raw matched string (or `undefined` if the attribute isn't
 * present) — callers decide how to coerce/default it, since that policy can
 * differ per call site.
 */
export function getAttr(tagString: string, name: string): string | undefined {
  const re = new RegExp(`\\b${name}="(-?\\d+(?:\\.\\d+)?)"`);
  return tagString.match(re)?.[1];
}
