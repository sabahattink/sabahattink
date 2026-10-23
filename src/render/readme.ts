import { type ProductConfig, THRESHOLDS } from "../config.js";
import { formatRelease } from "../describe.js";
import { latestRevision } from "../revisions.js";
import type { State, Status } from "../schema.js";
import { statusOf } from "../status.js";

export const START = "<!-- projects:start -->";
export const END = "<!-- projects:end -->";

const STATUS_TEXT: Record<Status, string> = {
  normal: "Active",
  maintenance: `Inactive ${THRESHOLDS.staleDays}+ days`,
  fault: "Checks failing",
};

function cell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

/** The README twin of the drawing: same state, as text, with working links. */
export function projectTable(state: State, products: readonly ProductConfig[]): string {
  const byRepo = new Map(state.scan.repos.map((r) => [r.repo, r] as const));
  const rows = products.map((p) => {
    const scan = byRepo.get(p.repo);
    if (scan === undefined) throw new Error(`No scan data for configured product ${p.repo}`);
    const status = statusOf(scan, state.scan.scannedAt);
    const release = scan.release === null ? "\u2014" : formatRelease(scan.release);
    return `| [${cell(p.repo)}](${scan.url}) | ${cell(p.summary)} | ${cell(p.kind)} | ${release} | ${STATUS_TEXT[status]} |`;
  });
  const latest = latestRevision(state);
  return [
    "| Project | Description | Type | Release | Status |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    "",
    `<sub>Generated from the GitHub API by this repository's workflow. Revision ${latest.rev}, ${latest.date}.</sub>`,
  ].join("\n");
}

/** Replace the text between two marker comments; everything outside them is left byte-for-byte. */
export function injectBetween(readme: string, startMarker: string, endMarker: string, block: string): string {
  const start = readme.indexOf(startMarker);
  const end = readme.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`README.md must contain ${startMarker} followed by ${endMarker}`);
  }
  return `${readme.slice(0, start + startMarker.length)}\n${block}\n${readme.slice(end)}`;
}

export function injectBlock(readme: string, block: string): string {
  return injectBetween(readme, START, END, block);
}
