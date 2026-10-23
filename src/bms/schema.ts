import { z } from "zod";
import { ZONE_IDS } from "./config.js";

export const ZoneIdSchema = z.enum(ZONE_IDS);

export const AlarmStateSchema = z.enum(["normal", "active-unacked", "active-acked", "returned-unacked"]);
export type AlarmState = z.infer<typeof AlarmStateSchema>;

/**
 * One zone as a first-order response that started at (t0, temp0) under the current
 * setpoint, lights and outdoor temperature. Any change opens a new segment.
 */
export const ZoneStateSchema = z.object({
  setpoint: z.number(),
  lights: z.boolean(),
  t0: z.iso.datetime(),
  temp0: z.number(),
  alarm: AlarmStateSchema,
});
export type ZoneState = z.infer<typeof ZoneStateSchema>;

export const LogEntrySchema = z.object({
  at: z.iso.datetime(),
  kind: z.enum(["write", "denied", "ack", "alarm", "return"]),
  user: z.string().nullable(),
  text: z.string(),
});
export type LogEntry = z.infer<typeof LogEntrySchema>;

export const HandledSchema = z.object({
  issue: z.number().int().positive(),
  reply: z.string(),
  close: z.enum(["completed", "not_planned"]),
});
export type Handled = z.infer<typeof HandledSchema>;

export const BmsStateSchema = z.object({
  version: z.literal(1),
  at: z.iso.datetime(),
  outdoor: z.object({ value: z.number(), at: z.iso.datetime(), live: z.boolean() }),
  zones: z.record(ZoneIdSchema, ZoneStateSchema),
  log: z.array(LogEntrySchema),
  handled: z.array(HandledSchema),
  lastWrite: z.record(z.string(), z.iso.datetime()),
});
export type BmsState = z.infer<typeof BmsStateSchema>;

/** GitHub REST: the subset of an issue the operator queue needs. */
export const IssueSchema = z.object({
  number: z.number().int().positive(),
  title: z.string(),
  created_at: z.iso.datetime(),
  user: z.object({ login: z.string() }).nullable(),
  pull_request: z.unknown().optional(),
});
export const IssueListSchema = z.array(IssueSchema);

/** Open-Meteo current conditions. */
export const WeatherSchema = z.object({
  current: z.object({ temperature_2m: z.number() }),
});
