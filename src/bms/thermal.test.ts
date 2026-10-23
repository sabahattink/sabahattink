import { describe, expect, it } from "vitest";
import { zoneConfig } from "./config.js";
import { equilibrium, rebase, temperatureAt, timeConstant } from "./thermal.js";

const office = zoneConfig("office");
const server = zoneConfig("server");
const start = "2026-10-24T00:00:00Z";
const hoursLater = (h: number): string => new Date(Date.parse(start) + h * 3_600_000).toISOString();

describe("thermal model", () => {
  it("settles near the setpoint, offset by outdoor air and internal gains", () => {
    const eq = equilibrium(office, 22, true, 18);
    expect(eq).toBeGreaterThan(21.9);
    expect(eq).toBeLessThan(22.6);
  });

  it("puts a server room at its maximum setpoint above the 27 °C limit", () => {
    expect(equilibrium(server, 27, false, 20)).toBeGreaterThan(server.limits.high);
    expect(equilibrium(server, 26, false, 20)).toBeLessThan(server.limits.high);
  });

  it("starts at temp0 and approaches equilibrium monotonically", () => {
    const state = { setpoint: 26, lights: false, t0: start, temp0: 22, alarm: "normal" as const };
    const eq = equilibrium(office, 26, false, 18);
    const samples = [0, 0.5, 1, 2, 4, 12].map((h) => temperatureAt(office, state, 18, hoursLater(h)));
    expect(samples[0]).toBeCloseTo(22, 6);
    for (let i = 1; i < samples.length; i += 1) expect(samples[i]).toBeGreaterThan(samples[i - 1] ?? Number.NaN);
    expect(samples.at(-1)).toBeCloseTo(eq, 2);
    expect(temperatureAt(office, state, 18, hoursLater(3 * timeConstant(office)))).toBeCloseTo(eq + (22 - eq) * Math.exp(-3), 6);
  });

  it("is continuous across a rebase", () => {
    const state = { setpoint: 25, lights: true, t0: start, temp0: 21, alarm: "normal" as const };
    const at = hoursLater(0.7);
    const before = temperatureAt(office, state, 15, at);
    const after = temperatureAt(office, rebase(office, state, 15, at), 15, at);
    expect(after).toBeCloseTo(before, 2);
  });
});
