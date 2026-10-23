import { describe, expect, it } from "vitest";
import { buildQuery, parseResponse } from "./scan.js";

const node = (name: string, rollup: string | null) => ({
  name,
  url: `https://github.com/sabahattink/${name}`,
  stargazerCount: 4,
  pushedAt: "2026-10-20T10:00:00Z",
  isArchived: false,
  latestRelease: { tagName: "recall-context@0.2.1" },
  defaultBranchRef: { target: { statusCheckRollup: rollup === null ? null : { state: rollup } } },
});

describe("buildQuery", () => {
  it("aliases one repository field per product", () => {
    const query = buildQuery("sabahattink", ["Recall", "codediag"]);
    expect(query).toContain('r0: repository(owner: "sabahattink", name: "Recall")');
    expect(query).toContain('r1: repository(owner: "sabahattink", name: "codediag")');
  });
});

describe("parseResponse", () => {
  it("normalizes check rollups", () => {
    const payload = {
      data: { r0: node("a", "SUCCESS"), r1: node("b", "ERROR"), r2: node("c", "PENDING"), r3: node("d", null) },
    };
    const result = parseResponse(payload, ["a", "b", "c", "d"], "2026-10-23T09:00:00Z");
    expect(result.repos.map((r) => r.checks)).toEqual(["passing", "failing", "pending", "none"]);
    expect(result.repos[0]?.release).toBe("recall-context@0.2.1");
  });

  it("fails loud on GraphQL errors and missing repositories", () => {
    expect(() => parseResponse({ data: { r0: null }, errors: [{ message: "NOT_FOUND" }] }, ["x"], "2026-10-23T09:00:00Z")).toThrow(
      /NOT_FOUND/,
    );
    expect(() => parseResponse({ data: { r0: null } }, ["x"], "2026-10-23T09:00:00Z")).toThrow(/x/);
  });

  it("rejects payloads that do not match the schema", () => {
    expect(() => parseResponse({ data: { r0: { name: "a" } } }, ["a"], "2026-10-23T09:00:00Z")).toThrow();
  });
});
