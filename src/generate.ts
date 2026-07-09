import satori from "satori";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadFonts } from "./fonts.js";
import { fetchGithubStats, type GithubStats } from "./github-data.js";
import { Hero } from "./components/hero.js";
import { SectionDivider } from "./components/section-divider.js";
import { StatStrip } from "./components/stat-strip.js";
import { spacing } from "./tokens.js";

const DEFAULT_OUT_DIR = path.join(process.cwd(), "assets");

interface GenerateOptions {
  fetchStats?: () => Promise<GithubStats>;
  outDir?: string;
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
  const outDir = options.outDir ?? DEFAULT_OUT_DIR;
  await mkdir(outDir, { recursive: true });

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
      svg: () => satori(StatStrip("dark", stats) as never, { width: spacing.heroWidth, height: spacing.statStripHeight, fonts }),
    },
    {
      file: "stat-strip-light.svg",
      svg: () => satori(StatStrip("light", stats) as never, { width: spacing.heroWidth, height: spacing.statStripHeight, fonts }),
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

  // Render every SVG into memory first, and only write to disk once every
  // render has succeeded. This keeps the write phase all-or-nothing: if any
  // satori() call throws (e.g. job 4 of 6), assets/ is left completely
  // untouched rather than ending up with a mix of freshly-written and stale
  // files with only a thrown error as a signal something is inconsistent.
  const rendered = await Promise.all(
    jobs.map(async (job) => ({ file: job.file, svg: await job.svg() }))
  );

  await Promise.all(
    rendered.map(({ file, svg }) => writeFile(path.join(outDir, file), svg))
  );
}

// Allow running directly: `tsx src/generate.ts`
// Compared via pathToFileURL (not a raw `file://` template) because on Windows
// process.argv[1] is a backslash path (`C:\...`) while import.meta.url is always
// a normalized forward-slash, triple-slash URL (`file:///C:/...`) — a naive
// string-concat comparison never matches on this platform, silently turning
// `tsx src/generate.ts` into a no-op.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generate()
    .then(() => console.log("Generated all assets."))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
