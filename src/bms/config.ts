/**
 * Building SK-01: a simulated office floor in Baku, operated through GitHub issues.
 * Everything physical about the building lives here; the engine only reads it.
 */

export const REPO = { owner: "sabahattink", name: "sabahattink" } as const;

export const SITE = {
  building: "SK-01",
  city: "Baku",
  latitude: 40.41,
  longitude: 49.87,
  /** Asia/Baku is UTC+4 all year (no DST since 2016). */
  utcOffsetHours: 4,
} as const;

export const COMMAND_PREFIX = "bms:";

export const ZONE_IDS = ["office", "meeting", "server", "lobby"] as const;
export type ZoneId = (typeof ZONE_IDS)[number];

export interface ZoneConfig {
  readonly id: ZoneId;
  readonly name: string;
  /** Controller tag drawn on the plan. */
  readonly tag: string;
  readonly setpoint: { readonly min: number; readonly max: number; readonly initial: number };
  /** Alarm limits on zone temperature, °C. */
  readonly limits: { readonly low: number; readonly high: number };
  /** Time constant of the HVAC loop, hours. Small = strong plant. */
  readonly tauHvac: number;
  /** Time constant of the envelope against outdoor air, hours. */
  readonly tauEnvelope: number;
  /** Internal heat gain, K/h: people, equipment, servers. */
  readonly gain: number;
  /** Extra gain while the lights are on, K/h. */
  readonly lightGain: number;
  readonly lightsInitial: boolean;
}

export const ZONES: readonly ZoneConfig[] = [
  {
    id: "office",
    name: "Open office",
    tag: "VAV-01",
    setpoint: { min: 18, max: 26, initial: 22 },
    limits: { low: 16, high: 28 },
    tauHvac: 0.75,
    tauEnvelope: 10,
    gain: 0.6,
    lightGain: 0.3,
    lightsInitial: true,
  },
  {
    id: "meeting",
    name: "Meeting room",
    tag: "VAV-02",
    setpoint: { min: 18, max: 26, initial: 22 },
    limits: { low: 16, high: 28 },
    tauHvac: 0.75,
    tauEnvelope: 8,
    gain: 0.4,
    lightGain: 0.2,
    lightsInitial: false,
  },
  {
    // 27 °C is the upper end of the ASHRAE recommended inlet envelope. The setpoint
    // may go to 27, but the server load puts the room above it: physics, not policy.
    id: "server",
    name: "Server room",
    tag: "CRAC-01",
    setpoint: { min: 18, max: 27, initial: 21 },
    limits: { low: 15, high: 27 },
    tauHvac: 0.25,
    tauEnvelope: 12,
    gain: 4,
    lightGain: 0.1,
    lightsInitial: false,
  },
  {
    id: "lobby",
    name: "Lobby",
    tag: "FCU-01",
    setpoint: { min: 18, max: 26, initial: 21 },
    limits: { low: 14, high: 30 },
    tauHvac: 1.2,
    tauEnvelope: 5,
    gain: 0.1,
    lightGain: 0.2,
    lightsInitial: true,
  },
];

export function zoneConfig(id: ZoneId): ZoneConfig {
  const zone = ZONES.find((z) => z.id === id);
  if (zone === undefined) throw new Error(`Unknown zone ${id}`);
  return zone;
}

export const OPERATION = {
  /** Accepted commands per operator: one per this many minutes. The owner is exempt. */
  rateLimitMinutes: 10,
  setpointStep: 0.5,
  logSize: 40,
  handledSize: 200,
  /** Used only when the very first run cannot reach the weather service. */
  fallbackOutdoor: 20,
} as const;
