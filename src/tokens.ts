export type Mode = "dark" | "light";

export interface ColorTokens {
  readonly bg: string;
  readonly surface: string;
  readonly neutralMid: string;
  readonly neutralHigh: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly success: string;
  readonly warning: string;
  readonly hairline: string;
}

export const colors: Record<Mode, ColorTokens> = {
  dark: {
    bg: "#1c1a1d",
    surface: "#242226",
    neutralMid: "#9a969f",
    neutralHigh: "#f5f3ee",
    accent: "#9089db",
    accentSoft: "#2b2740",
    success: "#6fbf86",
    warning: "#e0a052",
    hairline: "#332f34",
  },
  light: {
    bg: "#f0efec",
    surface: "#fcfbf8",
    neutralMid: "#68676f",
    neutralHigh: "#27272c",
    accent: "#5145c6",
    accentSoft: "#eae6f8",
    success: "#3a7048",
    warning: "#8a5a12",
    hairline: "#e1dfda",
  },
} as const;

export const spacing = {
  marginX: 64,
  heroWidth: 1200,
  heroHeight: 328,
  statStripHeight: 150,
  dividerHeight: 48,
  cardInset: 14,
  cardRadius: 22,
  cardPaddingX: 50,
  cardPaddingY: 24,
  panelRadius: 14,
  panelPadding: 18,
  tileGap: 20,
  tileRadius: 16,
  tilePadding: 16,
} as const;

export const typeScale = {
  eyebrow: { fontSize: "10px", fontWeight: 400 as const, letterSpacing: "1.5px" },
  kicker: { fontSize: "11px", fontWeight: 400 as const, letterSpacing: "1.1px" },
  display: { fontSize: "52px", fontWeight: 600 as const, letterSpacing: "-1.6px" },
  body: { fontSize: "15px", fontWeight: 400 as const },
  specLabel: { fontSize: "9px", fontWeight: 400 as const, letterSpacing: "0.7px" },
  specValue: { fontSize: "12px", fontWeight: 400 as const },
  tileTag: { fontSize: "9px", fontWeight: 400 as const, letterSpacing: "0.9px" },
  tileValue: { fontSize: "22px", fontWeight: 600 as const, letterSpacing: "-0.4px" },
  tileCaption: { fontSize: "12px", fontWeight: 400 as const },
  pillLabel: { fontSize: "10px", fontWeight: 400 as const, letterSpacing: "1.2px" },
} as const;
