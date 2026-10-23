// Advance widths (in em) for printable ASCII (0x20..0x7E), extracted from the
// pinned @fontsource/b612 and @fontsource/b612-mono latin woff2 files.
// B612 regular and bold share advances. Used to prove at test time that every
// label fits the symbol it is drawn in, instead of discovering overflow on GitHub.

const FIRST = 0x20;

const SANS: readonly number[] = [0.35, 0.35, 0.4, 0.85, 0.55, 0.9, 0.7, 0.2, 0.45, 0.45, 0.55, 0.6, 0.25, 0.45, 0.3, 0.55, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.3, 0.25, 0.65, 0.5, 0.65, 0.55, 1.0, 0.65, 0.65, 0.6, 0.65, 0.6, 0.55, 0.65, 0.7, 0.3, 0.45, 0.6, 0.55, 0.9, 0.75, 0.8, 0.6, 0.8, 0.65, 0.55, 0.6, 0.7, 0.65, 0.95, 0.65, 0.6, 0.6, 0.45, 0.55, 0.5, 0.75, 0.55, 0.55, 0.525, 0.6, 0.5, 0.6, 0.55, 0.4, 0.6, 0.6, 0.3, 0.3, 0.55, 0.35, 0.9, 0.6, 0.6, 0.6, 0.6, 0.4, 0.45, 0.4, 0.6, 0.55, 0.75, 0.55, 0.55, 0.5, 0.649, 0.2, 0.6, 0.75];

export const MONO_ADVANCE = 0.65;

export type Face = "sans" | "mono";

export function textWidth(text: string, size: number, face: Face): number {
  let em = 0;
  for (const ch of text) {
    if (face === "mono") {
      em += MONO_ADVANCE;
      continue;
    }
    const code = ch.codePointAt(0) ?? FIRST;
    em += SANS[code - FIRST] ?? 0.6;
  }
  return em * size;
}
