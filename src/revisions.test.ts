import { describe, expect, it } from "vitest";
import { SHEET } from "./config.js";
import { advance, cloudedRepos, diffScans, latestRevision } from "./revisions.js";
import { scan } from "./test/fixtures.js";

describe("advance", () => {
  it("issues revision 1 on the first scan", () => {
    const state = advance(null, scan());
    expect(state.revisions).toEqual([{ rev: 1, date: "2026-10-23", changes: [{ kind: "issued" }] }]);
    expect(cloudedRepos(state).size).toBe(0);
  });

  it("returns the very same state object when nothing meaningful changed", () => {
    const first = advance(null, scan());
    const pushedOnly = scan("2026-10-24T09:00:00Z", { codediag: { pushedAt: "2026-10-24T08:00:00Z" } });
    expect(advance(first, pushedOnly)).toBe(first);
  });

  it("records a release as a new revision and clouds that product", () => {
    const first = advance(null, scan());
    const next = advance(first, scan("2026-11-02T09:00:00Z", { codediag: { release: "v1.1.0" } }));
    expect(latestRevision(next)).toEqual({
      rev: 2,
      date: "2026-11-02",
      changes: [{ kind: "release", repo: "codediag", from: "v1.0.0", to: "v1.1.0" }],
    });
    expect([...cloudedRepos(next)]).toEqual(["codediag"]);
  });

  it("raises a status change when time alone makes a product stale", () => {
    const first = advance(null, scan("2026-10-23T09:00:00Z", { sealed: { pushedAt: "2026-08-01T00:00:00Z" } }));
    const later = advance(first, scan("2026-11-15T09:00:00Z", { sealed: { pushedAt: "2026-08-01T00:00:00Z" } }));
    expect(latestRevision(later).changes).toEqual([
      { kind: "status", repo: "sealed", from: "normal", to: "maintenance" },
    ]);
  });

  it("keeps a bounded history while the revision number keeps counting", () => {
    let state = advance(null, scan());
    for (let i = 1; i <= SHEET.keepRevisions + 5; i += 1) {
      state = advance(state, scan(`2026-11-${String((i % 28) + 1).padStart(2, "0")}T09:00:00Z`, { Recall: { stars: i } }));
    }
    expect(state.revisions).toHaveLength(SHEET.keepRevisions);
    expect(latestRevision(state).rev).toBe(SHEET.keepRevisions + 6);
  });
});

describe("diffScans", () => {
  it("orders changes by repo, then release, status, stars", () => {
    const prev = scan();
    const next = scan("2026-10-24T09:00:00Z", {
      Recall: { stars: 3, release: "v2.0.0", checks: "failing" },
    });
    expect(diffScans(prev, next).map((c) => c.kind)).toEqual(["release", "status", "stars"]);
  });

  it("reports products that were not in the previous scan", () => {
    const prev = { ...scan(), repos: scan().repos.slice(0, 4) };
    expect(diffScans(prev, scan())).toEqual([{ kind: "added", repo: "sealed" }]);
  });
});
