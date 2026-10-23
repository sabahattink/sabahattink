import { n } from "./svg.js";

/**
 * Revision cloud around a rectangle: arcs walked clockwise with sweep-flag 1,
 * so every scallop bulges outward, the way a checker redlines a print.
 */
export function cloudPath(x: number, y: number, w: number, h: number, step = 15): string {
  const points: Array<readonly [number, number]> = [];
  const edge = (x0: number, y0: number, x1: number, y1: number): void => {
    const count = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let i = 0; i < count; i += 1) {
      points.push([x0 + ((x1 - x0) * i) / count, y0 + ((y1 - y0) * i) / count]);
    }
  };
  edge(x, y, x + w, y);
  edge(x + w, y, x + w, y + h);
  edge(x + w, y + h, x, y + h);
  edge(x, y + h, x, y);

  const first = points[0];
  if (first === undefined) return "";
  let d = `M${n(first[0])} ${n(first[1])}`;
  for (let i = 1; i <= points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i % points.length];
    if (prev === undefined || next === undefined) continue;
    const radius = Math.hypot(next[0] - prev[0], next[1] - prev[1]) * 0.62;
    d += `A${n(radius)} ${n(radius)} 0 0 1 ${n(next[0])} ${n(next[1])}`;
  }
  return `${d}Z`;
}

/** Delta triangle that carries the revision number, centred on (cx, cy). */
export function deltaPath(cx: number, cy: number, size = 11): string {
  const half = size * 0.95;
  return `M${n(cx)} ${n(cy - size)}L${n(cx + half)} ${n(cy + size * 0.62)}L${n(cx - half)} ${n(cy + size * 0.62)}Z`;
}
