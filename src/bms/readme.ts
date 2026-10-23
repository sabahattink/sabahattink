import { injectBetween } from "../render/readme.js";
import { OPERATION, REPO, ZONES, type ZoneConfig } from "./config.js";
import { temperatureOf, unackedAlarms } from "./engine.js";
import { bakuTime, celsius } from "./format.js";
import type { BmsState } from "./schema.js";

export const START = "<!-- building:start -->";
export const END = "<!-- building:end -->";

const ISSUE_BODY =
  "Submit this issue as it is to send the command to Building SK-01.\n\n" +
  "A workflow validates the write, applies it, replies here with the result and closes the issue, usually within two minutes. " +
  "Your GitHub username appears in the public operator log in the profile README.";

/** Prefilled "new issue" link. Parentheses are escaped so the Markdown link cannot break. */
export function commandUrl(title: string): string {
  const enc = (s: string): string => encodeURIComponent(s).replaceAll("(", "%28").replaceAll(")", "%29");
  return `https://github.com/${REPO.owner}/${REPO.name}/issues/new?title=${enc(title)}&body=${enc(ISSUE_BODY)}`;
}

function setpointLinks(zone: ZoneConfig, current: number): string[] {
  const links: string[] = [];
  const down = Math.max(zone.setpoint.min, current - 1);
  const up = Math.min(zone.setpoint.max, current + 1);
  if (down < current) links.push(`[\u2212${(current - down).toFixed(1)} \u00B0C](${commandUrl(`bms: ${zone.id} setpoint ${down.toFixed(1)}`)})`);
  if (up > current) links.push(`[+${(up - current).toFixed(1)} \u00B0C](${commandUrl(`bms: ${zone.id} setpoint ${up.toFixed(1)}`)})`);
  return links;
}

/**
 * Commands are absolute writes ("setpoint 23.0", not "+1"), so two visitors clicking the
 * same stale link produce the same result. Same rule a BMS uses for operator writes.
 */
export function buildingBlock(state: BmsState): string {
  const rows = ZONES.map((zone) => {
    const zs = state.zones[zone.id];
    const temp = celsius(temperatureOf(state, zone.id));
    const alarm = zs.alarm === "active-unacked" || zs.alarm === "active-acked";
    const ops = [
      ...setpointLinks(zone, zs.setpoint),
      `[Lights ${zs.lights ? "off" : "on"}](${commandUrl(`bms: ${zone.id} lights ${zs.lights ? "off" : "on"}`)})`,
    ].join(" \u00B7 ");
    return `| ${zone.name} | ${alarm ? `**${temp}** (alarm)` : temp} | ${celsius(zs.setpoint)} | ${zs.lights ? "On" : "Off"} | ${ops} |`;
  });

  const pending = unackedAlarms(state);
  const alarmLine =
    pending > 0
      ? `**${pending} unacknowledged alarm${pending === 1 ? "" : "s"}.** [Acknowledge](${commandUrl("bms: ack")})`
      : "No unacknowledged alarms.";
  const local = bakuTime(state.at);
  const outdoorLine = state.outdoor.live
    ? `Outdoor air ${celsius(state.outdoor.value)}, live from Baku via [Open-Meteo](https://open-meteo.com/) (CC BY 4.0).`
    : `Outdoor air ${celsius(state.outdoor.value)} (last reading; the weather service did not answer on the latest scan).`;

  const log = state.log
    .slice(-10)
    .reverse()
    .map((e) => {
      const t = bakuTime(e.at);
      const who = e.user === null ? "system" : `[${e.user}](https://github.com/${e.user})`;
      return `| ${t.date} ${t.time} | ${who} | ${e.text.replaceAll("|", "\\|")} |`;
    });

  return [
    "| Zone | Temperature | Setpoint | Lights | Operate |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    "",
    `${alarmLine} ${outdoorLine} Scanned ${local.date} ${local.time} Baku time. One command per operator every ${OPERATION.rateLimitMinutes} minutes.`,
    "",
    "<details>",
    "<summary>Operator log</summary>",
    "",
    ...(log.length === 0
      ? ["No commands yet."]
      : ["| Time (Baku) | Operator | Event |", "| --- | --- | --- |", ...log]),
    "",
    "</details>",
  ].join("\n");
}

export function injectBuilding(readme: string, block: string): string {
  return injectBetween(readme, START, END, block);
}
