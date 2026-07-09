# Fonts

This profile's generated SVG assets (hero, stat strip, section divider) embed two typefaces, loaded at build time from their npm packages — no font files are committed to this repository.

| Font | Package | Weights used | Used for | License |
|---|---|---|---|---|
| Inter | `@fontsource/inter` | 400, 600 | Display name, body copy, spec-rail values | SIL Open Font License 1.1 (bundled in the npm package) |
| JetBrains Mono | `@fontsource/jetbrains-mono` | 400 | Spec-rail labels, meta bar (kicker/revision text) | SIL Open Font License 1.1 (bundled in the npm package) |

Both packages ship WOFF and WOFF2 files only (no TTF). `src/fonts.ts` specifically loads the `.woff` variant, because [Satori](https://github.com/vercel/satori) — the SVG renderer used by `src/generate.ts` — supports TTF, OTF, and WOFF only (not WOFF2).

Each package's own license file (OFL-1.1) ships inside `node_modules/@fontsource/{inter,jetbrains-mono}/LICENSE` after `pnpm install` and is not duplicated here, since the fonts themselves aren't vendored into this repo.
