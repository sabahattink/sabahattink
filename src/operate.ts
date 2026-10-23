import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { parseCommand } from "./bms/command.js";
import { OPERATION } from "./bms/config.js";
import { activeAlarms, advance, applyCommand, initialState, setOutdoor } from "./bms/engine.js";
import { fetchOutdoor, listQueue, type QueuedIssue } from "./bms/io.js";
import { renderPlan } from "./bms/plan.js";
import { buildingBlock, injectBuilding } from "./bms/readme.js";
import { BmsStateSchema, type Handled } from "./bms/schema.js";
import { loadFonts } from "./render/fonts.js";
import { THEMES } from "./render/theme.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const STATE_PATH = path.join(ROOT, "data", "bms.json");
const README_PATH = path.join(ROOT, "README.md");

const FixtureSchema = z.object({
  now: z.iso.datetime(),
  start: z.iso.datetime(),
  outdoor: z.number(),
  issues: z.array(z.object({ number: z.number().int().positive(), title: z.string(), user: z.string(), createdAt: z.iso.datetime() })),
});

function writeIfChanged(file: string, content: string): boolean {
  if (existsSync(file) && readFileSync(file, "utf8") === content) return false;
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  return true;
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { offline: { type: "string" } } });
  const repliesPath = process.env.REPLIES_PATH ?? path.join(os.tmpdir(), "bms-replies.json");

  let now: string;
  let start: string;
  let outdoor: number | null;
  let queue: QueuedIssue[];
  let prevJson: string | null = null;

  if (values.offline !== undefined) {
    const fixture = FixtureSchema.parse(JSON.parse(readFileSync(path.resolve(ROOT, values.offline), "utf8")));
    ({ now, start, outdoor } = fixture);
    queue = fixture.issues;
  } else {
    const token = process.env.GITHUB_TOKEN;
    if (token === undefined || token === "") throw new Error("GITHUB_TOKEN is required (or pass --offline <fixture.json>)");
    now = `${new Date().toISOString().slice(0, 19)}Z`;
    start = now;
    outdoor = await fetchOutdoor().catch((error: unknown) => {
      console.warn(`Outdoor temperature unavailable, keeping the last reading: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    });
    queue = await listQueue(token);
    if (existsSync(STATE_PATH)) prevJson = readFileSync(STATE_PATH, "utf8");
  }

  let state =
    prevJson !== null
      ? BmsStateSchema.parse(JSON.parse(prevJson))
      : initialState(start, outdoor ?? OPERATION.fallbackOutdoor, outdoor !== null);

  for (const issue of queue) {
    state = advance(state, issue.createdAt);
    state = applyCommand(state, issue.number, issue.user, parseCommand(issue.title));
  }
  state = advance(state, now);
  state = setOutdoor(state, outdoor ?? state.outdoor.value, outdoor !== null);

  const fonts = loadFonts();
  const written: string[] = [];
  for (const theme of THEMES) {
    const file = path.join(ROOT, "assets", `plan-${theme.name}.svg`);
    if (writeIfChanged(file, renderPlan({ state, theme, fonts }))) written.push(path.relative(ROOT, file));
  }
  if (writeIfChanged(README_PATH, injectBuilding(readFileSync(README_PATH, "utf8"), buildingBlock(state)))) written.push("README.md");
  if (values.offline === undefined && writeIfChanged(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`)) written.push("data/bms.json");

  // Replies go out only after the commit is pushed (see the workflow), so a failed push never
  // tells an operator "accepted" for a write that was not saved. Already-handled open issues
  // get their stored reply again instead of being re-applied.
  const replies: Handled[] = queue.flatMap((issue) => state.handled.filter((h) => h.issue === issue.number));
  writeFileSync(repliesPath, `${JSON.stringify(replies, null, 2)}\n`);

  console.log(`Building at ${state.at}: outdoor ${state.outdoor.value} \u00B0C (${state.outdoor.live ? "live" : "last reading"}), ${activeAlarms(state)} alarms.`);
  console.log(`Queue: ${queue.length} command issue(s); ${replies.length} repl${replies.length === 1 ? "y" : "ies"} written to ${repliesPath}.`);
  console.log(written.length > 0 ? `Wrote: ${written.join(", ")}` : "Nothing to write.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
