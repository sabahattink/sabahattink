import { SHEET } from "./config.js";
import type { Change, Revision, Scan, State } from "./schema.js";
import { statusOf } from "./status.js";

/**
 * Meaningful differences between two scans. Push timestamps are deliberately
 * not a change on their own; they only matter once they flip a status.
 * Order is stable: scan order of repos, then release, status, stars.
 */
export function diffScans(prev: Scan, next: Scan): Change[] {
  const before = new Map(prev.repos.map((r) => [r.repo, r] as const));
  const changes: Change[] = [];

  for (const repo of next.repos) {
    const old = before.get(repo.repo);
    if (old === undefined) {
      changes.push({ kind: "added", repo: repo.repo });
      continue;
    }
    if (old.release !== repo.release) {
      changes.push({ kind: "release", repo: repo.repo, from: old.release, to: repo.release });
    }
    const was = statusOf(old, prev.scannedAt);
    const is = statusOf(repo, next.scannedAt);
    if (was !== is) {
      changes.push({ kind: "status", repo: repo.repo, from: was, to: is });
    }
    if (old.stars !== repo.stars) {
      changes.push({ kind: "stars", repo: repo.repo, from: old.stars, to: repo.stars });
    }
  }
  return changes;
}

/**
 * Next persisted state. When nothing meaningful changed the previous state is
 * returned untouched, so a quiet day produces zero diffs and zero commits.
 */
export function advance(prev: State | null, scan: Scan): State {
  const date = scan.scannedAt.slice(0, 10);

  if (prev === null) {
    return { version: 1, scan, revisions: [{ rev: 1, date, changes: [{ kind: "issued" }] }] };
  }

  const changes = diffScans(prev.scan, scan);
  if (changes.length === 0) return prev;

  const rev = latestRevision(prev).rev + 1;
  const revisions = [...prev.revisions, { rev, date, changes }].slice(-SHEET.keepRevisions);
  return { version: 1, scan, revisions };
}

export function latestRevision(state: State): Revision {
  const last = state.revisions.at(-1);
  if (last === undefined) throw new Error("state.revisions is empty; data/state.json is corrupt");
  return last;
}

/** Repositories touched by the latest revision; these get revision clouds. */
export function cloudedRepos(state: State): ReadonlySet<string> {
  const repos = new Set<string>();
  for (const change of latestRevision(state).changes) {
    if (change.kind !== "issued") repos.add(change.repo);
  }
  return repos;
}
