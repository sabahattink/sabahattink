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
  { tag: "FIELD", value: "-> PRODUCTION", caption: "From physical infrastructure to deployed software" },
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
