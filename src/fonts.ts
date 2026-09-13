import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export interface FontConfig {
  name: "Space Grotesk" | "Space Mono";
  data: Buffer;
  weight: 400 | 600;
  style: "normal";
}

// Satori supports TTF/OTF/WOFF only (not WOFF2). @fontsource ships .woff — use that.
// Only 400/600 are loaded — the only weights any component's typeScale actually
// uses (see docs/FONTS.md). Weight 500 was loaded here in an earlier draft on
// the assumption a future heading would need it, but nothing ever did; keeping
// an unused font buffer around was dead weight, so it was dropped.
export async function loadFonts(): Promise<FontConfig[]> {
  const paths = {
    groteskRegular: require.resolve("@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff"),
    groteskSemibold: require.resolve("@fontsource/space-grotesk/files/space-grotesk-latin-600-normal.woff"),
    mono: require.resolve("@fontsource/space-mono/files/space-mono-latin-400-normal.woff"),
  };

  const [groteskRegular, groteskSemibold, mono] = await Promise.all([
    readFile(paths.groteskRegular),
    readFile(paths.groteskSemibold),
    readFile(paths.mono),
  ]);

  return [
    { name: "Space Grotesk", data: groteskRegular, weight: 400, style: "normal" },
    { name: "Space Grotesk", data: groteskSemibold, weight: 600, style: "normal" },
    { name: "Space Mono", data: mono, weight: 400, style: "normal" },
  ];
}
