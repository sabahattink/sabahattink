# Fonts

This profile's generated SVG assets (hero, stat strip, section divider) embed two typefaces, loaded at build time from their npm packages — no font files are committed to this repository.

| Font | Package | Weights used | Used for | License |
|---|---|---|---|---|
| Space Grotesk | `@fontsource/space-grotesk` | 400, 600 | Display name, mission line, tile/spec values | SIL Open Font License 1.1 (bundled in the npm package) |
| Space Mono | `@fontsource/space-mono` | 400 | Eyebrows, kicker, spec/tile labels, divider pill label | SIL Open Font License 1.1 (bundled in the npm package) |

Both packages ship WOFF and WOFF2 files only (no TTF). `src/fonts.ts` specifically loads the `.woff` variant, because [Satori](https://github.com/vercel/satori) — the SVG renderer used by `src/generate.ts` — supports TTF, OTF, and WOFF only (not WOFF2).

Each package's own license file (OFL-1.1) ships inside `node_modules/@fontsource/{space-grotesk,space-mono}/LICENSE` after `pnpm install` and is not duplicated here, since the fonts themselves aren't vendored into this repo.
