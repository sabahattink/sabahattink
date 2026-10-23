import type { Parsed } from "./command.js";
import { OPERATION, REPO, type ZoneConfig, type ZoneId, ZONES, zoneConfig } from "./config.js";
import { bakuTime, celsius, duration } from "./format.js";
import type { AlarmState, BmsState, Handled, LogEntry, ZoneState } from "./schema.js";
import { equilibrium, rebase, round3, settleMinutes, temperatureAt } from "./thermal.js";

export const README_ANCHOR = `https://github.com/${REPO.owner}/${REPO.name}#operate-the-building`;

const FOOTER =
  "\n\n<sub>Building SK-01 is a simulation; the outdoor temperature is live from Baku. " +
  "The plan in the profile README is redrawn in a minute or two.</sub>";

function later(a: string, b: string): string {
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

export function initialState(at: string, outdoor: number, live: boolean): BmsState {
  const zones = Object.fromEntries(
    ZONES.map((z) => [
      z.id,
      {
        setpoint: z.setpoint.initial,
        lights: z.lightsInitial,
        t0: at,
        temp0: round3(equilibrium(z, z.setpoint.initial, z.lightsInitial, outdoor)),
        alarm: "normal",
      } satisfies ZoneState,
    ]),
  ) as Record<ZoneId, ZoneState>;
  return { version: 1, at, outdoor: { value: outdoor, at, live }, zones, log: [], handled: [], lastWrite: {} };
}

export function temperatureOf(state: BmsState, id: ZoneId): number {
  return temperatureAt(zoneConfig(id), state.zones[id], state.outdoor.value, state.at);
}

export function targetOf(state: BmsState, id: ZoneId): number {
  const zone = state.zones[id];
  return equilibrium(zoneConfig(id), zone.setpoint, zone.lights, state.outdoor.value);
}

/* ---------- alarms: the usual BMS acknowledge cycle ---------- */

function evaluate(zone: ZoneConfig, state: ZoneState, outdoor: number, at: string): { alarm: AlarmState; entry: LogEntry | null } {
  const temp = temperatureAt(zone, state, outdoor, at);
  const kind = temp > zone.limits.high ? "high" : temp < zone.limits.low ? "low" : null;
  const raise = (): LogEntry => ({ at, kind: "alarm", user: null, text: `${zone.name} ${kind} temperature ${celsius(temp)}` });
  const clear = (): LogEntry => ({ at, kind: "return", user: null, text: `${zone.name} back to normal` });

  switch (state.alarm) {
    case "normal":
      return kind === null ? { alarm: "normal", entry: null } : { alarm: "active-unacked", entry: raise() };
    case "active-unacked":
      return kind === null ? { alarm: "returned-unacked", entry: clear() } : { alarm: "active-unacked", entry: null };
    case "active-acked":
      return kind === null ? { alarm: "normal", entry: clear() } : { alarm: "active-acked", entry: null };
    case "returned-unacked":
      return kind === null ? { alarm: "returned-unacked", entry: null } : { alarm: "active-unacked", entry: raise() };
  }
}

/** Move the building clock forward and evaluate alarms there. Time never runs backwards. */
export function advance(state: BmsState, at: string): BmsState {
  const t = later(at, state.at);
  const zones = { ...state.zones };
  const entries: LogEntry[] = [];
  for (const zone of ZONES) {
    const result = evaluate(zone, zones[zone.id], state.outdoor.value, t);
    zones[zone.id] = { ...zones[zone.id], alarm: result.alarm };
    if (result.entry !== null) entries.push(result.entry);
  }
  return { ...state, at: t, zones, log: [...state.log, ...entries].slice(-OPERATION.logSize) };
}

/** New outdoor reading at the current building time; every zone opens a new segment. */
export function setOutdoor(state: BmsState, value: number, live: boolean): BmsState {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === state.outdoor.value && live === state.outdoor.live) return state;
  const zones = { ...state.zones };
  for (const zone of ZONES) zones[zone.id] = rebase(zone, zones[zone.id], state.outdoor.value, state.at);
  return { ...state, zones, outdoor: { value: rounded, at: state.at, live } };
}

/* ---------- commands ---------- */

function finish(
  state: BmsState,
  issue: number,
  entry: LogEntry,
  reply: string,
  close: Handled["close"],
  countsAsWrite: boolean,
): BmsState {
  const handled: Handled = { issue, reply: reply + FOOTER, close };
  return {
    ...state,
    log: [...state.log, entry].slice(-OPERATION.logSize),
    handled: [...state.handled, handled].slice(-OPERATION.handledSize),
    lastWrite: countsAsWrite && entry.user !== null ? { ...state.lastWrite, [entry.user]: state.at } : state.lastWrite,
  };
}

function deny(state: BmsState, issue: number, user: string, code: string, detail: string, short: string): BmsState {
  const reply = `**Write denied: ${code}.** ${detail}\n\nCommands and current values are in the [README](${README_ANCHOR}).`;
  return finish(state, issue, { at: state.at, kind: "denied", user, text: `Denied: ${short}` }, reply, "not_planned", false);
}

function limitNote(zone: ZoneConfig, target: number): string {
  if (target > zone.limits.high) {
    return ` That is above the ${celsius(zone.limits.high)} high limit, so expect a high-temperature alarm on the next scan.`;
  }
  if (target < zone.limits.low) {
    return ` That is below the ${celsius(zone.limits.low)} low limit, so expect a low-temperature alarm on the next scan.`;
  }
  return "";
}

/**
 * Apply one operator command at the current building time (call advance() first).
 * Pure: the returned state carries the log entry and the reply for the issue.
 */
export function applyCommand(state: BmsState, issue: number, user: string, parsed: Parsed): BmsState {
  if (state.handled.some((h) => h.issue === issue)) return state;
  if (!parsed.ok) {
    return deny(state, issue, user, parsed.error, parsed.detail, parsed.error === "UNKNOWN_OBJECT" ? "unknown zone" : "unrecognized command");
  }

  const last = state.lastWrite[user];
  const windowMs = OPERATION.rateLimitMinutes * 60_000;
  if (user !== REPO.owner && last !== undefined && Date.parse(state.at) - Date.parse(last) < windowMs) {
    const next = bakuTime(new Date(Date.parse(last) + windowMs).toISOString()).time;
    return deny(
      state,
      issue,
      user,
      "SERVICE_REQUEST_DENIED",
      `One command per ${OPERATION.rateLimitMinutes} minutes per operator. Try again after ${next} Baku time.`,
      "rate limit",
    );
  }

  const { command } = parsed;
  const outdoor = state.outdoor.value;

  if (command.kind === "ack") {
    const zones = { ...state.zones };
    let count = 0;
    for (const zone of ZONES) {
      const alarm = zones[zone.id].alarm;
      if (alarm === "active-unacked") zones[zone.id] = { ...zones[zone.id], alarm: "active-acked" };
      if (alarm === "returned-unacked") zones[zone.id] = { ...zones[zone.id], alarm: "normal" };
      if (alarm === "active-unacked" || alarm === "returned-unacked") count += 1;
    }
    const reply =
      count === 0
        ? "**Accepted.** Nothing to acknowledge: there are no unacknowledged alarms."
        : `**Accepted.** Acknowledged ${count} alarm${count === 1 ? "" : "s"}. Active alarms stay on the plan until the condition clears.`;
    const entry: LogEntry = { at: state.at, kind: "ack", user, text: count === 0 ? "Acknowledge (nothing pending)" : `Acknowledged ${count} alarm${count === 1 ? "" : "s"}` };
    return finish({ ...state, zones }, issue, entry, reply, "completed", true);
  }

  const zone = zoneConfig(command.zone);
  const current = rebase(zone, state.zones[command.zone], outdoor, state.at);

  if (command.kind === "setpoint") {
    const { min, max } = zone.setpoint;
    const steps = command.value / OPERATION.setpointStep;
    if (command.value < min || command.value > max || Math.abs(steps - Math.round(steps)) > 1e-9) {
      return deny(
        state,
        issue,
        user,
        "VALUE_OUT_OF_RANGE",
        `${zone.name} setpoint must be between ${celsius(min)} and ${celsius(max)} in ${OPERATION.setpointStep} \u00B0C steps.`,
        `${zone.id} setpoint ${command.value}`,
      );
    }
    const next: ZoneState = { ...current, setpoint: command.value };
    const target = equilibrium(zone, next.setpoint, next.lights, outdoor);
    const reply =
      `**Write accepted.** ${zone.name} setpoint ${celsius(current.setpoint)} \u2192 ${celsius(command.value)}.\n\n` +
      `The room will settle near ${celsius(target)} in ${duration(settleMinutes(zone))}.${limitNote(zone, target)}`;
    const entry: LogEntry = { at: state.at, kind: "write", user, text: `${zone.name} setpoint ${celsius(command.value)}` };
    return finish({ ...state, zones: { ...state.zones, [command.zone]: next } }, issue, entry, reply, "completed", true);
  }

  const next: ZoneState = { ...current, lights: command.on };
  const target = equilibrium(zone, next.setpoint, next.lights, outdoor);
  const reply =
    `**Write accepted.** ${zone.name} lights ${command.on ? "on" : "off"}.\n\n` +
    `Lighting load changes the room's heat balance: it will settle near ${celsius(target)}.${limitNote(zone, target)}`;
  const entry: LogEntry = { at: state.at, kind: "write", user, text: `${zone.name} lights ${command.on ? "on" : "off"}` };
  return finish({ ...state, zones: { ...state.zones, [command.zone]: next } }, issue, entry, reply, "completed", true);
}

export function activeAlarms(state: BmsState): number {
  return ZONES.filter((z) => state.zones[z.id].alarm !== "normal").length;
}

export function unackedAlarms(state: BmsState): number {
  return ZONES.filter((z) => {
    const alarm = state.zones[z.id].alarm;
    return alarm === "active-unacked" || alarm === "returned-unacked";
  }).length;
}
