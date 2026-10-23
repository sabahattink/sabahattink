import type { RepoScan, Scan } from "../schema.js";

export function repo(overrides: Partial<RepoScan> & Pick<RepoScan, "repo">): RepoScan {
  return {
    url: `https://github.com/sabahattink/${overrides.repo}`,
    stars: 0,
    release: "v1.0.0",
    pushedAt: "2026-10-01T00:00:00Z",
    checks: "passing",
    archived: false,
    ...overrides,
  };
}

/** One scan entry per configured product, all healthy. */
export function scan(scannedAt = "2026-10-23T09:00:00Z", patch: Record<string, Partial<RepoScan>> = {}): Scan {
  const names = ["Recall", "codediag", "antigravity-fullstack-hq", "reasonkit", "sealed"];
  return { scannedAt, repos: names.map((name) => repo({ repo: name, ...patch[name] })) };
}
