# GitHub Profile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `github.com/sabahattink/sabahattink`'s README as a Satori-generated, design-token-driven profile — an engineering-spec-style hero + stat strip in SVG, everything else in real, clickable/searchable Markdown.

**Architecture:** A small repo-local Node/TypeScript build system. `tokens.ts` holds the single source of truth for color/type/spacing. `components/` are pure functions that build Satori element trees from those tokens. `scripts/generate.ts` fetches live GitHub stats (with a committed-cache fallback if the API is unreachable), renders every SVG (dark + light), and writes them to `assets/`. A GitHub Action re-runs this on a daily cron and on push to `main`, committing back only if the output changed. The README itself is hand-written Markdown referencing the generated assets via `<picture>` tags.

**Tech Stack:** Node 22, TypeScript, `satori` (JSX-free, via a small hyperscript helper), `@fontsource/inter` + `@fontsource/jetbrains-mono` (WOFF format — confirmed Satori does not support WOFF2), `vitest` for tests, `pnpm`, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-07-09-github-profile-design.md`

---

## Verified technical facts (do not re-derive during implementation)

- Satori supports **TTF, OTF, WOFF only — not WOFF2** (confirmed against `vercel/satori` README, main branch, line 344).
- `@fontsource/inter@5.2.8` and `@fontsource/jetbrains-mono@5.2.8` both ship `.woff` files under `files/*-latin-{400,600}-normal.woff` (confirmed via unpkg, HTTP 200, `content-type: font/woff`). Use these — do not reach for `.woff2` or hunt for `.ttf` (not shipped by these packages).
- `github.com/sabahattink/llm-gateway`, `/codediag`, `/antigravity-fullstack-hq`, `/vault-os` all exist and are public (confirmed via GitHub API). `scuton-technology` org returns 404 — it no longer exists; `scuton-technology/llm-gateway` 301-redirects to `sabahattink/llm-gateway`.
- No public `mailtest` repo exists under `sabahattink` — link-less per spec.

---

## Task 0: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore` (extend existing)
- Create: `vitest.config.ts`

- [ ] **Step 1: Initialize package.json**

```bash
cd /h/10_ENGINEERING/sabahattink
pnpm init
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm add satori @fontsource/inter@5.2.8 @fontsource/jetbrains-mono@5.2.8
pnpm add -D typescript tsx vitest @types/node
```

Versions are pinned deliberately — the "Verified technical facts" above (WOFF file paths/availability) were confirmed against exactly these versions. An unpinned install could later resolve a version with a different `files/` layout; pinning removes that risk entirely.

- [ ] **Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Set package.json type + scripts**

Edit `package.json`, add:

```json
{
  "type": "module",
  "scripts": {
    "generate": "tsx src/generate.ts",
    "test": "vitest run"
  }
}
```

- [ ] **Step 5: Write vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 6: Extend .gitignore**

Append to the existing `.gitignore` (which currently only has `.superpowers/`) — exactly these two lines. Do **not** add `assets/stats-cache.json`: it must stay committed, since it's the fallback source of truth when the GitHub API is unreachable (spec's "repository-local, deterministic" requirement depends on it being in version control).

```
node_modules/
dist/
```

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json vitest.config.ts .gitignore
git commit -m "chore: scaffold Node/TypeScript build system for profile generator"
```

---

## Task 1: Design Tokens + Contrast Verification

**Files:**
- Create: `src/tokens.ts`
- Create: `src/contrast.ts`
- Test: `src/contrast.test.ts`

Per spec §5.1, every color pair must meet WCAG AA (4.5:1). This is verified programmatically, not eyeballed.

- [ ] **Step 1: Write the failing test**

`src/contrast.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { contrastRatio } from "./contrast";
import { colors } from "./tokens";

describe("contrastRatio", () => {
  it("computes known ratio: black on white is 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("computes known ratio: identical colors is 1:1", () => {
    expect(contrastRatio("#7c6cf6", "#7c6cf6")).toBeCloseTo(1, 1);
  });
});

describe("token contrast — WCAG AA (4.5:1 minimum)", () => {
  const AA = 4.5;
  const fields = ["neutralHigh", "neutralMid", "accent", "success", "warning"] as const;

  for (const mode of ["dark", "light"] as const) {
    for (const field of fields) {
      it(`${mode}.${field} vs ${mode}.bg passes AA`, () => {
        const ratio = contrastRatio(colors[mode][field], colors[mode].bg);
        expect(ratio).toBeGreaterThanOrEqual(AA);
      });
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test
```

Expected: FAIL — `./contrast` and `./tokens` don't exist yet.

- [ ] **Step 3: Write tokens.ts**

`src/tokens.ts`:

```ts
export type Mode = "dark" | "light";

export interface ColorTokens {
  bg: string;
  surface: string;
  neutralMid: string;
  neutralHigh: string;
  accent: string;
  success: string;
  warning: string;
  hairline: string;
}

export const colors: Record<Mode, ColorTokens> = {
  dark: {
    bg: "#0a0a0a",
    surface: "#171717",
    neutralMid: "#a1a1a1",
    neutralHigh: "#f2f2f2",
    accent: "#7c6cf6",
    success: "#4ade80",
    warning: "#f5a524",
    hairline: "#242424",
  },
  light: {
    bg: "#ffffff",
    surface: "#f5f5f5",
    neutralMid: "#525252",
    neutralHigh: "#0a0a0a",
    accent: "#6d28d9",
    success: "#15803d",
    warning: "#b45309",
    hairline: "#e5e5e5",
  },
};

export const spacing = {
  marginX: 64,
  heroWidth: 1200,
  heroHeight: 300,
  statStripHeight: 60,
};

export const typeScale = {
  kicker: { fontSize: "12px", fontWeight: 600 as const, letterSpacing: "3px" },
  display: { fontSize: "60px", fontWeight: 600 as const, letterSpacing: "-1.5px" },
  body: { fontSize: "15px", fontWeight: 400 as const },
  label: { fontSize: "10px", fontWeight: 400 as const, letterSpacing: "2px" },
  value: { fontSize: "14px", fontWeight: 400 as const },
  meta: { fontSize: "11px", fontWeight: 400 as const, letterSpacing: "2px" },
  statValue: { fontSize: "16px", fontWeight: 600 as const },
};
```

**Every component in Tasks 5–7 must import and spread from `typeScale` rather than hardcoding font size/weight/letter-spacing inline** — `typeScale` is the single source of truth for the type scale per spec §6, not decoration. `fontFamily` stays a per-call string (`"Inter"` vs `"JetBrains Mono"`), since that choice is about sans-vs-mono role (documented separately in spec §5.3), not part of the size/weight scale.

- [ ] **Step 4: Write contrast.ts**

`src/contrast.ts`:

```ts
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function srgbToLinear(channel255: number): number {
  const c = channel255 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test
```

Expected: PASS — all 10 token-contrast assertions (5 fields × 2 modes) plus the 2 sanity checks pass. These tokens were hand-verified during design (weakest cases ~5.0:1 for light-mode success/warning) so this should go green without adjustment. If any fail, the token hex value is wrong relative to the spec — fix the token, not the test.

- [ ] **Step 6: Commit**

```bash
git add src/tokens.ts src/contrast.ts src/contrast.test.ts
git commit -m "feat: add design tokens with WCAG AA contrast verification"
```

---

## Task 2: Satori Hyperscript Helper

Satori accepts a plain object tree (no React/JSX build step required). This helper makes building that tree readable.

**Files:**
- Create: `src/satori-h.ts`
- Test: `src/satori-h.test.ts`

- [ ] **Step 1: Write the failing test**

`src/satori-h.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { h } from "./satori-h";

describe("h", () => {
  it("builds a node with string children", () => {
    const node = h("span", { style: { color: "red" } }, "hello");
    expect(node).toEqual({
      type: "span",
      props: { style: { color: "red" }, children: "hello" },
    });
  });

  it("builds a node with element children", () => {
    const child = h("span", {}, "a");
    const node = h("div", {}, child);
    expect(node.props.children).toEqual([child]);
  });

  it("builds a node with multiple element children", () => {
    const a = h("span", {}, "a");
    const b = h("span", {}, "b");
    const node = h("div", {}, a, b);
    expect(node.props.children).toEqual([a, b]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test
```

Expected: FAIL — `./satori-h` doesn't exist.

- [ ] **Step 3: Write satori-h.ts**

`src/satori-h.ts`:

```ts
export interface SatoriNode {
  type: string;
  props: {
    style?: Record<string, string | number>;
    children?: SatoriNode[] | string;
    [key: string]: unknown;
  };
}

export function h(
  type: string,
  props: Record<string, unknown> = {},
  ...children: (SatoriNode | string)[]
): SatoriNode {
  const isSingleString = children.length === 1 && typeof children[0] === "string";
  const flatChildren: SatoriNode[] | string = isSingleString
    ? (children[0] as string)
    : (children as SatoriNode[]);

  return {
    type,
    props: {
      ...props,
      children: flatChildren,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/satori-h.ts src/satori-h.test.ts
git commit -m "feat: add JSX-free hyperscript helper for Satori element trees"
```

---

## Task 3: Font Loader

**Files:**
- Create: `src/fonts.ts`
- Test: `src/fonts.test.ts`

- [ ] **Step 1: Write the failing test**

`src/fonts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { loadFonts } from "./fonts";

describe("loadFonts", () => {
  it("loads Inter regular, Inter bold, and JetBrains Mono as non-empty buffers", async () => {
    const fonts = await loadFonts();
    expect(fonts).toHaveLength(3);
    for (const font of fonts) {
      expect(font.data.byteLength).toBeGreaterThan(1000);
      expect(["Inter", "JetBrains Mono"]).toContain(font.name);
    }
  });

  it("includes both weight 400 and 600 for Inter", () => {
    return loadFonts().then((fonts) => {
      const interWeights = fonts.filter((f) => f.name === "Inter").map((f) => f.weight);
      expect(interWeights).toContain(400);
      expect(interWeights).toContain(600);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test
```

Expected: FAIL — `./fonts` doesn't exist.

- [ ] **Step 3: Write fonts.ts**

`src/fonts.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 5: Write docs/FONTS.md (satisfies the spec's licensing documentation requirement)**

`docs/FONTS.md`:

```markdown
# Fonts

This profile's generated SVG assets (hero, stat strip, section divider) embed two typefaces, loaded at build time from their npm packages — no font files are committed to this repository.

| Font | Package | Weights used | Used for | License |
|---|---|---|---|---|
| Inter | `@fontsource/inter` | 400, 600 | Display name, body copy, spec-rail values | SIL Open Font License 1.1 (bundled in the npm package) |
| JetBrains Mono | `@fontsource/jetbrains-mono` | 400 | Spec-rail labels, meta bar (kicker/revision text) | SIL Open Font License 1.1 (bundled in the npm package) |

Both packages ship WOFF, WOFF2, and (for some) TTF files. `src/fonts.ts` specifically loads the `.woff` variant, because [Satori](https://github.com/vercel/satori) — the SVG renderer used by `scripts/generate.ts` — supports TTF, OTF, and WOFF only (not WOFF2).

Each package's own license file (OFL-1.1) ships inside `node_modules/@fontsource/{inter,jetbrains-mono}/LICENSE` after `pnpm install` and is not duplicated here, since the fonts themselves aren't vendored into this repo.
```

- [ ] **Step 6: Commit**

```bash
git add src/fonts.ts src/fonts.test.ts docs/FONTS.md
git commit -m "feat: load Inter and JetBrains Mono as WOFF buffers for Satori, document licensing"
```

---

## Task 4: GitHub Stats Fetcher with Cache Fallback

**Files:**
- Create: `src/github-data.ts`
- Test: `src/github-data.test.ts`
- Create: `assets/stats-cache.json` (seed file, committed)

- [ ] **Step 1: Seed the cache file**

`assets/stats-cache.json` (create the `assets/` directory if it doesn't exist):

```json
{
  "followers": 0,
  "publicRepos": 0,
  "totalStars": 0
}
```

This is a placeholder seed — Task 11's real `pnpm run generate` run will overwrite it with live numbers on first success.

- [ ] **Step 2: Write the failing test**

`src/github-data.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchGithubStats } from "./github-data";

describe("fetchGithubStats", () => {
  it("returns computed stats on a successful fetch", async () => {
    const mockFetch = vi.fn(async (url: string) => {
      if (url.includes("/repos")) {
        return {
          ok: true,
          status: 200,
          json: async () => [{ stargazers_count: 10 }, { stargazers_count: 26 }],
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ followers: 42, public_repos: 27 }),
      } as Response;
    });

    const stats = await fetchGithubStats(mockFetch as unknown as typeof fetch);
    expect(stats).toEqual({ followers: 42, publicRepos: 27, totalStars: 36 });
  });

  it("falls back to the cached file when the API call fails", async () => {
    const mockFetch = vi.fn(async () => {
      throw new Error("network down");
    });

    const stats = await fetchGithubStats(mockFetch as unknown as typeof fetch);
    // Matches whatever is currently in assets/stats-cache.json
    expect(stats).toHaveProperty("followers");
    expect(stats).toHaveProperty("publicRepos");
    expect(stats).toHaveProperty("totalStars");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm test
```

Expected: FAIL — `./github-data` doesn't exist.

- [ ] **Step 4: Write github-data.ts**

`src/github-data.ts`:

```ts
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface GithubStats {
  followers: number;
  publicRepos: number;
  totalStars: number;
}

const USERNAME = "sabahattink";
const CACHE_PATH = path.join(process.cwd(), "assets", "stats-cache.json");

interface GithubUserResponse {
  followers: number;
  public_repos: number;
}

interface GithubRepoResponse {
  stargazers_count: number;
}

export async function fetchGithubStats(
  fetchImpl: typeof fetch = fetch
): Promise<GithubStats> {
  try {
    const [userRes, reposRes] = await Promise.all([
      fetchImpl(`https://api.github.com/users/${USERNAME}`),
      fetchImpl(`https://api.github.com/users/${USERNAME}/repos?per_page=100`),
    ]);

    if (!userRes.ok || !reposRes.ok) {
      throw new Error(`GitHub API returned ${userRes.status}/${reposRes.status}`);
    }

    const user = (await userRes.json()) as GithubUserResponse;
    const repos = (await reposRes.json()) as GithubRepoResponse[];
    const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);

    const stats: GithubStats = {
      followers: user.followers,
      publicRepos: user.public_repos,
      totalStars,
    };

    await writeFile(CACHE_PATH, JSON.stringify(stats, null, 2) + "\n");
    return stats;
  } catch (err) {
    console.warn(
      `[github-data] Live fetch failed (${(err as Error).message}); falling back to cached stats.`
    );
    const cached = await readFile(CACHE_PATH, "utf-8");
    return JSON.parse(cached) as GithubStats;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/github-data.ts src/github-data.test.ts assets/stats-cache.json
git commit -m "feat: fetch live GitHub stats with committed-cache fallback"
```

---

## Task 5: Hero Component (B2: Spec Header)

**Files:**
- Create: `src/components/hero.ts`
- Test: `src/components/hero.test.ts`

Implements spec §5.2 exactly: top meta bar, hairline, asymmetric two-column body (narrative + spec rail), bottom hairline. 1200×300.

- [ ] **Step 1: Write the failing test**

`src/components/hero.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import satori from "satori";
import { Hero } from "./hero";
import { loadFonts } from "../fonts";

describe("Hero", () => {
  it("renders to a valid 1200x300 SVG containing the name and spec-rail fields", async () => {
    const fonts = await loadFonts();
    const node = Hero("dark", {
      name: "Sabahattin Kalkan",
      kicker: "SYSTEMS ARCHITECT",
      missionLine: "Building systems where AI infrastructure, developer tooling and automation intersect.",
      focus: "AI Infra · Dev Tooling",
      stack: "TypeScript · Rust · Python",
      based: "Baku, Azerbaijan",
      revDate: "2026.07.09",
    });

    const svg = await satori(node as never, { width: 1200, height: 300, fonts });

    expect(svg).toContain("<svg");
    expect(svg).toContain("Sabahattin Kalkan");
    expect(svg).toContain("FOCUS");
    expect(svg).toContain("BASED");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test
```

Expected: FAIL — `./hero` doesn't exist.

- [ ] **Step 3: Write hero.ts**

`src/components/hero.ts`:

```ts
import { h, type SatoriNode } from "../satori-h";
import { colors, spacing, typeScale, type Mode, type ColorTokens } from "../tokens";

export interface HeroData {
  name: string;
  kicker: string;
  missionLine: string;
  focus: string;
  stack: string;
  based: string;
  revDate: string;
}

function SpecField(c: ColorTokens, label: string, value: string): SatoriNode {
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column" } },
    h(
      "span",
      { style: { ...typeScale.label, fontFamily: "JetBrains Mono", color: c.neutralMid } },
      label
    ),
    h(
      "span",
      { style: { ...typeScale.value, fontFamily: "Inter", color: c.neutralHigh, marginTop: "4px" } },
      value
    )
  );
}

export function Hero(mode: Mode, data: HeroData): SatoriNode {
  const c = colors[mode];
  const { heroWidth: width, heroHeight: height, marginX } = spacing;

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
          justifyContent: "space-between",
          padding: `28px ${marginX}px 0 ${marginX}px`,
          fontFamily: "JetBrains Mono",
          color: c.neutralMid,
          ...typeScale.meta,
        },
      },
      h("span", {}, "ENGINEERING PROFILE"),
      h("span", {}, `REV ${data.revDate}`)
    ),
    h("div", {
      style: { margin: `14px ${marginX}px 0 ${marginX}px`, height: "1px", backgroundColor: c.hairline },
    }),
    h(
      "div",
      { style: { display: "flex", flex: 1, padding: `32px ${marginX}px 0 ${marginX}px` } },
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", width: "716px" } },
        h(
          "span",
          { style: { ...typeScale.kicker, fontFamily: "Inter", color: c.accent } },
          data.kicker
        ),
        h(
          "span",
          { style: { ...typeScale.display, fontFamily: "Inter", color: c.neutralHigh, marginTop: "8px" } },
          data.name
        ),
        h(
          "span",
          { style: { ...typeScale.body, fontFamily: "Inter", color: c.neutralMid, marginTop: "14px" } },
          data.missionLine
        )
      ),
      h("div", { style: { width: "1px", backgroundColor: c.hairline, margin: "0 36px" } }),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", width: "320px", gap: "18px" } },
        SpecField(c, "FOCUS", data.focus),
        SpecField(c, "STACK", data.stack),
        SpecField(c, "BASED", data.based)
      )
    ),
    h("div", {
      style: { margin: `auto ${marginX}px 24px ${marginX}px`, height: "1px", backgroundColor: c.hairline },
    })
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test
```

Expected: PASS. If Satori throws a layout error (e.g. about missing explicit dimensions on a flex child), that's expected first-pass friction — Satori requires every flex node to be resolvable; fix by adding explicit `width`/`height` or `flex` values where the error points, then re-run. Don't change the test's assertions to work around a real rendering bug.

- [ ] **Step 5: Commit**

```bash
git add src/components/hero.ts src/components/hero.test.ts
git commit -m "feat: implement Hero component (B2 Spec Header layout)"
```

---

## Task 6: SectionDivider Component

**Files:**
- Create: `src/components/section-divider.ts`
- Test: `src/components/section-divider.test.ts`

Per spec §6: used exactly once in the README, between "How I Build Software" and "Tech Stack." Minimal — a labeled hairline, not a decorative flourish.

- [ ] **Step 1: Write the failing test**

`src/components/section-divider.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import satori from "satori";
import { SectionDivider } from "./section-divider";
import { loadFonts } from "../fonts";

describe("SectionDivider", () => {
  it("renders a labeled hairline at 1200x48", async () => {
    const fonts = await loadFonts();
    const node = SectionDivider("dark", "TECH STACK");
    const svg = await satori(node as never, { width: 1200, height: 48, fonts });

    expect(svg).toContain("<svg");
    expect(svg).toContain("TECH STACK");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test
```

Expected: FAIL — `./section-divider` doesn't exist.

- [ ] **Step 3: Write section-divider.ts**

`src/components/section-divider.ts`:

```ts
import { h, type SatoriNode } from "../satori-h";
import { colors, spacing, typeScale, type Mode } from "../tokens";

export function SectionDivider(mode: Mode, label: string): SatoriNode {
  const c = colors[mode];
  const { heroWidth: width, marginX } = spacing;

  return h(
    "div",
    {
      style: {
        width: `${width}px`,
        height: "48px",
        display: "flex",
        alignItems: "center",
        backgroundColor: c.bg,
        padding: `0 ${marginX}px`,
      },
    },
    h("div", { style: { flex: 1, height: "1px", backgroundColor: c.hairline } }),
    h(
      "span",
      { style: { ...typeScale.meta, fontFamily: "JetBrains Mono", color: c.neutralMid, margin: "0 16px" } },
      label
    ),
    h("div", { style: { flex: 1, height: "1px", backgroundColor: c.hairline } })
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/section-divider.ts src/components/section-divider.test.ts
git commit -m "feat: implement SectionDivider component"
```

---

## Task 7: StatStrip Component

**Files:**
- Create: `src/components/stat-strip.ts`
- Test: `src/components/stat-strip.test.ts`

Per spec §2: a thin, quiet row directly beneath Hero, carrying *live* numbers (Hero's own spec rail is static identity metadata), using "the same hairline-rule language as Hero" — i.e. it must have its own top and bottom hairline, not just a bare flex row. Final exact sizing was deliberately left open during brainstorming (confirmed in the conversation that produced the spec, not the spec document's section text itself) until Hero could be viewed at real size — this task ships a working, tested, correctly-framed component at a reasonable default (1200×60); Task 11 includes a visual check against the rendered Hero and a size adjustment if needed.

- [ ] **Step 1: Write the failing test**

`src/components/stat-strip.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import satori from "satori";
import { StatStrip } from "./stat-strip";
import { loadFonts } from "../fonts";

describe("StatStrip", () => {
  it("renders follower, repo, and star counts", async () => {
    const fonts = await loadFonts();
    const node = StatStrip("dark", { followers: 42, publicRepos: 27, totalStars: 36 });
    const svg = await satori(node as never, { width: 1200, height: 60, fonts });

    expect(svg).toContain("<svg");
    expect(svg).toContain("42");
    expect(svg).toContain("27");
    expect(svg).toContain("36");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test
```

Expected: FAIL — `./stat-strip` doesn't exist.

- [ ] **Step 3: Write stat-strip.ts**

`src/components/stat-strip.ts`:

```ts
import { h, type SatoriNode } from "../satori-h";
import { colors, spacing, typeScale, type Mode, type ColorTokens } from "../tokens";
import type { GithubStats } from "../github-data";

function Stat(c: ColorTokens, label: string, value: number): SatoriNode {
  return h(
    "div",
    { style: { display: "flex", alignItems: "baseline", gap: "8px" } },
    h(
      "span",
      { style: { ...typeScale.statValue, fontFamily: "Inter", color: c.neutralHigh } },
      String(value)
    ),
    h(
      "span",
      { style: { ...typeScale.meta, fontFamily: "JetBrains Mono", color: c.neutralMid, letterSpacing: "1px" } },
      label
    )
  );
}

// Mirrors Hero's hairline-rule language (top/bottom hairline framing a content row) —
// spec §2 requires the Stat Strip to share Hero's visual framing, not just sit as a bare row.
export function StatStrip(mode: Mode, stats: GithubStats): SatoriNode {
  const c = colors[mode];
  const { heroWidth: width, marginX } = spacing;

  return h(
    "div",
    {
      style: {
        width: `${width}px`,
        height: "60px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        backgroundColor: c.bg,
      },
    },
    h("div", { style: { margin: `0 ${marginX}px`, height: "1px", backgroundColor: c.hairline } }),
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "40px",
          padding: `12px ${marginX}px`,
        },
      },
      Stat(c, "FOLLOWERS", stats.followers),
      Stat(c, "PUBLIC REPOS", stats.publicRepos),
      Stat(c, "STARS", stats.totalStars)
    ),
    h("div", { style: { margin: `0 ${marginX}px`, height: "1px", backgroundColor: c.hairline } })
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/stat-strip.ts src/components/stat-strip.test.ts
git commit -m "feat: implement StatStrip component (default sizing, tuned in integration pass)"
```

---

## Task 8: Generation Script

**Files:**
- Create: `src/generate.ts`
- Test: `src/generate.test.ts`

Orchestrates: load fonts + tokens, fetch stats, render all components in both modes, write to `assets/*.svg`.

- [ ] **Step 1: Write the failing test**

`src/generate.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { generate } from "./generate";

const OUT_DIR = path.join(process.cwd(), "assets");

describe("generate", () => {
  afterEach(async () => {
    for (const f of ["hero-dark.svg", "hero-light.svg", "stat-strip-dark.svg", "stat-strip-light.svg", "divider-dark.svg", "divider-light.svg"]) {
      await rm(path.join(OUT_DIR, f), { force: true });
    }
  });

  it("writes six SVG files (hero/stat-strip/divider × dark/light)", async () => {
    await generate({
      fetchStats: async () => ({ followers: 42, publicRepos: 27, totalStars: 36 }),
    });

    for (const f of ["hero-dark.svg", "hero-light.svg", "stat-strip-dark.svg", "stat-strip-light.svg", "divider-dark.svg", "divider-light.svg"]) {
      const content = await readFile(path.join(OUT_DIR, f), "utf-8");
      expect(content).toContain("<svg");
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test
```

Expected: FAIL — `./generate` doesn't exist.

- [ ] **Step 3: Write generate.ts**

`src/generate.ts`:

```ts
import satori from "satori";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { loadFonts } from "./fonts";
import { fetchGithubStats, type GithubStats } from "./github-data";
import { Hero } from "./components/hero";
import { SectionDivider } from "./components/section-divider";
import { StatStrip } from "./components/stat-strip";
import { spacing } from "./tokens";

const OUT_DIR = path.join(process.cwd(), "assets");

interface GenerateOptions {
  fetchStats?: () => Promise<GithubStats>;
}

const HERO_DATA = {
  name: "Sabahattin Kalkan",
  kicker: "SYSTEMS ARCHITECT",
  missionLine: "Building systems where AI infrastructure, developer tooling and automation intersect.",
  focus: "AI Infra · Dev Tooling",
  stack: "TypeScript · Rust · Python",
  based: "Baku, Azerbaijan",
};

function todayRev(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
}

export async function generate(options: GenerateOptions = {}): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const fonts = await loadFonts();
  const stats = options.fetchStats ? await options.fetchStats() : await fetchGithubStats();
  const revDate = todayRev();

  const jobs: Array<{ file: string; svg: () => Promise<string> }> = [
    {
      file: "hero-dark.svg",
      svg: () =>
        satori(Hero("dark", { ...HERO_DATA, revDate }) as never, {
          width: spacing.heroWidth,
          height: spacing.heroHeight,
          fonts,
        }),
    },
    {
      file: "hero-light.svg",
      svg: () =>
        satori(Hero("light", { ...HERO_DATA, revDate }) as never, {
          width: spacing.heroWidth,
          height: spacing.heroHeight,
          fonts,
        }),
    },
    {
      file: "stat-strip-dark.svg",
      svg: () => satori(StatStrip("dark", stats) as never, { width: spacing.heroWidth, height: 60, fonts }),
    },
    {
      file: "stat-strip-light.svg",
      svg: () => satori(StatStrip("light", stats) as never, { width: spacing.heroWidth, height: 60, fonts }),
    },
    {
      file: "divider-dark.svg",
      svg: () => satori(SectionDivider("dark", "TECH STACK") as never, { width: spacing.heroWidth, height: 48, fonts }),
    },
    {
      file: "divider-light.svg",
      svg: () => satori(SectionDivider("light", "TECH STACK") as never, { width: spacing.heroWidth, height: 48, fonts }),
    },
  ];

  for (const job of jobs) {
    const svg = await job.svg();
    await writeFile(path.join(OUT_DIR, job.file), svg);
  }
}

// Allow running directly: `tsx src/generate.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  generate()
    .then(() => console.log("Generated all assets."))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/generate.ts src/generate.test.ts
git commit -m "feat: add generate.ts orchestration script"
```

---

## Task 9: README.md Content

**Files:**
- Modify: `README.md` (full rewrite)
- Test: `scripts/check-readme.ts` (a small non-vitest sanity script — see below)

This is the hand-written Markdown content per spec §2–§4, §8. Not TDD in the traditional sense (it's prose), but it does get one mechanical check: no dead asset references, no leftover placeholder text.

- [ ] **Step 1: Write README.md**

`README.md`:

```markdown
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/hero-dark.svg">
  <img src="assets/hero-light.svg" alt="Sabahattin Kalkan — Systems Architect">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/stat-strip-dark.svg">
  <img src="assets/stat-strip-light.svg" alt="GitHub stats: followers, public repos, stars">
</picture>

## Mission

I build software to make engineering work more honest — systems that do what they claim, tools that remove friction instead of adding it, and infrastructure that holds up once the demo is over.

## Selected Projects

### LLM Gateway

A unified OpenAI-compatible gateway for multiple language model providers — one consistent interface across OpenAI, Anthropic, Gemini, Groq, Ollama and others.

**Repository:** https://github.com/sabahattink/llm-gateway

### CodeDiag

Diagnose your code before you ship. One command, five analyzers, one score.

**Repository:** https://github.com/sabahattink/codediag

### Antigravity Fullstack HQ

A permission-first CLAUDE.md + agent stack for Claude Code and Google Antigravity — 10 agents, 28 skills, one-command install.

**Repository:** https://github.com/sabahattink/antigravity-fullstack-hq

### vault-os

Personal knowledge management automation: a Telegram bot, a nightly agent, Whisper transcription, and Obsidian daily notes — running in production against my own daily workflow.

**Repository:** https://github.com/sabahattink/vault-os

### MailTest

A developer-focused email deliverability platform — diagnoses authentication, DNS configuration and inbox placement issues before they affect real users.

### KalkanOS

*Coming soon.*

## Engineering Principles

- Solve real problems before polishing ideas.
- Build systems instead of isolated features.
- Prefer maintainability over cleverness.
- Automate repetitive engineering work.
- Document decisions.
- Ship production-ready software.

### Engineering Utilities

*Smaller tools, shipped and maintained the same way.*

| Tool | Description | Tool | Description |
|---|---|---|---|
| [`safe-json`](https://github.com/sabahattink/safe-json) | Safe JSON parse/stringify | [`retry-fn`](https://github.com/sabahattink/retry-fn) | Async retry, backoff |
| [`kill-port`](https://github.com/sabahattink/kill-port) | Kill port process | [`git-whoami`](https://github.com/sabahattink/git-whoami) | Git identity check |
| [`slug-gen`](https://github.com/sabahattink/slug-gen) | Unicode slug generator | [`ai-commit`](https://github.com/sabahattink/ai-commit) | AI commit messages |
| [`dotenv-guard`](https://github.com/sabahattink/dotenv-guard) | Prevent env leaks | [`port-finder`](https://github.com/sabahattink/port-finder) | Find available port |
| [`ghx`](https://github.com/sabahattink/ghx) | Missing GitHub CLI | [`ms-convert`](https://github.com/sabahattink/ms-convert) | Time ⇄ milliseconds |
| [`cron-explain`](https://github.com/sabahattink/cron-explain) | Explain cron expressions | [`license-gen`](https://github.com/sabahattink/license-gen) | Generate LICENSE files |
| [`json-diff-cli`](https://github.com/sabahattink/json-diff-cli) | JSON diff viewer | [`readme-forge`](https://github.com/sabahattink/readme-forge) | AI README generator |

## How I Build Software

Most of what I ship starts as an internal tool solving a problem I actually have. It gets used in production, kept only if it earns its place, then documented and released once it's proven — not before.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/divider-dark.svg">
  <img src="assets/divider-light.svg" alt="">
</picture>

## Tech Stack

**Languages:** TypeScript · Rust · Python · Shell
**Backend:** NestJS · Node.js · PostgreSQL · Redis · Prisma
**Frontend:** React · Next.js · Tailwind CSS
**Infrastructure:** Docker · Linux · GitHub Actions
**AI:** Claude Code · Anthropic · OpenAI · Ollama

## Current Focus

- AI Infrastructure
- Agent Engineering
- Developer Tooling
- Systems Architecture
- Automation
- Open Source

## Open Source

I believe open source should be practical. I don't publish projects to grow a portfolio — I publish software that has already solved problems in production and can be useful to other engineers. Quality, documentation and long-term maintenance matter more than repository count.

## Closing

Software is a way of thinking made executable. I'd rather ship one system that holds up than ten demos that don't.
```

- [ ] **Step 2: Write a mechanical sanity check script**

`scripts/check-readme.ts`:

```ts
import { readFile, access } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PLACEHOLDER_PATTERNS = [/TODO/i, /TBD/i, /lorem ipsum/i, /\[PLACEHOLDER\]/i];

async function main() {
  const readme = await readFile(path.join(ROOT, "README.md"), "utf-8");

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(readme)) {
      console.error(`README.md contains a placeholder matching ${pattern}`);
      process.exitCode = 1;
    }
  }

  const assetRefs = [...readme.matchAll(/srcset="([^"]+)"|src="([^"]+)"/g)]
    .map((m) => m[1] ?? m[2])
    .filter((p): p is string => Boolean(p) && !p.startsWith("http"));

  for (const ref of assetRefs) {
    try {
      await access(path.join(ROOT, ref));
    } catch {
      console.error(`README.md references missing asset: ${ref}`);
      process.exitCode = 1;
    }
  }

  if (!process.exitCode) {
    console.log(`README.md OK — ${assetRefs.length} local asset references all resolve.`);
  }
}

main();
```

- [ ] **Step 3: Run the check (expected to fail until Task 11 generates the assets)**

```bash
npx tsx scripts/check-readme.ts
```

Expected at this point: FAIL — `assets/hero-dark.svg` etc. don't exist yet (Task 8 only wrote a test for `generate()`, nothing has actually invoked it against the real README's exact filenames). This is expected; Task 11 runs `pnpm run generate` for real and this check should then pass.

- [ ] **Step 4: Commit**

```bash
git add README.md scripts/check-readme.ts
git commit -m "docs: rewrite profile README with new narrative structure"
```

---

## Task 10: GitHub Action for Automatic Regeneration

**Files:**
- Create: `.github/workflows/regenerate-assets.yml`

- [ ] **Step 1: Write the workflow**

`.github/workflows/regenerate-assets.yml`:

```yaml
name: Regenerate profile assets

on:
  push:
    branches: [main]
  schedule:
    - cron: "17 4 * * *" # daily, off-peak minute to avoid GitHub Actions cron pile-up
  workflow_dispatch: {}

permissions:
  contents: write

jobs:
  regenerate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm run generate

      - run: npx tsx scripts/check-readme.ts

      - name: Commit changed assets
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add assets/
          git diff --cached --quiet || git commit -m "chore: regenerate profile assets [skip ci]"
          git push
```

- [ ] **Step 2: Validate the YAML parses**

```bash
node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/regenerate-assets.yml', 'utf-8')); console.log('valid yaml')"
```

If `js-yaml` isn't installed, add it as a one-off dev dependency for this check, or validate with any locally available YAML parser — the goal is just confirming there's no syntax error before it's pushed.

Expected: `valid yaml`

- [ ] **Step 3: Note the manual verification step (cannot be automated in this plan)**

After this workflow is pushed to `main`, manually confirm via the GitHub Actions tab that:
1. The `push` trigger fires and completes green
2. `workflow_dispatch` can be triggered manually and completes green
3. A forced content change (e.g. bump `revDate`) results in a commit back to `main` from `github-actions[bot]`

This can't be verified from the local plan execution — it requires the file to actually be on GitHub. Flag this as a follow-up manual check after Task 11's push.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/regenerate-assets.yml
git commit -m "ci: add GitHub Action to regenerate profile assets on push and daily cron"
```

---

## Task 11: Integration — Real Generation, Visual Check, Final Commit

**Files:**
- Modify: `assets/*.svg` (generated, not hand-written)
- Modify: `assets/stats-cache.json` (overwritten with live data)
- Possibly modify: `src/components/stat-strip.ts` (sizing tune per spec's deferred decision)

- [ ] **Step 1: Run the full test suite**

```bash
pnpm test
```

Expected: PASS — every test from Tasks 1–8 green.

- [ ] **Step 2: Run the real generator (live GitHub API call, not mocked)**

```bash
pnpm run generate
```

Expected: `Generated all assets.` and six new/updated files under `assets/`. Confirm `assets/stats-cache.json` now has real numbers, not the `0/0/0` seed from Task 4.

- [ ] **Step 3: Run the README sanity check**

```bash
npx tsx scripts/check-readme.ts
```

Expected: `README.md OK — N local asset references all resolve.`

- [ ] **Step 4: Visual check — open the generated SVGs directly**

```bash
start assets/hero-dark.svg
start assets/hero-light.svg
start assets/stat-strip-dark.svg
```

(On Windows, `start <file>` opens it in the default viewer/browser.) Compare against the approved `hero-b-refined.html` mockup (`.superpowers/brainstorm/250-1783593244/hero-b-refined.html`, "spec-header" option) and the `tools-appendix-v2.html` mockup for overall visual register. Confirm:
- Hero reads correctly at 1200×300 — asymmetric two-column layout, hairlines top/bottom, spec rail values legible
- Text doesn't overflow its column (particularly the mission line in the left column and the three spec-rail values in the right column)
- Now that Hero is visible at real size, finalize `StatStrip`'s exact proportions (deliberately deferred during brainstorming, per Task 7's note) — adjust `src/components/stat-strip.ts` height/padding/gap if it looks disproportionate next to the 300px-tall Hero immediately above it. If changed, re-run `pnpm test` and `pnpm run generate` to confirm the change holds.

- [ ] **Step 5: Verify dark/light `<picture>` switching actually renders correctly**

Open `README.md` in a Markdown previewer that supports `prefers-color-scheme` (or push to a branch and view the rendered file on github.com, toggling GitHub's own light/dark theme setting) to confirm the correct SVG shows in each mode.

- [ ] **Step 6: Commit the generated assets and any tuning changes**

```bash
git add assets/ src/components/stat-strip.ts
git commit -m "feat: generate final profile assets with live GitHub stats"
```

- [ ] **Step 7: Push and manually verify the GitHub Action (see Task 10, Step 3)**

```bash
git push -u origin main
```

Then check the Actions tab on `github.com/sabahattink/sabahattink` for a green run.
