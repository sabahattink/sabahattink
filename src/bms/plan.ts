import type { FontFaces } from "../render/fonts.js";
import { textWidth } from "../render/metrics.js";
import { CELL, FRAME, STRIP_Y, VIEW, fitText, sheetFrame, sheetStyle } from "../render/sheet.js";
import { el, esc, n, text } from "../render/svg.js";
import type { Theme } from "../render/theme.js";
import { type ZoneConfig, type ZoneId, SITE, ZONES } from "./config.js";
import { activeAlarms, targetOf, temperatureOf } from "./engine.js";
import { bakuTime, celsius } from "./format.js";
import type { AlarmState, BmsState } from "./schema.js";

/* ---------- plan geometry, in sheet units (1 unit = 40 mm at the building) ---------- */

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const BUILDING: Rect = { x: 150, y: 70, w: 700, h: 350 };

const ROOMS: Record<ZoneId | "plant", Rect> = {
  office: { x: 150, y: 70, w: 370, h: 230 },
  plant: { x: 150, y: 300, w: 370, h: 120 },
  meeting: { x: 520, y: 70, w: 180, h: 170 },
  server: { x: 700, y: 70, w: 150, h: 170 },
  lobby: { x: 520, y: 240, w: 330, h: 180 },
};

const DOOR = 28;

const LOG_COL = { time: 530, user: 566, event: 652, end: 792 } as const;
const LOG_ROWS_Y = [503, 518, 533, 548, 563] as const;
const SHEET_ROWS_Y = [476, 493, 510, 527, 544, 561] as const;

const NOTES = [
  "Pick a command in the README.",
  "Submit the issue that opens.",
  "A workflow applies it and replies.",
  "Your username enters the log.",
] as const;

/* ---------- helpers ---------- */

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/** Thermal tint: neutral between 21 and 23.5 °C, cooler blue below, warmer orange above. */
function tint(theme: Theme, temp: number): { color: string; opacity: number } | null {
  if (temp < 21) return { color: theme.cool, opacity: clamp(((21 - temp) / 6) * 0.32, 0, 0.32) };
  if (temp > 23.5) return { color: theme.warm, opacity: clamp(((temp - 23.5) / 4) * 0.38, 0, 0.38) };
  return null;
}

function doorH(x1: number, x2: number, y: number, dir: 1 | -1): string {
  const w = x2 - x1;
  return `M${n(x1)} ${n(y)}L${n(x1)} ${n(y + dir * w)}A${n(w)} ${n(w)} 0 0 ${dir === 1 ? 0 : 1} ${n(x2)} ${n(y)}`;
}

function doorV(x: number, y1: number, y2: number, dir: 1 | -1): string {
  const w = y2 - y1;
  return `M${n(x)} ${n(y1)}L${n(x + dir * w)} ${n(y1)}A${n(w)} ${n(w)} 0 0 ${dir === 1 ? 1 : 0} ${n(x)} ${n(y2)}`;
}

function alarmLabel(state: AlarmState, kind: string): readonly [string, string] {
  switch (state) {
    case "active-unacked":
      return [`${kind} temperature`, "Unacknowledged"];
    case "active-acked":
      return [`${kind} temperature`, "Acknowledged"];
    case "returned-unacked":
      return ["Back to normal", "Unacknowledged"];
    case "normal":
      return ["", ""];
  }
}

function planStyle(theme: Theme): string {
  const t = theme;
  return `<style>
.wall{fill:none;stroke:${t.line};stroke-width:6;stroke-linejoin:miter}
.iwall{stroke:${t.line};stroke-width:3}
.cut-out{stroke:${t.paper};stroke-width:9}
.door{fill:none;stroke:${t.line};stroke-width:1}
.glaze{stroke:${t.line};stroke-width:1}
.room{fill:${t.box}}
.dim{fill:none;stroke:${t.muted};stroke-width:.75}
.lamp-on{fill:${t.lamp};stroke:${t.ink};stroke-width:1}
.lamp-off{fill:${t.box};stroke:${t.muted};stroke-width:1}
.lamp-x{stroke:${t.ink};stroke-width:1}
.lamp-x-off{stroke:${t.muted};stroke-width:1}
.al-red{fill:none;stroke:${t.fault};stroke-width:3}
.al-green{fill:none;stroke:${t.normal};stroke-width:3}
.ahu{fill:${t.box};stroke:${t.line};stroke-width:1.2}
.fan{transform-box:fill-box;transform-origin:center;animation:spin 2.4s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.fan{animation:none}}
</style>`;
}

/* ---------- parts ---------- */

function walls(): string {
  const b = BUILDING;
  const parts: string[] = [];
  // interior partitions, drawn as segments so door openings stay true openings over any tint
  parts.push(
    el("path", {
      d: `M520 70V258M520 ${258 + DOOR}V352M520 ${352 + DOOR}V420M150 300H520M520 240H580M${580 + DOOR} 240H762M${762 + DOOR} 240H850M700 70V240`,
      class: "iwall",
    }),
  );
  parts.push(
    el("path", {
      d: [doorV(520, 258, 258 + DOOR, -1), doorV(520, 352, 352 + DOOR, -1), doorH(580, 580 + DOOR, 240, 1), doorH(762, 762 + DOOR, 240, 1)].join(""),
      class: "door",
    }),
  );
  // envelope
  parts.push(el("rect", { x: b.x, y: b.y, width: b.w, height: b.h, class: "wall" }));
  // entrance: a pair of leaves in the south wall
  parts.push(el("path", { d: `M650 420H710`, class: "cut-out" }));
  parts.push(el("path", { d: doorH(650, 680, 420, -1) + `M710 420L710 390A30 30 0 0 0 680 420`, class: "door" }));
  // windows: none in the server room, on purpose
  const windows: Array<readonly [number, number, number, number]> = [
    [205, 70, 295, 70],
    [355, 70, 455, 70],
    [570, 70, 650, 70],
    [150, 125, 150, 215],
    [850, 290, 850, 380],
    [230, 420, 330, 420],
  ];
  for (const [x1, y1, x2, y2] of windows) {
    const horizontal = y1 === y2;
    parts.push(el("path", { d: `M${x1} ${y1}L${x2} ${y2}`, class: "cut-out" }));
    const off = 2.4;
    const d = horizontal
      ? `M${x1} ${y1 - off}H${x2}M${x1} ${y1 + off}H${x2}M${x1} ${y1 - 3}V${y1 + 3}M${x2} ${y1 - 3}V${y1 + 3}`
      : `M${x1 - off} ${y1}V${y2}M${x1 + off} ${y1}V${y2}M${x1 - 3} ${y1}H${x1 + 3}M${x1 - 3} ${y2}H${x1 + 3}`;
    parts.push(el("path", { d, class: "glaze" }));
  }
  return parts.join("");
}

function dimensions(): string {
  const b = BUILDING;
  const tick = (x: number, y: number): string => `M${x - 4} ${y + 4}L${x + 4} ${y - 4}`;
  const top = 50;
  const left = 128;
  return [
    el("path", {
      d: `M${b.x} ${top}H${b.x + b.w}${tick(b.x, top)}${tick(b.x + b.w, top)}M${b.x} ${top - 6}V${b.y - 6}M${b.x + b.w} ${top - 6}V${b.y - 6}`,
      class: "dim",
    }),
    text(b.x + b.w / 2, top - 5, "28 000", "m mut mid", { "font-size": 8.5 }),
    el("path", {
      d: `M${left} ${b.y}V${b.y + b.h}${tick(left, b.y)}${tick(left, b.y + b.h)}M${left - 6} ${b.y}H${b.x - 6}M${left - 6} ${b.y + b.h}H${b.x - 6}`,
      class: "dim",
    }),
    text(left - 5, b.y + b.h / 2, "14 000", "m mut mid", { "font-size": 8.5, transform: `rotate(-90 ${left - 5} ${b.y + b.h / 2})` }),
  ].join("");
}

function lamp(cx: number, cy: number, on: boolean): string {
  const r = 7.5;
  const k = r * 0.7071;
  return [
    el("circle", { cx, cy, r, class: on ? "lamp-on" : "lamp-off" }),
    el("path", { d: `M${n(cx - k)} ${n(cy - k)}L${n(cx + k)} ${n(cy + k)}M${n(cx - k)} ${n(cy + k)}L${n(cx + k)} ${n(cy - k)}`, class: on ? "lamp-x" : "lamp-x-off" }),
  ].join("");
}

function room(zone: ZoneConfig, state: BmsState, theme: Theme): string {
  const r = ROOMS[zone.id];
  const zs = state.zones[zone.id];
  const temp = temperatureOf(state, zone.id);
  const target = targetOf(state, zone.id);
  const compact = r.w < 200;
  const parts: string[] = [el("rect", { x: r.x, y: r.y, width: r.w, height: r.h, class: "room" })];

  const shade = tint(theme, temp);
  if (shade !== null) {
    parts.push(el("rect", { x: r.x, y: r.y, width: r.w, height: r.h, fill: shade.color, "fill-opacity": shade.opacity }));
  }

  const x = r.x + 16;
  parts.push(text(x, r.y + 26, zone.name, "s b ink", { "font-size": 13 }));
  parts.push(text(x, r.y + 40, zone.tag, "m mut", { "font-size": 8.5 }));
  parts.push(lamp(r.x + r.w - 22, r.y + 22, zs.lights));

  const big = compact ? 30 : 34;
  const value = (Math.round(temp * 10) / 10).toFixed(1);
  const vy = r.y + (compact ? 80 : 86);
  parts.push(text(x, vy, value, "s b ink", { "font-size": big }));
  parts.push(text(x + textWidth(value, big, "sans") + 3, vy, "\u00B0C", "s ink", { "font-size": compact ? 13 : 15 }));
  parts.push(text(x, vy + 21, `Setpoint ${celsius(zs.setpoint)}`, "s ink", { "font-size": 11 }));
  const settling = Math.abs(target - temp) >= 0.2;
  const trend = settling ? `Settling to ${celsius(target)}` : "Stable";
  parts.push(text(x, vy + 36, fitText(trend, r.w - 32, 10.5, "sans"), "s mut", { "font-size": 10.5 }));

  if (zs.alarm !== "normal") {
    const kind = temp > zone.limits.high ? "High" : temp < zone.limits.low ? "Low" : "High";
    const frame = zs.alarm === "returned-unacked" ? "al-green" : "al-red";
    const blink = zs.alarm === "active-unacked" || zs.alarm === "returned-unacked";
    parts.push(el("rect", { x: r.x + 5, y: r.y + 5, width: r.w - 10, height: r.h - 10, class: blink ? `${frame} blink` : frame }));
    const [head, sub] = alarmLabel(zs.alarm, kind);
    const cls = zs.alarm === "returned-unacked" ? "ink" : "red";
    parts.push(text(x, r.y + r.h - 30, fitText(head, r.w - 32, 10.5, "sans"), `s b ${cls}`, { "font-size": 10.5 }));
    parts.push(text(x, r.y + r.h - 16, fitText(sub, r.w - 32, 10, "sans"), `s ${cls}`, { "font-size": 10 }));
  }
  return el("g", {}, parts.join(""));
}

function plantRoom(): string {
  const r = ROOMS.plant;
  const ax = r.x + 138;
  const ay = r.y + 30;
  const aw = 190;
  const ah = 58;
  const fanCx = ax + aw - 30;
  const fanCy = ay + ah / 2;
  const coil = Array.from({ length: 6 }, (_, i) => `${i === 0 ? "M" : "L"}${ax + 78 + (i % 2) * 10} ${ay + 6 + i * 9.2}`).join("");
  return el(
    "g",
    {},
    [
      el("rect", { x: r.x, y: r.y, width: r.w, height: r.h, class: "room" }),
      text(r.x + 16, r.y + 26, "Plant room", "s b ink", { "font-size": 13 }),
      text(r.x + 16, r.y + 40, "AHU-01", "m mut", { "font-size": 8.5 }),
      el("circle", { cx: r.x + 20, cy: r.y + 58, r: 4, class: "st-normal" }),
      text(r.x + 30, r.y + 62, "Running", "s ink", { "font-size": 11 }),
      text(r.x + 16, r.y + 80, "Serves all zones", "s mut", { "font-size": 10.5 }),
      el("rect", { x: ax, y: ay, width: aw, height: ah, class: "ahu" }),
      el("path", { d: `M${ax + 48} ${ay}V${ay + ah}M${ax + 108} ${ay}V${ay + ah}M${ax + 8} ${ay + ah - 6}L${ax + 40} ${ay + 6}`, class: "door" }),
      el("path", { d: coil, class: "door" }),
      el("circle", { cx: fanCx, cy: fanCy, r: 17, class: "door" }),
      el(
        "g",
        { class: "fan" },
        el("path", { d: `M${fanCx} ${fanCy - 13}L${fanCx + 11.3} ${fanCy + 6.5}L${fanCx - 11.3} ${fanCy + 6.5}Z`, class: "door" }),
      ),
      text(ax + 24, ay + ah + 13, "Filter", "s mut mid", { "font-size": 8.5 }),
      text(ax + 78, ay + ah + 13, "Coil", "s mut mid", { "font-size": 8.5 }),
      text(fanCx, ay + ah + 13, "Fan", "s mut mid", { "font-size": 8.5 }),
    ].join(""),
  );
}

function outdoorSensor(state: BmsState): string {
  const cx = 893;
  const north = 104;
  const bubble = 214;
  return [
    el("circle", { cx, cy: north, r: 16, class: "door" }),
    el("path", { d: `M${cx} ${north - 13}L${cx + 6} ${north + 9}L${cx} ${north + 4}L${cx - 6} ${north + 9}Z`, class: "dot" }),
    text(cx, north - 21, "N", "s b ink mid", { "font-size": 10 }),
    el("path", { d: `M${cx - 18} ${bubble}H850`, class: "dim" }),
    el("circle", { cx, cy: bubble, r: 18, class: "sym" }),
    el("path", { d: `M${cx - 18} ${bubble}H${cx + 18}`, class: "drop" }),
    text(cx, bubble - 4.5, "TT", "m ink mid", { "font-size": 9.5 }),
    text(cx, bubble + 12, "00", "m mut mid", { "font-size": 8 }),
    text(cx, bubble + 34, "Outdoor", "s mut mid", { "font-size": 9.5 }),
    text(cx, bubble + 52, celsius(state.outdoor.value), "s b ink mid", { "font-size": 13 }),
    text(cx, bubble + 66, state.outdoor.live ? `${SITE.city}, live` : "Last reading", "s mut mid", { "font-size": 9 }),
  ].join("");
}

function viewTitle(): string {
  return [
    text(BUILDING.x, 444, "Level 1 floor plan", "s b ink", { "font-size": 11.5 }),
    el("path", { d: `M${BUILDING.x} 448.5H${BUILDING.x + textWidth("Level 1 floor plan", 11.5, "sans")}`, class: "drop" }),
    text(BUILDING.x + textWidth("Level 1 floor plan", 11.5, "sans") + 10, 444, "Scale NTS", "s mut", { "font-size": 9.5 }),
  ].join("");
}

function titleStrip(state: BmsState): string {
  const local = bakuTime(state.at);
  const parts: string[] = [
    el("path", { d: `M${FRAME.x} ${STRIP_Y}H${FRAME.x + FRAME.w}`, class: "frame" }),
    el("path", {
      d: `M${CELL.b} ${STRIP_Y}V${FRAME.y + FRAME.h}M${CELL.c} ${STRIP_Y}V${FRAME.y + FRAME.h}M${CELL.d} ${STRIP_Y}V${FRAME.y + FRAME.h}`,
      class: "cellrule",
    }),
  ];

  const ax = CELL.a + 10;
  parts.push(text(ax, 470, "Building", "s mut", { "font-size": 8.5 }));
  parts.push(text(ax, 500, `${SITE.building}, level 1`, "s b ink", { "font-size": 24 }));
  parts.push(text(ax, 520, `Simulated office floor, ${SITE.city}`, "s ink", { "font-size": 11.5 }));
  parts.push(text(ax, 541, "Operated by anyone through GitHub issues", "s mut", { "font-size": 10.5 }));
  parts.push(text(ax, 561, "Weather data by Open-Meteo.com", "s mut", { "font-size": 9.5 }));

  const bx = CELL.b + 10;
  parts.push(text(bx, 470, "How to operate", "s mut", { "font-size": 8.5 }));
  NOTES.forEach((note, i) => {
    const y = 488 + i * 15;
    parts.push(text(bx, y, String(i + 1), "m mut", { "font-size": 9.5 }));
    parts.push(text(bx + 12, y, note, "s ink", { "font-size": 9.5 }));
  });

  parts.push(text(CELL.c + 10, 470, "Operator log, Baku time", "s mut", { "font-size": 8.5 }));
  parts.push(text(LOG_COL.time, 486, "Time", "s mut", { "font-size": 8.5 }));
  parts.push(text(LOG_COL.user, 486, "Operator", "s mut", { "font-size": 8.5 }));
  parts.push(text(LOG_COL.event, 486, "Event", "s mut", { "font-size": 8.5 }));
  parts.push(el("path", { d: `M${CELL.c + 6} 491H${CELL.d - 6}`, class: "hair" }));
  const recent = state.log.slice(-LOG_ROWS_Y.length).reverse();
  if (recent.length === 0) {
    parts.push(text(LOG_COL.time, LOG_ROWS_Y[0], "No commands yet. Be the first operator.", "s mut", { "font-size": 9.5 }));
  }
  recent.forEach((entry, i) => {
    const y = LOG_ROWS_Y[i];
    if (y === undefined) return;
    const red = entry.kind === "alarm" || entry.kind === "denied";
    parts.push(text(LOG_COL.time, y, bakuTime(entry.at).time, "s ink", { "font-size": 9.5 }));
    parts.push(
      text(LOG_COL.user, y, fitText(entry.user ?? "system", LOG_COL.event - LOG_COL.user - 6, 9.5, "sans"), entry.user === null ? "s mut" : "s ink", {
        "font-size": 9.5,
      }),
    );
    parts.push(text(LOG_COL.event, y, fitText(entry.text, LOG_COL.end - LOG_COL.event, 9.5, "sans"), red ? "s red" : "s ink", { "font-size": 9.5 }));
  });

  const alarms = activeAlarms(state);
  const rows: Array<readonly [string, string, string]> = [
    ["Dwg no", "SK-GH-002", "m ink end"],
    ["Date", local.date, "m ink end"],
    ["Scanned", `${local.time} Baku`, "s ink end"],
    ["Outdoor", celsius(state.outdoor.value), "s ink end"],
    ["Alarms", String(alarms), alarms > 0 ? "m red end" : "m ink end"],
    ["Checked", "GitHub Actions", "s ink end"],
  ];
  rows.forEach(([label, value, cls], i) => {
    const y = SHEET_ROWS_Y[i];
    if (y === undefined) return;
    parts.push(text(CELL.d + 10, y, label, "s mut", { "font-size": 8.5 }));
    parts.push(text(CELL.end - 10, y, value, cls, { "font-size": 9.5 }));
    if (i < rows.length - 1) parts.push(el("path", { d: `M${CELL.d + 6} ${y + 5}H${CELL.end - 6}`, class: "hair" }));
  });
  return parts.join("");
}

export interface PlanInput {
  readonly state: BmsState;
  readonly theme: Theme;
  readonly fonts: FontFaces;
}

export function renderPlan({ state, theme, fonts }: PlanInput): string {
  const body = [
    sheetFrame(),
    dimensions(),
    plantRoom(),
    ...ZONES.map((z) => room(z, state, theme)),
    walls(),
    outdoorSensor(state),
    viewTitle(),
    titleStrip(state),
  ].join("");

  const summary =
    `Floor plan of simulated building ${SITE.building} in ${SITE.city}. Outdoor ${celsius(state.outdoor.value)}. ` +
    ZONES.map((z) => `${z.name}: ${celsius(temperatureOf(state, z.id))}, setpoint ${celsius(state.zones[z.id].setpoint)}, lights ${state.zones[z.id].lights ? "on" : "off"}`).join("; ") +
    `. ${activeAlarms(state)} alarms.`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW.w} ${VIEW.h}" width="${VIEW.w}" height="${VIEW.h}" role="img" aria-labelledby="title desc">`,
    `<title id="title">${esc(`Building ${SITE.building}, level 1 floor plan`)}</title>`,
    `<desc id="desc">${esc(summary)}</desc>`,
    sheetStyle(theme, fonts),
    planStyle(theme),
    body,
    "</svg>",
    "",
  ].join("\n");
}
