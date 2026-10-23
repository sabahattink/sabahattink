import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { OWNER, PRODUCTS } from "./config.js";
import { describeChange } from "./describe.js";
import { fitProblems, renderSheet } from "./render/sheet.js";
import { loadFonts } from "./render/fonts.js";
import { injectBlock, projectTable } from "./render/readme.js";
import { THEMES } from "./render/theme.js";
import { advance, latestRevision } from "./revisions.js";
import { fetchScan } from "./scan.js";
import { type Scan, ScanSchema, StateSchema } from "./schema.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const STATE_PATH = path.join(ROOT, "data", "state.json");
const README_PATH = path.join(ROOT, "README.md");

function writeIfChanged(file: string, content: string): boolean {
  if (existsSync(file) && readFileSync(file, "utf8") === content) return false;
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  return true;
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { offline: { type: "string" } } });

  const problems = fitProblems(PRODUCTS);
  if (problems.length > 0) {
    const list = problems.map((p) => `  ${p.what}: ${p.width.toFixed(1)}px > ${p.max}px`).join("\n");
    throw new Error(`Labels overflow their symbols:\n${list}`);
  }

  let scan: Scan;
  if (values.offline !== undefined) {
    scan = ScanSchema.parse(JSON.parse(readFileSync(path.resolve(ROOT, values.offline), "utf8")));
  } else {
    const token = process.env.GITHUB_TOKEN;
    if (token === undefined || token === "") throw new Error("GITHUB_TOKEN is required for a live scan (or pass --offline <scan.json>)");
    scan = await fetchScan({ token, owner: OWNER, repos: PRODUCTS.map((p) => p.repo), now: new Date() });
  }

  // Offline renders are previews: they start a fresh sheet and never touch data/state.json.
  const prev =
    values.offline === undefined && existsSync(STATE_PATH)
      ? StateSchema.parse(JSON.parse(readFileSync(STATE_PATH, "utf8")))
      : null;
  const state = advance(prev, scan);

  const fonts = loadFonts();
  const written: string[] = [];
  for (const theme of THEMES) {
    const file = path.join(ROOT, "assets", `riser-${theme.name}.svg`);
    if (writeIfChanged(file, renderSheet({ state, products: PRODUCTS, theme, fonts }))) written.push(path.relative(ROOT, file));
  }
  const readme = injectBlock(readFileSync(README_PATH, "utf8"), projectTable(state, PRODUCTS));
  if (writeIfChanged(README_PATH, readme)) written.push("README.md");
  if (values.offline === undefined && state !== prev) {
    if (writeIfChanged(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`)) written.push("data/state.json");
  }

  const latest = latestRevision(state);
  console.log(`Revision ${latest.rev} (${latest.date}): ${latest.changes.map(describeChange).join("; ")}`);
  if (values.offline !== undefined) console.log("Offline preview: data/state.json untouched.");
  else console.log(state === prev ? "No meaningful change since the last scan." : "New revision recorded.");
  console.log(written.length > 0 ? `Wrote: ${written.join(", ")}` : "Nothing to write.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
