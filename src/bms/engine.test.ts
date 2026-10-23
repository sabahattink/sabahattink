import { describe, expect, it } from "vitest";
import { parseCommand } from "./command.js";
import { OPERATION, REPO } from "./config.js";
import { activeAlarms, advance, applyCommand, initialState, setOutdoor, temperatureOf, unackedAlarms } from "./engine.js";
import type { BmsState } from "./schema.js";

const t = (minutes: number): string => new Date(Date.parse("2026-10-24T05:00:00Z") + minutes * 60_000).toISOString().replace(".000Z", "Z");

function run(state: BmsState, at: string, issue: number, user: string, title: string): BmsState {
  return applyCommand(advance(state, at), issue, user, parseCommand(title));
}

describe("operator commands", () => {
  const base = initialState(t(0), 18, true);

  it("starts every zone at its equilibrium with no alarms", () => {
    expect(activeAlarms(base)).toBe(0);
    expect(temperatureOf(base, "office")).toBeCloseTo(base.zones.office.temp0, 3);
  });

  it("accepts a valid setpoint, logs the operator and answers the issue", () => {
    const next = run(base, t(5), 1, "octocat", "bms: office setpoint 24");
    expect(next.zones.office.setpoint).toBe(24);
    expect(next.log.at(-1)).toMatchObject({ kind: "write", user: "octocat" });
    expect(next.handled.at(-1)).toMatchObject({ issue: 1, close: "completed" });
    expect(next.handled.at(-1)?.reply).toMatch(/Write accepted/);
  });

  it("denies values outside the zone range or off the 0.5 °C grid", () => {
    for (const [i, title] of ["bms: server setpoint 30", "bms: office setpoint 17.5", "bms: office setpoint 22.3"].entries()) {
      const next = run(base, t(5), 10 + i, "octocat", title);
      expect(next.handled.at(-1)).toMatchObject({ close: "not_planned" });
      expect(next.handled.at(-1)?.reply).toMatch(/VALUE_OUT_OF_RANGE/);
    }
  });

  it("rate-limits operators but not the owner", () => {
    let s = run(base, t(1), 1, "octocat", "bms: office setpoint 23");
    s = run(s, t(2), 2, "octocat", "bms: office setpoint 24");
    expect(s.handled.at(-1)?.reply).toMatch(/SERVICE_REQUEST_DENIED/);
    s = run(s, t(1 + OPERATION.rateLimitMinutes), 3, "octocat", "bms: office setpoint 24");
    expect(s.zones.office.setpoint).toBe(24);

    let o = run(base, t(1), 4, REPO.owner, "bms: office setpoint 23");
    o = run(o, t(2), 5, REPO.owner, "bms: office setpoint 24");
    expect(o.zones.office.setpoint).toBe(24);
  });

  it("never applies the same issue twice", () => {
    const once = run(base, t(5), 7, "octocat", "bms: lobby lights off");
    const twice = applyCommand(once, 7, "octocat", parseCommand("bms: lobby lights on"));
    expect(twice).toBe(once);
  });

  it("runs the full alarm cycle: raise, acknowledge, clear", () => {
    let s = run(base, t(1), 1, "octocat", "bms: server setpoint 27");
    s = advance(s, t(120));
    expect(s.zones.server.alarm).toBe("active-unacked");
    expect(unackedAlarms(s)).toBe(1);

    s = run(s, t(121), 2, "grace-h", "bms: ack");
    expect(s.zones.server.alarm).toBe("active-acked");
    expect(unackedAlarms(s)).toBe(0);

    s = run(s, t(140), 3, "ada-l", "bms: server setpoint 21");
    s = advance(s, t(300));
    expect(s.zones.server.alarm).toBe("normal");
    expect(s.log.map((e) => e.kind)).toEqual(["write", "alarm", "ack", "write", "return"]);
  });

  it("holds an unacknowledged return until someone acknowledges it", () => {
    let s = run(base, t(1), 1, "octocat", "bms: server setpoint 27");
    s = advance(s, t(120));
    s = run(s, t(121), 2, "ada-l", "bms: server setpoint 21");
    s = advance(s, t(300));
    expect(s.zones.server.alarm).toBe("returned-unacked");
    s = run(s, t(301), 3, "grace-h", "bms: ack");
    expect(s.zones.server.alarm).toBe("normal");
  });

  it("keeps temperatures continuous when the outdoor reading changes", () => {
    const at = t(90);
    const s = run(base, t(1), 1, "octocat", "bms: office setpoint 25");
    const before = temperatureOf(advance(s, at), "office");
    const after = temperatureOf(setOutdoor(advance(s, at), 30, true), "office");
    expect(after).toBeCloseTo(before, 2);
  });

  it("never moves the building clock backwards", () => {
    const later = advance(base, t(60));
    expect(advance(later, t(10)).at).toBe(later.at);
  });

  it("bounds the log and the handled list", () => {
    let s = base;
    for (let i = 1; i <= OPERATION.handledSize + 20; i += 1) {
      s = run(s, t(i), i, "mallory", "bms: nowhere setpoint 22");
    }
    expect(s.log.length).toBe(OPERATION.logSize);
    expect(s.handled.length).toBe(OPERATION.handledSize);
  });
});
