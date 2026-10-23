import type { ZoneConfig } from "./config.js";
import type { ZoneState } from "./schema.js";

const HOUR_MS = 3_600_000;

/**
 * dT/dt = (SP − T)/τh + (OAT − T)/τe + g. A proportional plant against a leaky
 * envelope: it settles near, not on, the setpoint. That offset is the point.
 */
export function equilibrium(zone: ZoneConfig, setpoint: number, lights: boolean, outdoor: number): number {
  const a = 1 / zone.tauHvac;
  const b = 1 / zone.tauEnvelope;
  const gain = zone.gain + (lights ? zone.lightGain : 0);
  return (setpoint * a + outdoor * b + gain) / (a + b);
}

/** Combined time constant, hours. */
export function timeConstant(zone: ZoneConfig): number {
  return 1 / (1 / zone.tauHvac + 1 / zone.tauEnvelope);
}

export function temperatureAt(zone: ZoneConfig, state: ZoneState, outdoor: number, at: string): number {
  const hours = Math.max(0, (Date.parse(at) - Date.parse(state.t0)) / HOUR_MS);
  const target = equilibrium(zone, state.setpoint, state.lights, outdoor);
  return target + (state.temp0 - target) * Math.exp(-hours / timeConstant(zone));
}

/** Close a segment at `at` and open a new one from the temperature reached there. */
export function rebase(zone: ZoneConfig, state: ZoneState, outdoor: number, at: string): ZoneState {
  return { ...state, t0: at, temp0: round3(temperatureAt(zone, state, outdoor, at)) };
}

/** Minutes to cover 95 % of a step (three time constants), rounded to 5. */
export function settleMinutes(zone: ZoneConfig): number {
  return Math.round((3 * timeConstant(zone) * 60) / 5) * 5;
}

/** Persisted temperatures are rounded so the state file is byte-stable across platforms. */
export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
