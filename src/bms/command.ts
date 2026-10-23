import { COMMAND_PREFIX, ZONE_IDS, type ZoneId } from "./config.js";

export type Command =
  | { readonly kind: "setpoint"; readonly zone: ZoneId; readonly value: number }
  | { readonly kind: "lights"; readonly zone: ZoneId; readonly on: boolean }
  | { readonly kind: "ack" };

/** BACnet reject and error names, so a BMS engineer recognises the replies. */
export type ParseError = "UNRECOGNIZED_SERVICE" | "UNKNOWN_OBJECT";

export type Parsed =
  | { readonly ok: true; readonly command: Command }
  | { readonly ok: false; readonly error: ParseError; readonly detail: string };

const VALUE = /^\d{1,2}(?:\.\d)?$/;

function isZone(word: string): word is ZoneId {
  return (ZONE_IDS as readonly string[]).includes(word);
}

export function isCommandTitle(title: string): boolean {
  return title.trim().toLowerCase().startsWith(COMMAND_PREFIX);
}

/**
 * Grammar, case-insensitive:
 *   bms: <zone> setpoint <18-27, step 0.5>
 *   bms: <zone> lights <on|off>
 *   bms: ack
 * Untrusted input: the title is matched against this grammar and nothing else.
 */
export function parseCommand(title: string): Parsed {
  const words = title.trim().toLowerCase().slice(COMMAND_PREFIX.length).trim().split(/\s+/).filter(Boolean);
  const [first, verb, arg, ...extra] = words;
  const usage = `Expected "bms: <zone> setpoint <value>", "bms: <zone> lights on|off" or "bms: ack". Zones: ${ZONE_IDS.join(", ")}.`;

  if (first === "ack" && verb === undefined) return { ok: true, command: { kind: "ack" } };
  if (first === undefined || verb === undefined || arg === undefined || extra.length > 0) {
    return { ok: false, error: "UNRECOGNIZED_SERVICE", detail: usage };
  }
  if (!isZone(first)) {
    return { ok: false, error: "UNKNOWN_OBJECT", detail: `There is no zone called "${first.slice(0, 20)}". Zones: ${ZONE_IDS.join(", ")}.` };
  }
  if (verb === "setpoint" && VALUE.test(arg)) {
    return { ok: true, command: { kind: "setpoint", zone: first, value: Number(arg) } };
  }
  if (verb === "lights" && (arg === "on" || arg === "off")) {
    return { ok: true, command: { kind: "lights", zone: first, on: arg === "on" } };
  }
  return { ok: false, error: "UNRECOGNIZED_SERVICE", detail: usage };
}
