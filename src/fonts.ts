import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export interface FontConfig {
  name: "Space Grotesk" | "Space Mono";
  data: Buffer;
  weight: 400 | 500 | 600;
  style: "normal";
}

// Satori supports TTF/OTF/WOFF only (not WOFF2). @fontsource ships .woff — use that.
export async function loadFonts(): Promise<FontConfig[]> {
  const paths = {
    groteskRegular: require.resolve("@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff"),
    groteskMedium: require.resolve("@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff"),
    groteskSemibold: require.resolve("@fontsource/space-grotesk/files/space-grotesk-latin-600-normal.woff"),
    mono: require.resolve("@fontsource/space-mono/files/space-mono-latin-400-normal.woff"),
  };

  const [groteskRegular, groteskMedium, groteskSemibold, mono] = await Promise.all([
    readFile(paths.groteskRegular),
    readFile(paths.groteskMedium),
    readFile(paths.groteskSemibold),
    readFile(paths.mono),
  ]);

  return [
    { name: "Space Grotesk", data: groteskRegular, weight: 400, style: "normal" },
    { name: "Space Grotesk", data: groteskMedium, weight: 500, style: "normal" },
    { name: "Space Grotesk", data: groteskSemibold, weight: 600, style: "normal" },
    { name: "Space Mono", data: mono, weight: 400, style: "normal" },
  ];
}
