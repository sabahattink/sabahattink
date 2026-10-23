/**
 * Everything drawn on the sheet that is not scanned lives here.
 * Products are scanned from GitHub; controllers and field devices are static.
 */

export const OWNER = "sabahattink";

export interface ProductConfig {
  /** Repository name on GitHub, exactly as it appears in the URL. */
  readonly repo: string;
  /** Device tag printed on the symbol. */
  readonly tag: string;
  /** One or two lines drawn inside the workstation symbol. */
  readonly label: readonly [string] | readonly [string, string];
  /** Short name used in the revision table, where width is scarce. */
  readonly short: string;
  /** What kind of artifact it is, for the README table. */
  readonly kind: string;
  /** One sentence for the README table. */
  readonly summary: string;
}

export const PRODUCTS: readonly ProductConfig[] = [
  {
    repo: "Recall",
    tag: "WS-01",
    label: ["Recall"],
    short: "Recall",
    kind: "CLI",
    summary: "Persistent, evidence-backed repository context for coding agents.",
  },
  {
    repo: "codediag",
    tag: "WS-02",
    label: ["codediag"],
    short: "codediag",
    kind: "CLI, GitHub Action",
    summary: "Architecture, security and reliability findings for Node.js APIs, with SARIF output.",
  },
  {
    repo: "antigravity-fullstack-hq",
    tag: "WS-03",
    label: ["antigravity-", "fullstack-hq"],
    short: "antigravity-hq",
    kind: "Agent rules",
    summary: "Permission-first rules, agents and skills from one source for Claude Code, Codex and Antigravity.",
  },
  {
    repo: "reasonkit",
    tag: "WS-04",
    label: ["reasonkit"],
    short: "reasonkit",
    kind: "Toolkit",
    summary: "Building blocks for structured reasoning and agent orchestration.",
  },
  {
    repo: "sealed",
    tag: "WS-05",
    label: ["sealed"],
    short: "sealed",
    kind: "Library",
    summary: "WebMCP privacy boundary: agents receive decisions, not raw private values.",
  },
];

export interface ControllerConfig {
  readonly tag: string;
  readonly title: string;
  readonly detail: string;
}

export const CONTROLLERS: readonly ControllerConfig[] = [
  { tag: "DDC-01", title: "Deterministic", detail: "Same input, same bytes" },
  { tag: "DDC-02", title: "Testable", detail: "Every rule has a check" },
  { tag: "DDC-03", title: "Observable", detail: "Logs, SARIF, exit codes" },
  { tag: "DDC-04", title: "Failure-aware", detail: "Fails loud, leaves a trace" },
];

export interface FieldDeviceConfig {
  /** ISA-style function letters in the instrument bubble. */
  readonly letters: string;
  readonly loop: string;
  readonly title: string;
  readonly detail: string;
}

export const FIELD_DEVICES: readonly FieldDeviceConfig[] = [
  { letters: "BAC", loop: "01", title: "BACnet", detail: "MS/TP and IP" },
  { letters: "KNX", loop: "02", title: "KNX", detail: "TP and IP" },
  { letters: "MB", loop: "03", title: "Modbus", detail: "RTU and TCP" },
  { letters: "FA", loop: "04", title: "Fire & life-safety", detail: "Detection, suppression" },
  { letters: "NET", loop: "05", title: "Servers & networks", detail: "Racks, VLANs, uplinks" },
];

export const THRESHOLDS = {
  /** A product with no push for longer than this is flagged "maintenance due". */
  staleDays: 90,
} as const;

export const SHEET = {
  drawingNumber: "SK-GH-001",
  owner: "Sabahattin Kalkan",
  role: "Systems engineer & software architect, Baku",
  drawingTitle: "System riser, as built",
  site: "sabahattinkalkan.com",
  /** Revisions kept in data/state.json. The revision number keeps counting. */
  keepRevisions: 20,
  /** Rows shown in the title block revision table. */
  revisionRows: 5,
} as const;
