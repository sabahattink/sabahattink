import { describe, expect, it } from "vitest";
import { PRODUCTS } from "../config.js";
import { advance } from "../revisions.js";
import { scan } from "../test/fixtures.js";
import { END, injectBlock, projectTable, START } from "./readme.js";

describe("project table", () => {
  const state = advance(
    null,
    scan("2026-10-23T09:00:00Z", { sealed: { pushedAt: "2026-01-01T00:00:00Z", release: null }, Recall: { checks: "failing" } }),
  );
  const block = projectTable(state, PRODUCTS);

  it("lists every product once, linked, with type and release", () => {
    const rows = block.split("\n").filter((l) => l.startsWith("| ["));
    expect(rows).toHaveLength(PRODUCTS.length);
    expect(rows[0]).toContain("[Recall](https://github.com/sabahattink/Recall)");
    expect(block).toContain("| \u2014 |");
  });

  it("uses plain status wording", () => {
    expect(block).toContain("| Checks failing |");
    expect(block).toContain("| Inactive 90+ days |");
    expect(block).toContain("| Active |");
  });

  it("states where the data comes from and which revision it is", () => {
    expect(block).toContain("Revision 1, 2026-10-23.");
  });
});

describe("injectBlock", () => {
  it("replaces only the marked block and is idempotent", () => {
    const readme = `# Title\n\n${START}\nold\n${END}\n\nFooter\n`;
    const once = injectBlock(readme, "new");
    expect(once).toBe(`# Title\n\n${START}\nnew\n${END}\n\nFooter\n`);
    expect(injectBlock(once, "new")).toBe(once);
  });

  it("refuses a README without markers", () => {
    expect(() => injectBlock("# Title\n", "x")).toThrow(/projects:start/);
  });
});
