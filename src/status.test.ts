import { describe, expect, it } from "vitest";
import { statusOf } from "./status.js";
import { repo } from "./test/fixtures.js";

describe("statusOf", () => {
  const at = "2026-10-23T09:00:00Z";

  it("is normal for a recently pushed repo with passing or missing checks", () => {
    expect(statusOf(repo({ repo: "a" }), at)).toBe("normal");
    expect(statusOf(repo({ repo: "a", checks: "none" }), at)).toBe("normal");
  });

  it("flags maintenance strictly after the stale threshold", () => {
    expect(statusOf(repo({ repo: "a", pushedAt: "2026-07-25T09:00:00Z" }), at, 90)).toBe("normal");
    expect(statusOf(repo({ repo: "a", pushedAt: "2026-07-24T09:00:00Z" }), at, 90)).toBe("maintenance");
  });

  it("treats an archived product as maintenance", () => {
    expect(statusOf(repo({ repo: "a", archived: true }), at)).toBe("maintenance");
  });

  it("lets a fault win over maintenance", () => {
    expect(statusOf(repo({ repo: "a", checks: "failing", pushedAt: "2025-01-01T00:00:00Z" }), at)).toBe("fault");
  });
});
