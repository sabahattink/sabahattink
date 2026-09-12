# GitHub Profile Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the three Satori-generated SVG assets (Hero, StatStrip, SectionDivider) behind the `sabahattink` GitHub profile README from the current dark-first "Editorial Mono" system to a warm, indigo-accented "dashboard card" system (v14 brand palette + Space Grotesk/Space Mono + rounded cards), reorienting StatStrip's content from GitHub vanity metrics to engineering positioning, and removing the now-dead GitHub-metrics fetch code.

**Architecture:** No architectural change — same `tokens.ts` → `components/*.ts` → `generate.ts` → Satori → SVG pipeline as today. This plan only changes token values, font sourcing, component internals, and static content; the dark/light `<picture>` delivery mechanism, GitHub Action, and README structure are untouched.

**Tech Stack:** TypeScript, Satori (flexbox→SVG renderer), Vitest, `@fontsource/*` (font packages), pnpm.

**Spec:** `docs/superpowers/specs/2026-09-12-github-profile-visual-redesign-design.md` (read this first for full rationale — this plan implements it verbatim; if anything here seems to contradict it, the spec wins and this plan has a bug).

---

## Before you start

Run these once to get a working baseline and confirm current state:

```bash
cd "H:/10_ENGINEERING/sabahattink"
pnpm install
pnpm run typecheck
pnpm test
```

Expected: typecheck passes, all existing tests pass (this is the pre-redesign baseline — every task below should leave the suite green again before its commit).

---

### Task 1: Swap font dependencies (Inter/JetBrains Mono → Space Grotesk/Space Mono)

**Files:**
- Modify: `package.json`
- Modify: `docs/FONTS.md`

Both new packages are confirmed to exist and ship `.woff` files at the exact paths this repo's loading pattern needs (verified against the published package contents at version `5.3.0`):
- `@fontsource/space-grotesk/files/space-grotesk-latin-{400,500,600}-normal.woff`
- `@fontsource/space-mono/files/space-mono-latin-400-normal.woff`

- [ ] **Step 1: Remove the old font packages, add the new ones**

```bash
pnpm remove @fontsource/inter @fontsource/jetbrains-mono
pnpm add @fontsource/space-grotesk@^5.3.0 @fontsource/space-mono@^5.3.0
```

- [ ] **Step 2: Confirm the packages installed with the expected files**

Run: `ls node_modules/@fontsource/space-grotesk/files/ | grep -E "latin-(400|500|600)-normal.woff$"`
Expected: three lines, one per weight (400, 500, 600).

Run: `ls node_modules/@fontsource/space-mono/files/ | grep "latin-400-normal.woff$"`
Expected: one matching line.

- [ ] **Step 3: Update `docs/FONTS.md`**

Replace the file's table and prose with:

```markdown
# Fonts

This profile's generated SVG assets (hero, stat strip, section divider) embed two typefaces, loaded at build time from their npm packages — no font files are committed to this repository.

| Font | Package | Weights used | Used for | License |
|---|---|---|---|---|
| Space Grotesk | `@fontsource/space-grotesk` | 400, 600 | Display name, mission line, tile/spec values | SIL Open Font License 1.1 (bundled in the npm package) |
| Space Mono | `@fontsource/space-mono` | 400 | Eyebrows, kicker, spec/tile labels, divider pill label | SIL Open Font License 1.1 (bundled in the npm package) |

Both packages ship WOFF and WOFF2 files only (no TTF). `src/fonts.ts` specifically loads the `.woff` variant, because [Satori](https://github.com/vercel/satori) — the SVG renderer used by `src/generate.ts` — supports TTF, OTF, and WOFF only (not WOFF2).

Each package's own license file (OFL-1.1) ships inside `node_modules/@fontsource/{space-grotesk,space-mono}/LICENSE` after `pnpm install` and is not duplicated here, since the fonts themselves aren't vendored into this repo.
```

(Weight 500 is loaded — see Task 2 — but not currently used by any component; if a future component uses it, add it to the "Weights used" column then. Documenting only what's actually rendered keeps this table honest.)

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml docs/FONTS.md
git commit -m "$(cat <<'EOF'
build: swap Inter/JetBrains Mono for Space Grotesk/Space Mono

Matches the brand-site v14 typography system. Task 2 updates the
font-loading code to use these packages.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Update `fonts.ts` to load Space Grotesk / Space Mono

**Files:**
- Modify: `src/fonts.ts`
- Test: `src/fonts.test.ts`

- [ ] **Step 1: Rewrite the failing test**

Replace `src/fonts.test.ts` entirely:

```typescript
import { describe, it, expect } from "vitest";
import { loadFonts } from "./fonts.js";

describe("loadFonts", () => {
  it("loads Space Grotesk (400/500/600) and Space Mono (400) as non-empty buffers", async () => {
    const fonts = await loadFonts();
    expect(fonts).toHaveLength(4);
    for (const font of fonts) {
      expect(font.data.byteLength).toBeGreaterThan(1000);
      expect(["Space Grotesk", "Space Mono"]).toContain(font.name);
    }
  });

  it("includes weights 400, 500, and 600 for Space Grotesk", async () => {
    const fonts = await loadFonts();
    const weights = fonts.filter((f) => f.name === "Space Grotesk").map((f) => f.weight);
    expect(weights).toContain(400);
    expect(weights).toContain(500);
    expect(weights).toContain(600);
  });

  it("includes weight 400 for Space Mono", async () => {
    const fonts = await loadFonts();
    const weights = fonts.filter((f) => f.name === "Space Mono").map((f) => f.weight);
    expect(weights).toContain(400);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `pnpm exec vitest run src/fonts.test.ts`
Expected: FAIL — `loadFonts` still resolves `@fontsource/inter`/`@fontsource/jetbrains-mono`, which Task 1 already removed from `node_modules`, so `require.resolve` throws `MODULE_NOT_FOUND`.

- [ ] **Step 3: Rewrite `src/fonts.ts`**

```typescript
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
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `pnpm exec vitest run src/fonts.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/fonts.ts src/fonts.test.ts
git commit -m "$(cat <<'EOF'
feat: load Space Grotesk and Space Mono for SVG rendering

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Update `tokens.ts` — palette, `accentSoft`, spacing, type scale

**Files:**
- Modify: `src/tokens.ts`
- Test: `src/contrast.test.ts`

This task changes every color value and most spacing/type-scale constants at once, since they're one cohesive token file with no partial-migration state that makes sense. Components (Tasks 4–6) will fail to typecheck against the old `typeScale` field names until this lands — that's expected and is fixed in those later tasks, not here.

- [ ] **Step 1: Add failing contrast tests for the new `accentSoft` token**

`accentSoft` is a background-only tint — it's not part of the existing generic `fields` sweep in `contrast.test.ts` (that sweep checks text tokens against `bg`; `accentSoft` is a panel background, checked against the text that sits on it instead). Add this describe block to the end of `src/contrast.test.ts`:

```typescript
describe("accentSoft panel contrast — WCAG AA (4.5:1 minimum)", () => {
  const AA = 4.5;

  for (const mode of ["dark", "light"] as const) {
    it(`${mode}.neutralHigh vs ${mode}.accentSoft passes AA`, () => {
      const ratio = contrastRatio(colors[mode].neutralHigh, colors[mode].accentSoft);
      expect(ratio).toBeGreaterThanOrEqual(AA);
    });

    it(`${mode}.accent vs ${mode}.accentSoft passes AA`, () => {
      const ratio = contrastRatio(colors[mode].accent, colors[mode].accentSoft);
      expect(ratio).toBeGreaterThanOrEqual(AA);
    });
  }
});
```

- [ ] **Step 2: Run the tests, confirm the new ones fail**

Run: `pnpm exec vitest run src/contrast.test.ts`
Expected: FAIL — `colors[mode].accentSoft` is `undefined` (field doesn't exist yet on `ColorTokens`), so `contrastRatio(undefined, ...)` throws inside `hexToRgb`.

- [ ] **Step 3: Rewrite `src/tokens.ts`**

```typescript
export type Mode = "dark" | "light";

export interface ColorTokens {
  readonly bg: string;
  readonly surface: string;
  readonly neutralMid: string;
  readonly neutralHigh: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly success: string;
  readonly warning: string;
  readonly hairline: string;
}

export const colors: Record<Mode, ColorTokens> = {
  dark: {
    bg: "#1c1a1d",
    surface: "#242226",
    neutralMid: "#9a969f",
    neutralHigh: "#f5f3ee",
    accent: "#9089db",
    accentSoft: "#2b2740",
    success: "#6fbf86",
    warning: "#e0a052",
    hairline: "#332f34",
  },
  light: {
    bg: "#f0efec",
    surface: "#fcfbf8",
    neutralMid: "#68676f",
    neutralHigh: "#27272c",
    accent: "#5145c6",
    accentSoft: "#eae6f8",
    success: "#3a7048",
    warning: "#8a5a12",
    hairline: "#e1dfda",
  },
} as const;

export const spacing = {
  marginX: 64,
  heroWidth: 1200,
  heroHeight: 328,
  statStripHeight: 150,
  dividerHeight: 48,
  cardInset: 14,
  cardRadius: 22,
  cardPaddingX: 50,
  cardPaddingY: 24,
  panelRadius: 14,
  panelPadding: 18,
  tileGap: 20,
  tileRadius: 16,
  tilePadding: 16,
} as const;

export const typeScale = {
  eyebrow: { fontSize: "10px", fontWeight: 400 as const, letterSpacing: "1.5px" },
  kicker: { fontSize: "11px", fontWeight: 400 as const, letterSpacing: "1.1px" },
  display: { fontSize: "52px", fontWeight: 600 as const, letterSpacing: "-1.6px" },
  body: { fontSize: "15px", fontWeight: 400 as const },
  specLabel: { fontSize: "9px", fontWeight: 400 as const, letterSpacing: "0.7px" },
  specValue: { fontSize: "12px", fontWeight: 400 as const },
  tileTag: { fontSize: "9px", fontWeight: 400 as const, letterSpacing: "0.9px" },
  tileValue: { fontSize: "22px", fontWeight: 600 as const, letterSpacing: "-0.4px" },
  tileCaption: { fontSize: "12px", fontWeight: 400 as const },
  pillLabel: { fontSize: "10px", fontWeight: 400 as const, letterSpacing: "1.2px" },
} as const;
```

**Note on the derivation behind these values** (so the next reader isn't left guessing): dark `accent` (`#9089db`) is `#5145c6`'s hue (246°) and saturation (53%) held fixed, with lightness raised to 70% until the pair clears 4.5:1 against dark `bg` — see spec §2 for the full HSL derivation and computed ratios (light `neutralMid` ≈4.86:1, dark `neutralMid` ≈5.96:1, dark `accent` ≈5.66:1, light/dark `success` ≈5.09:1/7.80:1, light/dark `warning` ≈5.14:1/7.66:1). If Step 4 below finds any of these fail in practice, nudge lightness by a percent or two in the same hue/saturation, don't change the hue.

- [ ] **Step 4: Run the full test suite, confirm contrast tests pass**

Run: `pnpm exec vitest run src/contrast.test.ts`
Expected: PASS (all `accentSoft` tests + the pre-existing generic `fields` sweep, now validating the new hex values)

Run: `pnpm run typecheck`
Expected: FAIL — `src/components/hero.ts`, `stat-strip.ts`, `section-divider.ts` still reference the old `typeScale` field names (`label`, `value`, `meta`, `statValue`) which no longer exist. This is expected; Tasks 4–6 fix it. Confirm the *only* errors are in those three component files (not, say, a typo in `tokens.ts` itself) before moving on.

- [ ] **Step 5: Commit**

```bash
git add src/tokens.ts src/contrast.test.ts
git commit -m "$(cat <<'EOF'
feat: adopt v14 brand palette and dashboard-card spacing/type tokens

New light/dark color values (warm paper + indigo accent), a new
accentSoft tint token for panel/pill backgrounds, spacing constants
for the card-based Hero/StatStrip/Divider anatomy, and a type scale
matching the new component set. Dark accent is derived by holding
#5145c6's hue/saturation fixed and raising lightness until it clears
WCAG AA against the dark background (~5.66:1) — see the design spec
for the full derivation.

Components still reference the old typeScale field names and will be
fixed in the next three tasks; typecheck is expected to fail on those
files until then.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Rebuild Hero as a "Studio Card"

**Files:**
- Modify: `src/components/hero.ts`
- Test: `src/components/hero.test.ts`

Removes `revDate` entirely (no more `REV {date}`), renames `stack`→`domains`, wraps the content in a rounded/bordered card, replaces the old meta bar with a static eyebrow row, and moves the spec rail into a nested tinted panel.

- [ ] **Step 1: Rewrite `src/components/hero.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import satori from "satori";
import { Hero } from "./hero.js";
import { loadFonts } from "../fonts.js";
import { spacing } from "../tokens.js";
import { assertSvgDimensions, getAttr } from "../test-utils/svg.js";

const SAMPLE_DATA = {
  name: "Sabahattin Kalkan",
  kicker: "SYSTEMS · SOFTWARE · BUILDINGS",
  missionLine: "Engineering software and physical systems from architecture to deployment.",
  focus: "Systems that connect software with physical infrastructure",
  domains: "Building Automation · Software Architecture · Engineering Tools",
  based: "Baku, Azerbaijan",
};

describe("Hero", () => {
  it("renders the expected canvas size and all content, with no REV/date field", async () => {
    const fonts = await loadFonts();
    const node = Hero("dark", SAMPLE_DATA);
    const svg = await satori(node as never, {
      width: spacing.heroWidth,
      height: spacing.heroHeight,
      fonts,
      embedFont: false,
    });

    assertSvgDimensions(svg, spacing.heroWidth, spacing.heroHeight);

    // Satori segments multi-word text into one <text> per word even with
    // embedFont: false, so assert on individual words rather than full phrases.
    for (const word of ["Sabahattin", "Kalkan", "SYSTEMS", "BUILDINGS", "FOCUS", "DOMAINS", "BASED"]) {
      expect(svg).toContain(word);
    }

    // The old meta bar's dynamic "REV {date}" field is gone — this is the
    // regression guard for that removal, not just an absence-of-content check.
    expect(svg).not.toContain("REV");
  });

  it("renders the card and nested panel as distinct backgrounds within canvas bounds", async () => {
    const fonts = await loadFonts();
    const node = Hero("dark", SAMPLE_DATA);
    const svg = await satori(node as never, {
      width: spacing.heroWidth,
      height: spacing.heroHeight,
      fonts,
      embedFont: false,
    });

    const { cardInset, heroWidth, heroHeight } = spacing;
    const cardWidth = heroWidth - cardInset * 2;
    const cardHeight = heroHeight - cardInset * 2;

    // The card's own background rect: inset by cardInset on all sides, sized
    // cardWidth x cardHeight. This is the specific regression guard for the
    // "rebuilt as a dashboard card" requirement — a plain re-skin without a
    // real inset card would not produce a rect at these exact coordinates.
    const cardRectPattern = new RegExp(
      `<rect x="${cardInset}(?:\\.0+)?" y="${cardInset}(?:\\.0+)?" width="${cardWidth}(?:\\.0+)?" height="${cardHeight}(?:\\.0+)?"`
    );
    expect(svg).toMatch(cardRectPattern);

    // Loose canvas-bound sweep: nothing should extend past the declared canvas,
    // regardless of how the card/panel layout evolves.
    const elementPattern = /<(rect|text)\s+([^>]*)\/?>/g;
    const attr = (attrs: string, name: string): number => Number(getAttr(attrs, name) ?? 0);
    let match: RegExpExecArray | null;
    let checkedCount = 0;

    while ((match = elementPattern.exec(svg)) !== null) {
      const attrs = match[2];
      const x = attr(attrs, "x");
      const y = attr(attrs, "y");
      const w = attr(attrs, "width");
      const h = attr(attrs, "height");

      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(heroWidth);
      expect(y + h).toBeLessThanOrEqual(heroHeight);
      checkedCount += 1;
    }

    expect(checkedCount).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `pnpm exec vitest run src/components/hero.test.ts`
Expected: FAIL to even compile/run — current `hero.ts` still expects `HeroData.stack`/`revDate` (missing from `SAMPLE_DATA` here) and references removed `typeScale` fields.

- [ ] **Step 3: Rewrite `src/components/hero.ts`**

```typescript
import { h, type SatoriNode } from "../satori-h.js";
import { colors, spacing, typeScale, type Mode, type ColorTokens } from "../tokens.js";

export interface HeroData {
  name: string;
  kicker: string;
  missionLine: string;
  focus: string;
  domains: string;
  based: string;
}

function SpecField(c: ColorTokens, label: string, value: string): SatoriNode {
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column" } },
    h(
      "span",
      { style: { ...typeScale.specLabel, fontFamily: "Space Mono", color: c.neutralMid } },
      label
    ),
    h(
      "span",
      {
        style: {
          ...typeScale.specValue,
          fontFamily: "Space Grotesk",
          color: c.neutralHigh,
          marginTop: "6px",
          lineHeight: 1.35,
        },
      },
      value
    )
  );
}

export function Hero(mode: Mode, data: HeroData): SatoriNode {
  const c = colors[mode];
  const {
    heroWidth: width,
    heroHeight: height,
    cardInset,
    cardRadius,
    cardPaddingX,
    cardPaddingY,
    panelRadius,
    panelPadding,
  } = spacing;
  const cardWidth = width - cardInset * 2;
  const cardHeight = height - cardInset * 2;

  return h(
    "div",
    {
      style: {
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        flexDirection: "column",
        backgroundColor: c.bg,
      },
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          width: `${cardWidth}px`,
          height: `${cardHeight}px`,
          margin: `${cardInset}px`,
          padding: `${cardPaddingY}px ${cardPaddingX}px`,
          backgroundColor: c.surface,
          border: `1px solid ${c.hairline}`,
          borderRadius: `${cardRadius}px`,
          boxShadow: mode === "dark" ? "0 2px 6px rgba(0,0,0,0.35)" : "0 2px 3px rgba(0,0,0,0.06)",
        },
      },
      // Eyebrow row — replaces the old "ENGINEERING PROFILE / REV {date}" meta
      // bar. Both sides are now stable positioning text, nothing generated
      // per-render.
      h(
        "div",
        { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "8px" } },
          h("div", {
            style: {
              display: "flex",
              width: "6px",
              height: "6px",
              borderRadius: "3px",
              backgroundColor: c.accent,
            },
          }),
          h(
            "span",
            { style: { ...typeScale.eyebrow, fontFamily: "Space Mono", color: c.neutralMid } },
            "ENGINEERING PROFILE"
          )
        ),
        h(
          "span",
          { style: { ...typeScale.eyebrow, fontFamily: "Space Mono", color: c.neutralMid } },
          "SYSTEMS · SOFTWARE · BUILDINGS"
        )
      ),
      h("div", { style: { display: "flex", marginTop: "14px", height: "1px", backgroundColor: c.hairline } }),
      // Two-column body
      h(
        "div",
        { style: { display: "flex", flex: 1, marginTop: "24px", gap: "40px" } },
        h(
          "div",
          { style: { display: "flex", flexDirection: "column", width: "652px" } },
          h(
            "span",
            { style: { ...typeScale.kicker, fontFamily: "Space Mono", color: c.accent } },
            data.kicker
          ),
          h(
            "span",
            { style: { ...typeScale.display, fontFamily: "Space Grotesk", color: c.neutralHigh, marginTop: "10px" } },
            data.name
          ),
          h(
            "span",
            {
              style: {
                ...typeScale.body,
                fontFamily: "Space Grotesk",
                color: c.neutralMid,
                marginTop: "14px",
                lineHeight: 1.5,
              },
            },
            data.missionLine
          )
        ),
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              width: "380px",
              gap: "14px",
              backgroundColor: c.accentSoft,
              borderRadius: `${panelRadius}px`,
              padding: `${panelPadding}px`,
            },
          },
          SpecField(c, "FOCUS", data.focus),
          SpecField(c, "DOMAINS", data.domains),
          SpecField(c, "BASED", data.based)
        )
      )
    )
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `pnpm exec vitest run src/components/hero.test.ts`
Expected: PASS (2 tests)

If the card-rect regex in Step 1 doesn't match (Satori's exact rect-emission order/rounding can differ from what's written above on paper), inspect the actual output — `console.log(svg)` temporarily inside the test, or write it to a scratch file — and adjust the regex to match what Satori actually emits. Don't loosen the test's intent (a real inset card rect at the expected coordinates); only correct the pattern.

If the two-column row (652 + 40 + 380 = 1072px content box) overflows the 1136px right edge implied by `cardPaddingX`, that's a real layout bug in the numbers above, not a test problem — re-check the arithmetic in spec §4.1.3 before changing anything.

- [ ] **Step 5: Commit**

```bash
git add src/components/hero.ts src/components/hero.test.ts
git commit -m "$(cat <<'EOF'
feat: rebuild Hero as a rounded dashboard card

Removes the REV {date} meta field, renames HeroData.stack to
domains, wraps content in an inset bordered/shadowed card, and moves
the spec rail into a nested accentSoft-tinted panel. Canvas grows
1200x300 -> 1200x328 to fit the new eyebrow row and two-line-wrapped
spec values (see design spec S4.1).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Rebuild StatStrip as three positioning tiles

**Files:**
- Modify: `src/components/stat-strip.ts`
- Test: `src/components/stat-strip.test.ts`

Replaces FOLLOWERS/PUBLIC REPOS/STARS with static positioning tiles (tag + large value + caption), decoupling the component entirely from `GithubStats`/`github-data.ts` (removed in Task 8).

- [ ] **Step 1: Rewrite `src/components/stat-strip.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import satori from "satori";
import { StatStrip, type StatTileData } from "./stat-strip.js";
import { loadFonts } from "../fonts.js";
import { spacing } from "../tokens.js";
import { assertSvgDimensions } from "../test-utils/svg.js";

const SAMPLE_TILES: StatTileData[] = [
  { tag: "03", value: "CORE DISCIPLINES", caption: "Systems · Software · Buildings" },
  { tag: "FIELD", value: "→ PRODUCTION", caption: "From physical infrastructure to deployed software" },
  { tag: "BAKU", value: "AZ", caption: "Engineering from Azerbaijan" },
];

describe("StatStrip", () => {
  it("renders each tile's tag, value, and caption at the expected canvas size", async () => {
    const fonts = await loadFonts();
    const node = StatStrip("dark", SAMPLE_TILES);
    const svg = await satori(node as never, {
      width: spacing.heroWidth,
      height: spacing.statStripHeight,
      fonts,
      embedFont: false,
    });

    assertSvgDimensions(svg, spacing.heroWidth, spacing.statStripHeight);

    for (const word of ["03", "CORE", "DISCIPLINES", "FIELD", "PRODUCTION", "BAKU", "AZ"]) {
      expect(svg).toContain(word);
    }

    // This is now a positioning strip, not a metrics dashboard — regression
    // guard against the old GitHub-metrics content ever reappearing here.
    for (const oldWord of ["FOLLOWERS", "REPOS", "STARS"]) {
      expect(svg).not.toContain(oldWord);
    }
  });

  it("renders three equal-width bordered tiles that sum to the full canvas width", async () => {
    const fonts = await loadFonts();
    const node = StatStrip("dark", SAMPLE_TILES);
    const svg = await satori(node as never, {
      width: spacing.heroWidth,
      height: spacing.statStripHeight,
      fonts,
      embedFont: false,
    });

    // Every tile shares the hairline border color as its stroke — count rects
    // painted with that stroke, expect exactly 3 (one per tile card).
    const strokeMatches = svg.match(new RegExp(`stroke="${colorsHairlineDark()}"`, "g")) ?? [];
    expect(strokeMatches.length).toBe(3);
  });
});

// Small local helper so the test above doesn't hardcode the dark hairline hex
// twice (once here, once implicitly via the component under test) — keeps the
// assertion tied to the actual token rather than a copy-pasted literal.
function colorsHairlineDark(): string {
  // Imported lazily to keep the import list above focused on what's under test.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { colors } = require("../tokens.js");
  return colors.dark.hairline;
}
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `pnpm exec vitest run src/components/stat-strip.test.ts`
Expected: FAIL to compile — current `stat-strip.ts` exports `Stat`/`StatStrip(mode, stats: GithubStats)`, not `StatTileData`, and still imports `github-data.js`.

- [ ] **Step 3: Rewrite `src/components/stat-strip.ts`**

```typescript
import { h, type SatoriNode } from "../satori-h.js";
import { colors, spacing, typeScale, type Mode, type ColorTokens } from "../tokens.js";

export interface StatTileData {
  tag: string;
  value: string;
  caption: string;
}

function Tile(c: ColorTokens, tileWidth: number, data: StatTileData): SatoriNode {
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: `${tileWidth}px`,
        backgroundColor: c.surface,
        border: `1px solid ${c.hairline}`,
        borderRadius: `${spacing.tileRadius}px`,
        padding: `${spacing.tilePadding}px`,
      },
    },
    h("span", { style: { ...typeScale.tileTag, fontFamily: "Space Mono", color: c.neutralMid } }, data.tag),
    h(
      "span",
      { style: { ...typeScale.tileValue, fontFamily: "Space Grotesk", color: c.neutralHigh, marginTop: "8px" } },
      data.value
    ),
    h(
      "span",
      {
        style: {
          ...typeScale.tileCaption,
          fontFamily: "Space Grotesk",
          color: c.neutralMid,
          marginTop: "6px",
          lineHeight: 1.4,
        },
      },
      data.caption
    )
  );
}

// tileWidth is computed from tiles.length rather than hardcoded, so this
// component isn't silently wrong if a future edit adds/removes a tile without
// updating a hand-picked width constant.
export function StatStrip(mode: Mode, tiles: StatTileData[]): SatoriNode {
  const c = colors[mode];
  const { heroWidth: width, statStripHeight: height, marginX, tileGap } = spacing;
  const tileWidth = (width - marginX * 2 - tileGap * (tiles.length - 1)) / tiles.length;

  return h(
    "div",
    {
      style: {
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: `${tileGap}px`,
        backgroundColor: c.bg,
        padding: `0 ${marginX}px`,
      },
    },
    ...tiles.map((t) => Tile(c, tileWidth, t))
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `pnpm exec vitest run src/components/stat-strip.test.ts`
Expected: PASS (2 tests)

If the `require()` call in the test's helper doesn't work in this project's ESM/vitest setup, replace it with a normal top-level `import { colors } from "../tokens.js";` instead — the lazy-require was only there to keep the import list minimal, not a hard requirement. Prefer the plain top-level import if there's any friction; simplicity wins here.

- [ ] **Step 5: Commit**

```bash
git add src/components/stat-strip.ts src/components/stat-strip.test.ts
git commit -m "$(cat <<'EOF'
feat: rebuild StatStrip as three positioning tiles

Replaces FOLLOWERS/PUBLIC REPOS/STARS with static tiles describing
what the person builds (core disciplines, field->production,
location) instead of GitHub vanity metrics. Canvas grows 1200x60 ->
1200x150 to fit real card content (tag + large value + wrapping
caption) per design spec S4.2. Component no longer depends on
GithubStats; Task 8 removes the now-dead fetch code.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Re-theme SectionDivider as a pill + hairline

**Files:**
- Modify: `src/components/section-divider.ts`
- Test: `src/components/section-divider.test.ts`

Lightest-touch task — same structural approach as today (label between two hairlines), just re-themed with the new tokens and a rounded pill instead of bare text.

- [ ] **Step 1: Rewrite `src/components/section-divider.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import satori from "satori";
import { SectionDivider } from "./section-divider.js";
import { loadFonts } from "../fonts.js";
import { spacing } from "../tokens.js";
import { assertSvgDimensions } from "../test-utils/svg.js";

describe("SectionDivider", () => {
  it("renders a pill-badged label between two hairlines at the token-defined size", async () => {
    const fonts = await loadFonts();
    const node = SectionDivider("dark", "TECH STACK");
    const svg = await satori(node as never, {
      width: spacing.heroWidth,
      height: spacing.dividerHeight,
      fonts,
      embedFont: false,
    });

    expect(svg).toContain("TECH");
    expect(svg).toContain("STACK");
    assertSvgDimensions(svg, spacing.heroWidth, spacing.dividerHeight);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `pnpm exec vitest run src/components/section-divider.test.ts`
Expected: FAIL to compile — current `section-divider.ts` uses the removed `typeScale.meta` field, and `spacing.dividerHeight` doesn't exist until Task 3's `tokens.ts` change (already landed) is referenced correctly here — actually it does exist now (Task 3 added it); the failure here is purely the `typeScale.meta` reference.

- [ ] **Step 3: Rewrite `src/components/section-divider.ts`**

```typescript
import { h, type SatoriNode } from "../satori-h.js";
import { colors, spacing, typeScale, type Mode } from "../tokens.js";

export function SectionDivider(mode: Mode, label: string): SatoriNode {
  const c = colors[mode];
  const { heroWidth: width, dividerHeight: height, marginX } = spacing;

  return h(
    "div",
    {
      style: {
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        alignItems: "center",
        backgroundColor: c.bg,
        padding: `0 ${marginX}px`,
      },
    },
    h("div", { style: { display: "flex", flex: 1, height: "1px", backgroundColor: c.hairline } }),
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          margin: "0 16px",
          padding: "6px 14px",
          borderRadius: "14px",
          backgroundColor: c.accentSoft,
        },
      },
      h("span", { style: { ...typeScale.pillLabel, fontFamily: "Space Mono", color: c.accent } }, label)
    ),
    h("div", { style: { display: "flex", flex: 1, height: "1px", backgroundColor: c.hairline } })
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `pnpm exec vitest run src/components/section-divider.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Run the full test suite and typecheck**

Run: `pnpm test && pnpm run typecheck`
Expected: All component/token/font tests PASS. Typecheck now only fails (if at all) on `src/generate.ts` and anything still referencing `GithubStats`/`revDate`/`HERO_DATA.stack` — that's Tasks 7–8's job.

- [ ] **Step 6: Commit**

```bash
git add src/components/section-divider.ts src/components/section-divider.test.ts
git commit -m "$(cat <<'EOF'
feat: re-theme SectionDivider as a pill-badged hairline

Kept as a lightweight divider (not converted into a card, per design
direction) — only the token/font values and the label's pill
treatment change.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Update `generate.ts` — new copy, `STAT_DATA`, remove `revDate`/`fetchStats`

**Files:**
- Modify: `src/generate.ts`
- Modify: `src/generate.test.ts`

- [ ] **Step 1: Update `src/generate.test.ts` first (it currently passes a `fetchStats` option that's about to be removed)**

Replace both `generate({ outDir, fetchStats: async () => ({...}) })` calls with plain `generate({ outDir })`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { generate } from "./generate.js";

const GENERATED_FILES = [
  "hero-dark.svg",
  "hero-light.svg",
  "stat-strip-dark.svg",
  "stat-strip-light.svg",
  "divider-dark.svg",
  "divider-light.svg",
];

describe("generate", () => {
  let outDir: string;

  beforeEach(async () => {
    outDir = await mkdtemp(path.join(tmpdir(), "generate-test-"));
  });

  afterEach(async () => {
    await rm(outDir, { recursive: true, force: true });
  });

  it("writes six SVG files (hero/stat-strip/divider x dark/light)", async () => {
    await generate({ outDir });

    for (const f of GENERATED_FILES) {
      const content = await readFile(path.join(outDir, f), "utf-8");
      expect(content).toContain("<svg");
    }
  });

  it("renders distinct dark and light output for each component (guards against a mode-wiring copy-paste bug)", async () => {
    await generate({ outDir });

    const pairs: Array<[string, string]> = [
      ["hero-dark.svg", "hero-light.svg"],
      ["stat-strip-dark.svg", "stat-strip-light.svg"],
      ["divider-dark.svg", "divider-light.svg"],
    ];

    for (const [darkFile, lightFile] of pairs) {
      const darkSvg = await readFile(path.join(outDir, darkFile), "utf-8");
      const lightSvg = await readFile(path.join(outDir, lightFile), "utf-8");
      expect(darkSvg).not.toEqual(lightSvg);
    }
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `pnpm exec vitest run src/generate.test.ts`
Expected: FAIL to compile — `generate.ts`'s `GenerateOptions` still requires/accepts the shape this test no longer passes, and still imports `fetchGithubStats`/`GithubStats` — the type error surfaces here even though the fix belongs in `generate.ts`.

- [ ] **Step 3: Rewrite `src/generate.ts`**

```typescript
import satori from "satori";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadFonts } from "./fonts.js";
import { Hero } from "./components/hero.js";
import { SectionDivider } from "./components/section-divider.js";
import { StatStrip, type StatTileData } from "./components/stat-strip.js";
import { spacing } from "./tokens.js";

const DEFAULT_OUT_DIR = path.join(process.cwd(), "assets");

interface GenerateOptions {
  outDir?: string;
}

const HERO_DATA = {
  name: "Sabahattin Kalkan",
  kicker: "SYSTEMS · SOFTWARE · BUILDINGS",
  missionLine: "Engineering software and physical systems from architecture to deployment.",
  focus: "Systems that connect software with physical infrastructure",
  domains: "Building Automation · Software Architecture · Engineering Tools",
  based: "Baku, Azerbaijan",
};

const STAT_DATA: StatTileData[] = [
  { tag: "03", value: "CORE DISCIPLINES", caption: "Systems · Software · Buildings" },
  { tag: "FIELD", value: "→ PRODUCTION", caption: "From physical infrastructure to deployed software" },
  { tag: "BAKU", value: "AZ", caption: "Engineering from Azerbaijan" },
];

export async function generate(options: GenerateOptions = {}): Promise<void> {
  const outDir = options.outDir ?? DEFAULT_OUT_DIR;
  await mkdir(outDir, { recursive: true });

  const fonts = await loadFonts();

  const jobs: Array<{ file: string; svg: () => Promise<string> }> = [
    {
      file: "hero-dark.svg",
      svg: () =>
        satori(Hero("dark", HERO_DATA) as never, { width: spacing.heroWidth, height: spacing.heroHeight, fonts }),
    },
    {
      file: "hero-light.svg",
      svg: () =>
        satori(Hero("light", HERO_DATA) as never, { width: spacing.heroWidth, height: spacing.heroHeight, fonts }),
    },
    {
      file: "stat-strip-dark.svg",
      svg: () =>
        satori(StatStrip("dark", STAT_DATA) as never, {
          width: spacing.heroWidth,
          height: spacing.statStripHeight,
          fonts,
        }),
    },
    {
      file: "stat-strip-light.svg",
      svg: () =>
        satori(StatStrip("light", STAT_DATA) as never, {
          width: spacing.heroWidth,
          height: spacing.statStripHeight,
          fonts,
        }),
    },
    {
      file: "divider-dark.svg",
      svg: () =>
        satori(SectionDivider("dark", "TECH STACK") as never, {
          width: spacing.heroWidth,
          height: spacing.dividerHeight,
          fonts,
        }),
    },
    {
      file: "divider-light.svg",
      svg: () =>
        satori(SectionDivider("light", "TECH STACK") as never, {
          width: spacing.heroWidth,
          height: spacing.dividerHeight,
          fonts,
        }),
    },
  ];

  // Render every SVG into memory first, and only write to disk once every
  // render has succeeded — see generate.test.ts's second test for why this
  // all-or-nothing ordering matters.
  const rendered = await Promise.all(jobs.map(async (job) => ({ file: job.file, svg: await job.svg() })));

  await Promise.all(rendered.map(({ file, svg }) => writeFile(path.join(outDir, file), svg)));
}

// Allow running directly: `tsx src/generate.ts`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generate()
    .then(() => console.log("Generated all assets."))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `pnpm exec vitest run src/generate.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/generate.ts src/generate.test.ts
git commit -m "$(cat <<'EOF'
feat: update Hero/StatStrip content and drop fetchStats plumbing

HERO_DATA.kicker and missionLine now match the systems/software/
buildings positioning instead of the old AI-infra-framed copy;
HERO_DATA.stack -> domains. New STAT_DATA constant supplies
StatStrip's three static tiles directly (no more live GithubStats
fetch threaded through here). todayRev()/revDate removed entirely.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Remove the dormant GitHub-metrics code

**Files:**
- Delete: `src/github-data.ts`
- Delete: `src/github-data.test.ts`
- Delete: `assets/stats-cache.json`

Nothing imports `github-data.js` anymore after Task 5 (StatStrip) and Task 7 (`generate.ts`) — confirm that before deleting, then delete cleanly per the resolved OQ-3 (git history is sufficient if ever needed again; no dormant/speculative dead code).

- [ ] **Step 1: Confirm no remaining references**

Run: `grep -rn "github-data\|GithubStats\|fetchGithubStats" src/ scripts/ .github/ --include="*.ts" --include="*.yml"`
Expected: no output (empty). If anything prints, stop and investigate — something was missed in Tasks 5/7.

- [ ] **Step 2: Delete the files**

```bash
git rm src/github-data.ts src/github-data.test.ts assets/stats-cache.json
```

- [ ] **Step 3: Run the full test suite and typecheck**

Run: `pnpm test && pnpm run typecheck`
Expected: All tests PASS, typecheck clean — this is the first point in the plan where the whole repo is fully green again end-to-end.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore: remove dormant GitHub-metrics fetch code

StatStrip no longer renders live follower/repo/star counts (Task 5),
so github-data.ts, its test, and the stats-cache.json fallback have
no remaining caller. Removed cleanly rather than kept as dead code
for speculative future reuse -- git history has it if ever needed.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Regenerate assets, visually verify, final full-suite check

**Files:**
- Modify (generated, not hand-edited): `assets/hero-dark.svg`, `assets/hero-light.svg`, `assets/stat-strip-dark.svg`, `assets/stat-strip-light.svg`, `assets/divider-dark.svg`, `assets/divider-light.svg`

This is the integration task: run the real generator (not the test suite's temp-dir version) to produce the actual committed assets, then look at them — a satori render that passes every automated assertion can still be visually wrong (misaligned padding, a color that reads worse than its contrast ratio suggests, awkward text wrapping) in ways only a human/visual check catches.

- [ ] **Step 1: Run the generator for real**

```bash
pnpm run generate
```

Expected: `Generated all assets.` printed, no errors. `git status` should show only the six `assets/*.svg` files as modified (plus the now-removed `stats-cache.json` from Task 8, already committed).

- [ ] **Step 2: Run `check:readme` to confirm the README's asset references still resolve**

```bash
pnpm run check:readme
```

Expected: `README.md OK — N local asset references all resolve.` — filenames didn't change, so this should pass without any README edit, but confirm it rather than assume it.

- [ ] **Step 3: Open each generated SVG in the Browser pane and visually check both modes**

Open `assets/hero-light.svg`, `assets/hero-dark.svg`, `assets/stat-strip-light.svg`, `assets/stat-strip-dark.svg`, `assets/divider-light.svg`, `assets/divider-dark.svg` (e.g. via the Browser pane's `navigate` to each local file path, or a quick local static server) and check for:
- Text not clipped or overflowing its card/panel.
- The Hero card's nested `accentSoft` panel readable against its own background (not just passing the automated ratio — actually look at it).
- StatStrip's three tiles visually balanced (equal width, consistent baseline).
- Divider's pill sitting centered and not touching the hairlines.
- Dark and light versions both looking intentional, not like one was an afterthought.

If anything looks wrong, fix it in the relevant component file from Tasks 4–6, re-run `pnpm test`, regenerate, and re-check — don't hand-edit the generated SVGs directly (they're build output, per the "Modify (generated, not hand-edited)" note above).

- [ ] **Step 4: Run the complete verification suite one more time**

```bash
pnpm run typecheck
pnpm test
pnpm run check:readme
```

Expected: all three clean.

- [ ] **Step 5: Commit the regenerated assets**

```bash
git add assets/
git commit -m "$(cat <<'EOF'
chore: regenerate profile assets with the redesigned visual system

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Update the design spec's status line to reflect completion**

In `docs/superpowers/specs/2026-09-12-github-profile-visual-redesign-design.md`, change the `**Status:**` line from "Approved... Proceeding to implementation planning." to "Implemented — see commits from `<Task 1 commit hash>` through `<this commit hash>`." Fill in the actual short hashes via `git log --oneline` once Step 5 lands.

```bash
git add docs/superpowers/specs/2026-09-12-github-profile-visual-redesign-design.md
git commit -m "$(cat <<'EOF'
docs: mark profile redesign spec as implemented

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Done

At this point: `pnpm test`, `pnpm run typecheck`, and `pnpm run check:readme` are all green; `assets/*.svg` reflect the new v14-palette dashboard-card system; `github-data.ts` and its dependents are gone; the design spec is marked implemented. The GitHub Action will pick up this same generator on the next push/cron run and produce identical output (deterministic — no live API dependency left in the pipeline for these assets).
