import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

export interface FontFaces {
  readonly sans400: string;
  readonly sans700: string;
  readonly mono400: string;
}

const require = createRequire(import.meta.url);

function base64(specifier: string): string {
  return readFileSync(require.resolve(specifier)).toString("base64");
}

/**
 * B612 was drawn by Airbus for cockpit displays: legibility for operators under
 * load. An operator workstation is the nearest thing a building has to a
 * cockpit. Embedded as data URIs because SVGs loaded through <img> cannot fetch.
 */
export function loadFonts(): FontFaces {
  return {
    sans400: base64("@fontsource/b612/files/b612-latin-400-normal.woff2"),
    sans700: base64("@fontsource/b612/files/b612-latin-700-normal.woff2"),
    mono400: base64("@fontsource/b612-mono/files/b612-mono-latin-400-normal.woff2"),
  };
}
