import {
  CONTROLLERS,
  type ControllerConfig,
  FIELD_DEVICES,
  type FieldDeviceConfig,
  type ProductConfig,
  SHEET,
} from "../config.js";
import { describeChange, formatRelease } from "../describe.js";
import { cloudedRepos, latestRevision } from "../revisions.js";
import type { RepoScan, State, Status } from "../schema.js";
import { statusOf } from "../status.js";
import { cloudPath, deltaPath } from "./cloud.js";
import type { FontFaces } from "./fonts.js";
import { type Face, textWidth } from "./metrics.js";
import { el, esc, n, text } from "./svg.js";
import type { Theme } from "./theme.js";

export const VIEW = { w: 960, h: 600 } as const;

/* ---------- geometry: one sheet, three levels, a title strip ---------- */

export const FRAME = { x: 24, y: 24, w: 912, h: 552 } as const;
export const STRIP_Y = 456;
export const CELL = { a: 24, b: 304, c: 520, d: 800, end: 936 } as const;
const GUTTER_X = 40;
const RISER_X = 200;
const BUS_END = 920;

const LEVELS = [
  { title: "Management level", sub: "Products", labelY: 56, bus: 140, busLabel: "git, npm", floor: 168, elevation: "+2" },
  { title: "Automation level", sub: "Engineering practice", labelY: 200, bus: 280, busLabel: "BACnet/IP", floor: 312, elevation: "+1" },
  { title: "Field level", sub: "Domain background", labelY: 344, bus: 328, busLabel: "RS-485, KNX", floor: 456, elevation: "\u00B10" },
] as const;

const PRODUCT = { x0: 220, span: BUS_END - 220, gap: 15, y: 48, h: 68 } as const;
const CONTROLLER = { x0: 220, w: 160, gap: 20, y: 192, h: 56 } as const;
const BUBBLE = { cx0: 290, step: 140, cy: 372, r: 20, titleY: 410, detailY: 424 } as const;

const SIZE = {
  tag: 8.5,
  label: 12.5,
  value: 10,
  detail: 10.5,
  levelTitle: 12,
  levelSub: 10.5,
  bus: 8.5,
  bubbleLetters: 10,
  bubbleLoop: 8.5,
  fieldTitle: 11.5,
  fieldDetail: 10,
  cellLabel: 8.5,
  name: 24,
  role: 11.5,
  drawing: 10.5,
  site: 9.5,
  note: 9.5,
  table: 9.5,
  tableHead: 8.5,
  grid: 8.5,
  delta: 9,
} as const;

const NOTES = [
  "Values scanned daily from GitHub.",
  "Clouds mark the latest revision.",
  "Amber: no push in 90 days.",
  "Red: default-branch checks failing.",
] as const;

const REV_COL = { rev: 530, date: 556, desc: 628, descEnd: 792 } as const;
const REV_ROWS_Y = [503, 518, 533, 548, 563] as const;
const SHEET_ROWS_Y = [476, 493, 510, 527, 544, 561] as const;

/* ---------- small pure helpers ---------- */

/** Workstation width shrinks as products are added; fitProblems() guards the labels. */
export function productWidth(count: number): number {
  return (PRODUCT.span - PRODUCT.gap * (count - 1)) / Math.max(1, count);
}
function productX(i: number, w: number): number {
  return PRODUCT.x0 + i * (w + PRODUCT.gap);
}
function controllerX(i: number): number {
  return CONTROLLER.x0 + i * (CONTROLLER.w + CONTROLLER.gap);
}
function bubbleX(i: number): number {
  return BUBBLE.cx0 + i * BUBBLE.step;
}

/** Clip text to a pixel budget using the embedded font's own metrics. */
export function fitText(content: string, maxWidth: number, size: number, face: Face): string {
  if (textWidth(content, size, face) <= maxWidth) return content;
  let cut = content.length;
  while (cut > 0 && textWidth(`${content.slice(0, cut)}\u2026`, size, face) > maxWidth) cut -= 1;
  return `${content.slice(0, cut).trimEnd()}\u2026`;
}

function starPath(cx: number, cy: number, outer: number): string {
  const inner = outer * 0.46;
  let d = "";
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    d += `${i === 0 ? "M" : "L"}${n(cx + radius * Math.cos(angle))} ${n(cy + radius * Math.sin(angle))}`;
  }
  return `${d}Z`;
}

function statusClass(status: Status): string {
  return status === "normal" ? "st-normal" : status === "maintenance" ? "st-maint" : "st-fault";
}

/* ---------- fit report: every static label must fit its symbol ---------- */

export interface FitProblem {
  readonly what: string;
  readonly width: number;
  readonly max: number;
}

export function fitProblems(products: readonly ProductConfig[]): FitProblem[] {
  const checks: Array<{ what: string; content: string; size: number; face: Face; max: number }> = [];
  const w = productWidth(products.length);
  for (const p of products) {
    for (const line of p.label) {
      checks.push({ what: `product label "${line}"`, content: line, size: SIZE.label, face: "sans", max: w - 16 });
    }
    checks.push({ what: `product tag ${p.tag}`, content: p.tag, size: SIZE.tag, face: "mono", max: w - 32 });
    checks.push({ what: `product value "v00.00.00" + stars`, content: "v00.00.00 9999", size: SIZE.value, face: "sans", max: w - 30 });
  }
  for (const c of CONTROLLERS) {
    checks.push({ what: `controller "${c.title}"`, content: c.title, size: SIZE.label, face: "sans", max: CONTROLLER.w - 16 });
    checks.push({ what: `controller detail "${c.detail}"`, content: c.detail, size: SIZE.detail, face: "sans", max: CONTROLLER.w - 16 });
  }
  for (const f of FIELD_DEVICES) {
    checks.push({ what: `field "${f.title}"`, content: f.title, size: SIZE.fieldTitle, face: "sans", max: BUBBLE.step - 10 });
    checks.push({ what: `field detail "${f.detail}"`, content: f.detail, size: SIZE.fieldDetail, face: "sans", max: BUBBLE.step - 10 });
    checks.push({ what: `bubble "${f.letters}"`, content: f.letters, size: SIZE.bubbleLetters, face: "mono", max: BUBBLE.r * 2 - 10 });
  }
  for (const l of LEVELS) {
    checks.push({ what: `level "${l.title}"`, content: l.title, size: SIZE.levelTitle, face: "sans", max: RISER_X - GUTTER_X - 12 });
    checks.push({ what: `bus label "${l.busLabel}"`, content: l.busLabel, size: SIZE.bus, face: "sans", max: RISER_X - 8 - 120 });
  }
  const cellA = CELL.b - CELL.a - 20;
  checks.push({ what: "owner name", content: SHEET.owner, size: SIZE.name, face: "sans", max: cellA });
  checks.push({ what: "role", content: SHEET.role, size: SIZE.role, face: "sans", max: cellA });
  checks.push({ what: "drawing title", content: SHEET.drawingTitle, size: SIZE.drawing, face: "sans", max: cellA });
  checks.push({ what: "site", content: SHEET.site, size: SIZE.site, face: "sans", max: cellA });
  for (const note of NOTES) {
    checks.push({ what: `note "${note}"`, content: note, size: SIZE.note, face: "sans", max: CELL.c - 8 - (CELL.b + 22) });
  }
  return checks
    .map((c) => ({ what: c.what, width: textWidth(c.content, c.size, c.face), max: c.max }))
    .filter((c) => c.width > c.max);
}

/* ---------- drawing parts ---------- */

export function sheetStyle(theme: Theme, fonts: FontFaces): string {
  const t = theme;
  return `<style>
@font-face{font-family:"B612";font-weight:400;src:url(data:font/woff2;base64,${fonts.sans400}) format("woff2")}
@font-face{font-family:"B612";font-weight:700;src:url(data:font/woff2;base64,${fonts.sans700}) format("woff2")}
@font-face{font-family:"B612 Mono";font-weight:400;src:url(data:font/woff2;base64,${fonts.mono400}) format("woff2")}
.s{font-family:"B612","Segoe UI",system-ui,sans-serif}
.m{font-family:"B612 Mono",ui-monospace,Menlo,Consolas,monospace}
.b{font-weight:700}
.ink{fill:${t.ink}}.mut{fill:${t.muted}}.red{fill:${t.redline}}
.mid{text-anchor:middle}.end{text-anchor:end}
.paper{fill:${t.paper}}
.frame{fill:none;stroke:${t.line};stroke-width:1.5}
.trim{fill:none;stroke:${t.muted};stroke-width:.6}
.hair{stroke:${t.faint};stroke-width:.75}
.cellrule{stroke:${t.line};stroke-width:1}
.lvl{stroke:${t.muted};stroke-width:.75;stroke-dasharray:14 4 2 4}
.sym{fill:${t.box};stroke:${t.line};stroke-width:1.2}
.bus{fill:none;stroke:${t.line};stroke-width:1.6}
.drop{stroke:${t.line};stroke-width:1}
.dot{fill:${t.line}}
.mark{fill:none;stroke:${t.muted};stroke-width:1}
.star{fill:${t.muted}}
.st-normal{fill:${t.normal}}.st-maint{fill:${t.maintenance}}.st-fault{fill:${t.fault}}
.alarm-maint{stroke:${t.maintenance};stroke-width:2}.alarm-fault{stroke:${t.fault};stroke-width:2}
.cloud{fill:none;stroke:${t.redline};stroke-width:1.5;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:0;animation:draw 1.8s cubic-bezier(.45,0,.2,1) .5s both}
.delta{fill:${t.paper};stroke:${t.redline};stroke-width:1.4;stroke-linejoin:round}
.delta-g{animation:show .35s ease-out 2.2s both}
.pulse{fill:none;stroke:${t.normal};stroke-width:2.6;stroke-linecap:round;stroke-dasharray:7 93;animation:flow 3.4s linear infinite}
.blink{animation:blink 1s linear infinite}
@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes show{from{opacity:0}to{opacity:1}}
@keyframes flow{from{stroke-dashoffset:7}to{stroke-dashoffset:-100}}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:.15}}
@media (prefers-reduced-motion:reduce){.cloud,.delta-g,.blink{animation:none}.pulse{display:none}}
</style>`;
}

export function sheetFrame(): string {
  const parts: string[] = [
    el("rect", { x: 0, y: 0, width: VIEW.w, height: VIEW.h, class: "paper" }),
    el("rect", { x: 8.5, y: 8.5, width: VIEW.w - 17, height: VIEW.h - 17, class: "trim" }),
    el("rect", { x: FRAME.x, y: FRAME.y, width: FRAME.w, height: FRAME.h, class: "frame" }),
  ];
  const colW = FRAME.w / 6;
  for (let i = 0; i < 6; i += 1) {
    const cx = FRAME.x + colW * (i + 0.5);
    parts.push(text(cx, 19.5, String(i + 1), "m mut mid", { "font-size": SIZE.grid }));
    parts.push(text(cx, VIEW.h - 13, String(i + 1), "m mut mid", { "font-size": SIZE.grid }));
    if (i > 0) {
      const x = FRAME.x + colW * i;
      parts.push(el("path", { d: `M${n(x)} 8.5V${FRAME.y}M${n(x)} ${FRAME.y + FRAME.h}V${VIEW.h - 8.5}`, class: "trim" }));
    }
  }
  const rowH = FRAME.h / 4;
  for (let j = 0; j < 4; j += 1) {
    const cy = FRAME.y + rowH * (j + 0.5) + 3;
    const letter = String.fromCharCode(65 + j);
    parts.push(text(16.5, cy, letter, "m mut mid", { "font-size": SIZE.grid }));
    parts.push(text(VIEW.w - 16, cy, letter, "m mut mid", { "font-size": SIZE.grid }));
    if (j > 0) {
      const y = FRAME.y + rowH * j;
      parts.push(el("path", { d: `M8.5 ${n(y)}H${FRAME.x}M${FRAME.x + FRAME.w} ${n(y)}H${VIEW.w - 8.5}`, class: "trim" }));
    }
  }
  return parts.join("");
}

function levels(): string {
  const parts: string[] = [];
  for (const level of LEVELS) {
    if (level.floor !== STRIP_Y) {
      parts.push(el("path", { d: `M${FRAME.x} ${level.floor}H${FRAME.x + FRAME.w}`, class: "lvl" }));
    }
    const fy = level.floor;
    parts.push(el("path", { d: `M${GUTTER_X} ${fy - 9}H${GUTTER_X + 12}L${GUTTER_X + 6} ${fy}Z`, class: "mark" }));
    parts.push(text(GUTTER_X + 17, fy - 2.5, level.elevation, "m mut", { "font-size": SIZE.bus }));
    parts.push(text(GUTTER_X, level.labelY, level.title, "s b ink", { "font-size": SIZE.levelTitle }));
    parts.push(text(GUTTER_X, level.labelY + 16, level.sub, "s mut", { "font-size": SIZE.levelSub }));
    parts.push(el("path", { d: `M${RISER_X} ${level.bus}H${BUS_END}`, class: "bus" }));
    parts.push(el("circle", { cx: RISER_X, cy: level.bus, r: 3.2, class: "dot" }));
    parts.push(text(RISER_X - 8, level.bus + 3, level.busLabel, "s mut end", { "font-size": SIZE.bus }));
  }
  const top = LEVELS[0].bus;
  const bottom = LEVELS[2].bus;
  parts.push(el("path", { d: `M${RISER_X} ${bottom}V${top}`, class: "bus" }));
  parts.push(el("path", { d: `M${RISER_X} ${bottom}V${top}`, class: "pulse", pathLength: 100 }));
  return parts.join("");
}

function product(config: ProductConfig, scan: RepoScan, status: Status, i: number, w: number): string {
  const x = productX(i, w);
  const y = PRODUCT.y;
  const cx = x + w / 2;
  const parts: string[] = [
    el("path", { d: `M${n(cx)} ${y + PRODUCT.h}V${LEVELS[0].bus}`, class: "drop" }),
    el("circle", { cx, cy: LEVELS[0].bus, r: 2, class: "dot" }),
    el("rect", {
      x,
      y,
      width: w,
      height: PRODUCT.h,
      class: status === "normal" ? "sym" : `sym alarm-${status === "fault" ? "fault" : "maint"}`,
    }),
    text(x + 8, y + 15, config.tag, "m mut", { "font-size": SIZE.tag }),
    el("circle", {
      cx: x + w - 12,
      cy: y + 11.5,
      r: 4.5,
      class: status === "normal" ? statusClass(status) : `${statusClass(status)} blink`,
    }),
  ];
  const [first, second] = config.label;
  if (second === undefined) {
    parts.push(text(x + 8, y + 38, first, "s b ink", { "font-size": SIZE.label }));
  } else {
    parts.push(text(x + 8, y + 32, first, "s b ink", { "font-size": SIZE.label }));
    parts.push(text(x + 8, y + 46, second, "s b ink", { "font-size": SIZE.label }));
  }

  const right = x + w - 8;
  const stars = String(scan.stars);
  const showStars = scan.stars > 0;
  const starsW = showStars ? textWidth(stars, SIZE.value, "sans") : 0;
  const iconX = right - starsW - 6.5;
  const releaseMax = (showStars ? iconX - 8 : right) - (x + 8);
  const release = fitText(formatRelease(scan.release), releaseMax, SIZE.value, "sans");
  const baseline = y + PRODUCT.h - 9;
  parts.push(text(x + 8, baseline, release, scan.release === null ? "s mut" : "s ink", { "font-size": SIZE.value }));
  if (showStars) {
    parts.push(el("path", { d: starPath(iconX, baseline - 3.6, 4.6), class: "star" }));
    parts.push(text(right, baseline, stars, "s ink end", { "font-size": SIZE.value }));
  }
  return el("g", {}, parts.join(""));
}

function controller(config: ControllerConfig, i: number): string {
  const x = controllerX(i);
  const y = CONTROLLER.y;
  const cx = x + CONTROLLER.w / 2;
  const terminals = Array.from({ length: 6 }, (_, k) => {
    const tx = x + CONTROLLER.w - 14 - k * 6;
    return `M${n(tx)} ${y + CONTROLLER.h}v4`;
  }).join("");
  return el(
    "g",
    {},
    [
      el("path", { d: `M${n(cx)} ${y + CONTROLLER.h}V${LEVELS[1].bus}`, class: "drop" }),
      el("circle", { cx, cy: LEVELS[1].bus, r: 2, class: "dot" }),
      el("rect", { x, y, width: CONTROLLER.w, height: CONTROLLER.h, class: "sym" }),
      el("path", { d: terminals, class: "drop" }),
      text(x + 8, y + 15, config.tag, "m mut", { "font-size": SIZE.tag }),
      text(x + 8, y + 33, config.title, "s b ink", { "font-size": SIZE.label }),
      text(x + 8, y + 48, config.detail, "s mut", { "font-size": SIZE.detail }),
    ].join(""),
  );
}

function fieldDevice(config: FieldDeviceConfig, i: number): string {
  const cx = bubbleX(i);
  const { cy, r } = BUBBLE;
  return el(
    "g",
    {},
    [
      el("path", { d: `M${cx} ${LEVELS[2].bus}V${cy - r}`, class: "drop" }),
      el("circle", { cx, cy: LEVELS[2].bus, r: 2, class: "dot" }),
      el("circle", { cx, cy, r, class: "sym" }),
      el("path", { d: `M${cx - r} ${cy}H${cx + r}`, class: "drop" }),
      text(cx, cy - 5, config.letters, "m ink mid", { "font-size": SIZE.bubbleLetters }),
      text(cx, cy + 12.5, config.loop, "m mut mid", { "font-size": SIZE.bubbleLoop }),
      text(cx, BUBBLE.titleY, config.title, "s b ink mid", { "font-size": SIZE.fieldTitle }),
      text(cx, BUBBLE.detailY, config.detail, "s mut mid", { "font-size": SIZE.fieldDetail }),
    ].join(""),
  );
}

/** First change of a revision plus a count of the rest, clipped to the column. */
export function revisionLine(changes: State["revisions"][number]["changes"]): string {
  const [first, ...rest] = changes;
  const tail = rest.length > 0 ? ` +${rest.length}` : "";
  const room = REV_COL.descEnd - REV_COL.desc - textWidth(tail, SIZE.table, "sans");
  const head = first === undefined ? "" : fitText(describeChange(first), room, SIZE.table, "sans");
  return head + tail;
}

function titleStrip(state: State, statuses: readonly Status[]): string {
  const latest = latestRevision(state);
  const parts: string[] = [
    el("path", { d: `M${FRAME.x} ${STRIP_Y}H${FRAME.x + FRAME.w}`, class: "frame" }),
    el("path", { d: `M${CELL.b} ${STRIP_Y}V${FRAME.y + FRAME.h}M${CELL.c} ${STRIP_Y}V${FRAME.y + FRAME.h}M${CELL.d} ${STRIP_Y}V${FRAME.y + FRAME.h}`, class: "cellrule" }),
  ];

  // A: owner
  const ax = CELL.a + 10;
  parts.push(text(ax, 470, "Owner", "s mut", { "font-size": SIZE.cellLabel }));
  parts.push(text(ax, 500, SHEET.owner, "s b ink", { "font-size": SIZE.name }));
  parts.push(text(ax, 520, SHEET.role, "s ink", { "font-size": SIZE.role }));
  parts.push(text(ax, 541, SHEET.drawingTitle, "s mut", { "font-size": SIZE.drawing }));
  parts.push(text(ax, 561, SHEET.site, "s mut", { "font-size": SIZE.site }));

  // B: notes
  const bx = CELL.b + 10;
  parts.push(text(bx, 470, "Notes", "s mut", { "font-size": SIZE.cellLabel }));
  NOTES.forEach((note, i) => {
    const y = 488 + i * 15;
    parts.push(text(bx, y, String(i + 1), "m mut", { "font-size": SIZE.note }));
    parts.push(text(bx + 12, y, note, "s ink", { "font-size": SIZE.note }));
  });

  // C: revisions, newest first
  parts.push(text(CELL.c + 10, 470, "Revisions", "s mut", { "font-size": SIZE.cellLabel }));
  parts.push(text(REV_COL.rev, 486, "Rev", "m mut", { "font-size": SIZE.tableHead }));
  parts.push(text(REV_COL.date, 486, "Date", "m mut", { "font-size": SIZE.tableHead }));
  parts.push(text(REV_COL.desc, 486, "Description", "s mut", { "font-size": SIZE.tableHead }));
  parts.push(el("path", { d: `M${CELL.c + 6} 491H${CELL.d - 6}`, class: "hair" }));
  const recent = state.revisions.slice(-SHEET.revisionRows).reverse();
  recent.forEach((revision, i) => {
    const y = REV_ROWS_Y[i];
    if (y === undefined) return;
    const cls = revision.rev === latest.rev ? "m red" : "m ink";
    parts.push(text(REV_COL.rev, y, String(revision.rev), cls, { "font-size": SIZE.table }));
    parts.push(text(REV_COL.date, y, revision.date, "m ink", { "font-size": SIZE.table }));
    parts.push(text(REV_COL.desc, y, revisionLine(revision.changes), "s ink", { "font-size": SIZE.table }));
  });

  // D: sheet data
  const alarms = statuses.filter((s) => s !== "normal").length;
  const rows: Array<readonly [string, string, string]> = [
    ["Dwg no", SHEET.drawingNumber, "m ink end"],
    ["Rev", String(latest.rev), "m red end"],
    ["Date", latest.date, "m ink end"],
    ["Scale", "NTS", "m ink end"],
    ["Checked", "GitHub Actions", "s ink end"],
    ["Alarms", String(alarms), alarms > 0 ? "m red end" : "m ink end"],
  ];
  rows.forEach(([label, value, cls], i) => {
    const y = SHEET_ROWS_Y[i];
    if (y === undefined) return;
    parts.push(text(CELL.d + 10, y, label, "s mut", { "font-size": SIZE.cellLabel }));
    parts.push(text(CELL.end - 10, y, value, cls, { "font-size": SIZE.table }));
    if (i < rows.length - 1) parts.push(el("path", { d: `M${CELL.d + 6} ${y + 5}H${CELL.end - 6}`, class: "hair" }));
  });
  return parts.join("");
}

function redline(x: number, y: number, w: number, h: number, rev: number, order: number): string {
  const delay = `${n(0.5 + order * 0.3)}s`;
  const deltaDelay = `${n(2.2 + order * 0.3)}s`;
  return [
    el("path", { d: cloudPath(x, y, w, h), class: "cloud", pathLength: 1, style: `animation-delay:${delay}` }),
    el(
      "g",
      { class: "delta-g", style: `animation-delay:${deltaDelay}` },
      el("path", { d: deltaPath(x + w - 3, y + 2), class: "delta" }) +
        text(x + w - 3, y + 6, String(rev), "s b red mid", { "font-size": SIZE.delta }),
    ),
  ].join("");
}

/* ---------- the sheet ---------- */

export interface SheetInput {
  readonly state: State;
  readonly products: readonly ProductConfig[];
  readonly theme: Theme;
  readonly fonts: FontFaces;
}

export function renderSheet({ state, products, theme, fonts }: SheetInput): string {
  const byRepo = new Map(state.scan.repos.map((r) => [r.repo, r] as const));
  const scans = products.map((p) => {
    const scan = byRepo.get(p.repo);
    if (scan === undefined) throw new Error(`No scan data for configured product ${p.repo}`);
    return scan;
  });
  const statuses = scans.map((s) => statusOf(s, state.scan.scannedAt));
  const latest = latestRevision(state);
  const clouded = cloudedRepos(state);

  const w = productWidth(products.length);
  const body: string[] = [sheetFrame(), levels()];
  products.forEach((p, i) => {
    const scan = scans[i];
    const status = statuses[i];
    if (scan !== undefined && status !== undefined) body.push(product(p, scan, status, i, w));
  });
  CONTROLLERS.forEach((c, i) => body.push(controller(c, i)));
  FIELD_DEVICES.forEach((f, i) => body.push(fieldDevice(f, i)));
  body.push(titleStrip(state, statuses));

  // Neighbouring changes share one cloud, the way a checker rings a whole area.
  const runs: Array<{ from: number; to: number }> = [];
  products.forEach((p, i) => {
    if (!clouded.has(p.repo)) return;
    const last = runs.at(-1);
    if (last !== undefined && last.to === i - 1) last.to = i;
    else runs.push({ from: i, to: i });
  });
  let order = 0;
  for (const run of runs) {
    const x0 = productX(run.from, w) - 7;
    const x1 = productX(run.to, w) + w + 7;
    body.push(redline(x0, PRODUCT.y - 7, x1 - x0, PRODUCT.h + 14, latest.rev, order));
    order += 1;
  }
  // The first issue carries no cloud: clouds only ever mark a change against a previous issue.

  const alarmCount = statuses.filter((s) => s !== "normal").length;
  const summary =
    `As-built system riser drawing of ${SHEET.owner}'s work. Management level: ${products.map((p) => p.repo).join(", ")}. ` +
    `Automation level: ${CONTROLLERS.map((c) => c.title.toLowerCase()).join(", ")}. ` +
    `Field level: ${FIELD_DEVICES.map((f) => f.title).join(", ")}. ` +
    `Revision ${latest.rev} of ${latest.date}; ${alarmCount} active alarms.`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW.w} ${VIEW.h}" width="${VIEW.w}" height="${VIEW.h}" role="img" aria-labelledby="title desc">`,
    `<title id="title">${esc(`${SHEET.owner}: ${SHEET.drawingTitle}`)}</title>`,
    `<desc id="desc">${esc(summary)}</desc>`,
    sheetStyle(theme, fonts),
    body.join(""),
    "</svg>",
    "",
  ].join("\n");
}
