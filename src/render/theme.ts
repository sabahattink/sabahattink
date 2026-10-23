export interface Theme {
  readonly name: "light" | "dark";
  /** Sheet paper. Slightly off the GitHub page colour so the sheet reads as an object. */
  readonly paper: string;
  /** Symbol fill, a cut-out against the paper. */
  readonly box: string;
  /** Linework: frames, symbols, buses. Diazo blue-violet on paper, CAD grey in model space. */
  readonly line: string;
  readonly ink: string;
  readonly muted: string;
  readonly faint: string;
  /** The single loud colour: revision clouds and delta markers. */
  readonly redline: string;
  readonly normal: string;
  readonly maintenance: string;
  readonly fault: string;
  /** Floor plan: cool and warm room tints, lit lamp symbols. */
  readonly cool: string;
  readonly warm: string;
  readonly lamp: string;
}

export const LIGHT: Theme = {
  name: "light",
  paper: "#F6F8FA",
  box: "#FFFFFF",
  line: "#33427A",
  ink: "#1F2328",
  muted: "#5A6472",
  faint: "#C9D1DC",
  redline: "#D4202C",
  normal: "#1A7F37",
  maintenance: "#B06A00",
  fault: "#D4202C",
  cool: "#2F6FDB",
  warm: "#E8590C",
  lamp: "#E9A800",
};

export const DARK: Theme = {
  name: "dark",
  paper: "#151B23",
  box: "#0D1117",
  line: "#8E9DBA",
  ink: "#E6EDF3",
  muted: "#8B96A8",
  faint: "#2A3341",
  redline: "#FF6464",
  normal: "#3FB950",
  maintenance: "#D29922",
  fault: "#FF6464",
  cool: "#5B9BFF",
  warm: "#FF8A3D",
  lamp: "#FFD34D",
};

export const THEMES: readonly Theme[] = [LIGHT, DARK];
