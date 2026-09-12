# GitHub Profile Visual Redesign — sabahattink/sabahattink

**Date:** 2026-09-12
**Status:** Direction approved by user (v14 palette + dashboard-card architecture + dual light/dark), two content corrections applied; spec drafted, pending spec-review + user sign-off before implementation planning.
**Repo:** `H:\10_ENGINEERING\sabahattink` (github.com/sabahattink/sabahattink)
**Supersedes:** §5 (Visual System) of `docs/superpowers/specs/2026-07-09-github-profile-design.md`. §§1–4 and §§6–8 of that spec (content structure, selected projects, production architecture, accessibility, out-of-scope) remain in force and are not touched by this document — this is a visual-system revision only.

## 1. Intent

Reskin the three Satori-generated SVG assets (Hero, StatStrip, SectionDivider) that make up the GitHub profile README, moving from the current dark-mode-first minimal "Editorial Mono" system to a warm, indigo-accented "dashboard card" system — adopting the palette, type, and rounded-card visual grammar already validated in the user's personal brand site (`Sabahattin Kalkan` project, design direction v14), while borrowing structural cues (bordered stat tiles, nested tinted panels, pill dividers) from `zalak-patel.com`.

**Explicit non-goal:** this is not a "GitHub metrics dashboard." The profile stays an **engineering profile** — content foregrounds what kind of systems the person builds (systems · software · buildings), not follower/star counts. Visual grammar is borrowed from the reference sites; content positioning is not.

## 2. Palette

Both modes derive from the same brand, verified programmatically against the repo's existing `contrastRatio()` WCAG-AA test (`src/contrast.test.ts`, 4.5:1 minimum for every text-bearing token vs. its mode's `bg`). Values below are the target starting point; if implementation nudges any value by a few percent lightness to clear the automated test, the hue/saturation intent below is what must be preserved.

| Token | Light | Dark | Notes |
|---|---|---|---|
| `bg` | `#f0efec` | `#1c1a1d` | Canvas background — page color, not card color |
| `surface` | `#fcfbf8` | `#242226` | Card/panel background |
| `neutralHigh` (ink) | `#27272c` | `#f5f3ee` | Primary text |
| `neutralMid` (muted) | `#68676f` | `#9a969f` | Secondary text, labels — both verified ≥4.5:1 (light ≈4.86:1, dark ≈5.96:1) |
| `accent` | `#5145c6` | `#9089db` | Dark value derived, not guessed — see below |
| `accentSoft` (new token) | `#eae6f8` | `#2b2740` | Background-only tint for nested panels/pills — no text sits directly on it without also using `neutralHigh`/`accent`, so it is not part of the AA-tested field set |
| `success` | `#3a7048` | `#6fbf86` | Verified ≥4.5:1 (light ≈5.09:1, dark ≈7.80:1). Unused by any current component; kept for schema parity with `contrast.test.ts`'s generic field sweep |
| `warning` | `#8a5a12` | `#e0a052` | Verified ≥4.5:1 (light ≈5.14:1, dark ≈7.66:1). Same status as `success` |
| `hairline` (line) | `#e1dfda` | `#332f34` | Borders/rules only — not in the AA-tested field set (no text renders in this color) |

**Dark accent derivation (method, not guesswork):** light accent `#5145c6` converts to HSL(246°, 53%, 52%). Holding hue and saturation fixed and raising lightness to 70% — HSL(246°, 53%, 70%) — gives `#9089db` (rounding `#928adb`→`#9089db` for a cleaner hex), which measures ≈5.66:1 against dark `bg`. This is "the nearest v14 tone that clears AA," not an arbitrarily chosen lighter purple.

## 3. Typography

Replaces Inter + JetBrains Mono with the fonts already validated in brand-site v14:

- **Space Grotesk** — display, body, tile values. Weights 400, 500, 600 (matches v14's usage: ~500 for headings, 400 for body).
- **Space Mono** — eyebrows, labels, tags, meta text. Weight 400 only (labels never need bold in the current anatomy).

Same technical constraint as before: Satori cannot use system/browser fonts, so both are loaded as font buffers at build time from `@fontsource/space-grotesk` and `@fontsource/space-mono`, reading the `.woff` files specifically (Satori supports TTF/OTF/WOFF, not WOFF2 — `@fontsource` ships both, current `fonts.ts` already has this exact pattern for Inter/JetBrains Mono, only the package names/paths change). `docs/FONTS.md` gets updated with the new font/weight/license table (both OFL-1.1, same as today).

`src/tokens.ts`'s `typeScale` entries keep their existing names (`kicker`, `display`, `body`, `label`, `value`, `meta`, `statValue`) so component code doesn't need a rename pass — only `fontSize`/`letterSpacing` values and the `fontFamily` strings used in components change.

## 4. Component anatomy

### 4.1 Hero — "Studio Card"

Canvas grows from 1200×300 to **1200×328** (+28px) — flagged explicitly: the right-hand panel now holds two-line wrapped values (see §4.1.3) instead of the old single-line spec fields, and 300px was tuned for the old, shorter content. This is the one canvas-size change on Hero.

**4.1.1 Canvas & card**
- Canvas: 1200×328, filled with `bg`.
- Inset card: 14px margin on all sides → card box 1172×300, `surface` background, 1px `hairline` border, **22px border-radius** (reused directly from v14's `--radius: 22px`), subtle single-layer box-shadow (e.g. `0 2px 3px rgba(0,0,0,0.03)` on light, a slightly stronger equivalent on dark — matches v14's own near-invisible card shadow, not a heavy drop shadow).
- Card internal padding: **50px left/right, 24px top/bottom.** The 50px figure is deliberate, not a round default: 14px canvas inset + 50px padding = 64px from the canvas edge to the first line of content — matching `marginX` exactly, so Hero's content aligns with StatStrip's and SectionDivider's content on the same left/right edges when the three assets stack in the README. (An earlier draft of this spec claimed this alignment while actually using 32px padding, which put content 18px out of alignment — corrected here.)

**4.1.2 Eyebrow row (replaces the old meta bar; no more `REV {date}`)**
- Left: a 6px accent-colored dot + `ENGINEERING PROFILE` (Space Mono 10px, tracked +0.15em, `neutralMid`).
- Right: `SYSTEMS · SOFTWARE · BUILDINGS` (Space Mono 10px, tracked +0.15em, `neutralMid`) — a stable positioning marker, not a generated value. Nothing in the SVG is dynamic per-render anymore except the live stat data in StatStrip (§4.2), which was always meant to carry the dynamic numbers per the original spec's content/visual split.
- 14px gap, then a full-width `hairline` rule, then 24px gap before the two-column body.

**4.1.3 Two-column body** (content box: 1172 − 2×50 = 1072px wide)
- **Left column, 652px** (kicker → name → mission, unchanged structurally from today, narrowed from an earlier 680px draft to make the alignment fix in §4.1.1 add up):
  - Kicker: Space Mono 11px, tracked +0.1em, `accent`.
  - 10px gap. Name: Space Grotesk 600, ~52px, letter-spacing −0.03em, `neutralHigh`.
  - 14px gap. Mission line: Space Grotesk 400, 15px, line-height 1.5, `neutralMid`, wraps within 652px.
- 40px gap (no vertical divider line this time — the nested panel's own border in 4.1.3b already reads as a separator, a second hairline would be redundant).
- **Right column, 380px** (652 + 40 + 380 = 1072, confirmed) — nested tinted panel (the "embedded stat panel" from the approved direction):
  - Background `accentSoft`, 14px border-radius, 18px padding.
  - Three `SpecField` rows, 14px gap between rows:
    - **FOCUS** — label (Space Mono 9px, tracked +0.08em, `neutralMid`) + value (Space Grotesk 400, 12px, line-height 1.35, `neutralHigh`, wraps up to 2 lines). Content: *"Systems that connect software with physical infrastructure"*.
    - **DOMAINS** *(renamed from `STACK` — this is the field the user corrected: conceptual domains, not a framework list)* — same label/value styling. Content: *"Building Automation · Software Architecture · Engineering Tools"*.
    - **BASED** — same styling, single line. Content: *"Baku, Azerbaijan"* (unchanged).

**4.1.4 `HeroData` type change:** `stack: string` → `domains: string`; `revDate` field removed entirely (was only ever used for the now-deleted meta-bar right side). `generate.ts`'s `HERO_DATA` object and `todayRev()` helper both get updated/removed accordingly — `todayRev()` is dead code once nothing consumes it.

### 4.2 StatStrip — three positioning tiles (not a metrics dashboard)

Canvas grows from 1200×60 to **1200×150** — flagged explicitly, same reasoning as the original design conversation: real card content (a tag + a large value + a wrapping caption) needs real height; a 60px strip only ever fit a single line of inline text.

**Content — replaces FOLLOWERS/PUBLIC REPOS/STARS entirely:**

| Tile | Tag | Value | Caption |
|---|---|---|---|
| 1 | `03` | `CORE DISCIPLINES` | Systems · Software · Buildings |
| 2 | `FIELD` | `→ PRODUCTION` | From physical infrastructure to deployed software |
| 3 | `BAKU` | `AZ` | Engineering from Azerbaijan |

This directly implements the user's "dashboardvari" option: each tile's *shape* is identical (tag / value / caption) but the *content type* varies per tile — a count-style tag, an arrow-statement, and a location code — mirroring the visual variety of zalak-patel's own dashboard (a photo card, a number+gauge card, a table card) without adopting her vanity-metric content.

**Anatomy per tile:**
- Canvas: 1200×150, filled with `bg`; 12px top/bottom padding, so each tile is 126px tall.
- Tile width: `(1200 − 2×64 − 2×20) / 3 = 344px` (marginX=64 kept identical to Hero/Divider for edge alignment across all three stacked assets; 20px gap between tiles).
- Tile card: `surface` background, 1px `hairline` border, 16px border-radius, 16px internal padding.
- Tag: Space Mono 9px, tracked +0.1em, `neutralMid`.
- 8px gap. Value: Space Grotesk 600, 22px, letter-spacing −0.02em, `neutralHigh`, single line.
- 6px gap. Caption: Space Grotesk 400, 12px, line-height 1.4, `neutralMid`, wraps up to 2 lines.

**Data plumbing:** `StatStrip`'s signature changes from `StatStrip(mode: Mode, stats: GithubStats)` to `StatStrip(mode: Mode, tiles: StatTileData[])`, where `StatTileData = { tag: string; value: string; caption: string }`. The three rows in the table above become a `STAT_DATA: StatTileData[]` constant in `generate.ts`, defined and passed the same way `HERO_DATA` is today — static content, not fetched. `generate.ts`'s `StatStrip("dark", stats)` / `StatStrip("light", stats)` call sites change to `StatStrip("dark", STAT_DATA)` / `StatStrip("light", STAT_DATA)`.

**`GithubStats` usage:** the live follower/repo/star numbers this component used to render are no longer displayed anywhere. `fetchGithubStats()` becomes dead code in `generate.ts` once this change lands (no remaining caller) — `github-data.ts`'s fetch module itself is out of scope to remove in this pass (§8 below), but the now-unused call to `fetchGithubStats()`/`options.fetchStats` in `generate()` is a real dangling reference this spec must account for, not just the module file — see open question OQ-3.

### 4.3 SectionDivider — pill + hairline (unchanged approach, re-themed)

Confirmed as the right call in the original direction — not converted into a card. Canvas stays 1200×48, unchanged.

- Two `hairline`-colored 1px rules (flex:1 each side), 16px margin to the pill.
- Pill badge: `accentSoft` background, 14px border-radius, 6px vertical / 14px horizontal padding, label text `TECH STACK` in Space Mono 10px, tracked +0.12em, `accent` color.
- No numeric prefix (e.g. "01 ·") — the component has exactly one call site today (between "How I Build Software" and "Tech Stack," per the original spec §6), and a sequence number with no other numbered dividers to relate to would imply structure that doesn't exist yet. If a second divider use is added later, revisit numbering then.

## 5. Files touched

| File | Change |
|---|---|
| `src/tokens.ts` | New color values (§2), add `accentSoft` field to `ColorTokens`, `HeroData`-adjacent spacing constants (card insets/radii), `statStripHeight` 60→150, `heroHeight` 300→328 |
| `src/fonts.ts` | Swap font packages/paths (§3), update `FontConfig["name"]` union type |
| `src/fonts.test.ts` | Currently hard-asserts `["Inter", "JetBrains Mono"]` and Inter weights 400/600 — must be updated to assert `["Space Grotesk", "Space Mono"]` and the new 400/500/600 weight set, or it fails immediately once `fonts.ts` changes |
| `package.json` | Add `@fontsource/space-grotesk` and `@fontsource/space-mono`; remove `@fontsource/inter` and `@fontsource/jetbrains-mono` (fully replaced, not kept alongside) |
| `docs/FONTS.md` | New font/weight/license table |
| `src/components/hero.ts` + `hero.test.ts` | Card wrapper, new eyebrow row, nested tinted panel, `HeroData.stack`→`domains`, `revDate` removed |
| `src/components/stat-strip.ts` + `stat-strip.test.ts` | Full content/anatomy rebuild (§4.2); `Stat()` helper signature changes from `(label, value: number)` to `(tag, value: string, caption: string)`; `StatStrip()`'s own signature changes from `(mode, stats: GithubStats)` to `(mode, tiles: StatTileData[])` |
| `src/components/section-divider.ts` + `section-divider.test.ts` | Pill re-theme (§4.3) |
| `src/generate.ts` | `HERO_DATA.stack`→`domains` with new copy; new `STAT_DATA: StatTileData[]` constant (§4.2) replacing the `fetchGithubStats()`-sourced `stats` variable at both `StatStrip(...)` call sites; `todayRev()` removed, `revDate` no longer threaded through |
| Existing overflow-guard and contrast tests | Extended/adjusted for new dimensions, not rewritten from scratch — the sweep pattern in `hero.test.ts` already generalizes to the new card layout |

**Not touched:** `README.md` prose/structure, asset filenames, GitHub Action, `scripts/check-readme.ts` (pending a quick check at implementation time that it doesn't assert anything about the old StatStrip content), dark/light `<picture>` delivery mechanism.

## 6. Accessibility

- All text-bearing token pairs re-verified via the existing `contrast.test.ts` generic sweep (§2) — no manual eyeballing.
- `accentSoft` panels always pair with `neutralHigh` or `accent` text (never bare `neutralMid` on `accentSoft` without checking, since `accentSoft` is a light/soft tint and contrast against it isn't automatically implied by its contrast against `bg`) — implementation must add explicit contrast assertions for `neutralHigh`-on-`accentSoft` and `accent`-on-`accentSoft` in both modes, since the current generic sweep only checks tokens against `bg`, not against `accentSoft`.

## 7. Open questions (non-blocking — do not gate implementation start)

- **OQ-1:** `HERO_DATA.kicker` (`"SYSTEMS ARCHITECT"`) and `missionLine` (currently AI-infra/dev-tooling framed) were not part of the user's requested copy changes — only `DOMAINS`/`FOCUS`/`BASED` and the eyebrow were specified. Given the new positioning foregrounds physical infrastructure + buildings alongside software, the kicker/mission may now read slightly inconsistently with the right-hand panel. Not touching this without explicit confirmation — flagging for the user rather than inventing new professional-identity copy.
- **OQ-2:** Exact pixel values in §4.1/§4.2 are a verified-on-paper starting point (typographic budget was hand-computed to fit within the stated canvas sizes) but will be finalized against the repo's existing automated overflow-guard tests (the `hero.test.ts` bounding-box sweep pattern) during implementation, the same way the current Hero's proportions were tuned per that file's own inline comments.
- **OQ-3:** `github-data.ts` (live follower/repo/star fetch) has no remaining caller once StatStrip no longer renders those numbers. Leaving the fetch module in place but unused is a reasonable default (cheap to keep, easy to reuse later, avoids a churny deletion mid-redesign) — but worth a explicit user call before implementation: keep it dormant, or remove it now since nothing renders its output?

## 8. Explicitly out of scope (this pass)

- Rewriting `README.md` markdown content/section order.
- Changing which GitHub Action/generator architecture is used.
- Removing `github-data.ts` (see OQ-3).
- Any change to Selected Projects, Engineering Utilities, or other markdown-only sections.
