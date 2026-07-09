import satori from "satori";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { loadFonts } from "./fonts.js";
import { fetchGithubStats, type GithubStats } from "./github-data.js";
import { Hero } from "./components/hero.js";
import { SectionDivider } from "./components/section-divider.js";
import { StatStrip } from "./components/stat-strip.js";
import { spacing } from "./tokens.js";

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
