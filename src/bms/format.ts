import { SITE } from "./config.js";

export function celsius(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${(Object.is(rounded, -0) ? 0 : rounded).toFixed(1)} \u00B0C`;
}

/** Baku wall-clock time without relying on the host's ICU data. */
export function bakuTime(iso: string): { readonly date: string; readonly time: string } {
  const shifted = new Date(Date.parse(iso) + SITE.utcOffsetHours * 3_600_000).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

export function duration(minutes: number): string {
  if (minutes < 90) return `about ${minutes} minutes`;
  const hours = Math.round(minutes / 30) / 2;
  return `about ${hours} hours`;
}
