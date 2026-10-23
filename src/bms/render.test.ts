import { describe, expect, it } from "vitest";
import type { FontFaces } from "../render/fonts.js";
import { DARK, LIGHT } from "../render/theme.js";
import { parseCommand } from "./command.js";
import { advance, applyCommand, initialState } from "./engine.js";
import { renderPlan } from "./plan.js";
import { buildingBlock, commandUrl, END, injectBuilding, START } from "./readme.js";

const fonts: FontFaces = { sans400: "AA==", sans700: "AA==", mono400: "AA==" };
const base = initialState("2026-10-24T05:00:00Z", 19, true);
const alarmed = advance(
  applyCommand(advance(base, "2026-10-24T05:01:00Z"), 1, "octocat", parseCommand("bms: server setpoint 27")),
  "2026-10-24T07:00:00Z",
);

describe("floor plan", () => {
  it("is deterministic and free of undefined or NaN", () => {
    for (const theme of [LIGHT, DARK]) {
      const a = renderPlan({ state: alarmed, theme, fonts });
      expect(a).toBe(renderPlan({ state: alarmed, theme, fonts }));
      expect(a).not.toMatch(/undefined|NaN|Infinity/);
    }
  });

  it("blinks an unacknowledged alarm and invites the first operator on an empty log", () => {
    expect(renderPlan({ state: alarmed, theme: LIGHT, fonts })).toContain("al-red blink");
    expect(renderPlan({ state: base, theme: LIGHT, fonts })).toContain("Be the first operator.");
  });
});

describe("README block", () => {
  it("links absolute writes as prefilled issues", () => {
    const block = buildingBlock(base);
    expect(block).toContain(encodeURIComponent("bms: office setpoint 23.0"));
    expect(block).toContain(encodeURIComponent("bms: office setpoint 21.0"));
    expect(block).not.toMatch(/\]\([^)]*\([^)]*\)/);
  });

  it("offers acknowledge only when something is unacknowledged", () => {
    expect(buildingBlock(base)).not.toContain(encodeURIComponent("bms: ack"));
    expect(buildingBlock(alarmed)).toContain(encodeURIComponent("bms: ack"));
  });

  it("omits the link that would leave the setpoint range", () => {
    const atMax = applyCommand(advance(base, "2026-10-24T05:01:00Z"), 2, "octocat", parseCommand("bms: server setpoint 27"));
    const serverRow = buildingBlock(atMax).split("\n").find((l) => l.startsWith("| Server room"));
    expect(serverRow).toBeDefined();
    expect(serverRow).not.toContain("[+");
    expect(serverRow).not.toContain(encodeURIComponent("setpoint 28.0"));
  });

  it("escapes parentheses in command URLs", () => {
    expect(commandUrl("bms: x (y)")).not.toMatch(/[()]/);
  });

  it("injects between its own markers only", () => {
    const readme = `a\n${START}\nold\n${END}\nb\n`;
    expect(injectBuilding(readme, "new")).toBe(`a\n${START}\nnew\n${END}\nb\n`);
  });
});
