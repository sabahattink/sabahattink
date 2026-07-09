import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export interface FontConfig {
  name: "Inter" | "JetBrains Mono";
  data: Buffer;
  weight: 400 | 600;
  style: "normal";
}

// Satori supports TTF/OTF/WOFF only (not WOFF2). @fontsource ships .woff — use that.
export async function loadFonts(): Promise<FontConfig[]> {
  const paths = {
    interRegular: require.resolve("@fontsource/inter/files/inter-latin-400-normal.woff"),
    interBold: require.resolve("@fontsource/inter/files/inter-latin-600-normal.woff"),
    mono: require.resolve("@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff"),
  };

  const [interRegular, interBold, mono] = await Promise.all([
    readFile(paths.interRegular),
    readFile(paths.interBold),
    readFile(paths.mono),
  ]);

  return [
    { name: "Inter", data: interRegular, weight: 400, style: "normal" },
    { name: "Inter", data: interBold, weight: 600, style: "normal" },
    { name: "JetBrains Mono", data: mono, weight: 400, style: "normal" },
  ];
}
