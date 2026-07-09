export type Mode = "dark" | "light";

export interface ColorTokens {
  readonly bg: string;
  readonly surface: string;
  readonly neutralMid: string;
  readonly neutralHigh: string;
  readonly accent: string;
  readonly success: string;
  readonly warning: string;
  readonly hairline: string;
}

export const colors: Record<Mode, ColorTokens> = {
  dark: {
    bg: "#0a0a0a",
    surface: "#171717",
    neutralMid: "#a1a1a1",
    neutralHigh: "#f2f2f2",
    accent: "#7c6cf6",
    success: "#4ade80",
    warning: "#f5a524",
    hairline: "#242424",
  },
  light: {
    bg: "#ffffff",
    surface: "#f5f5f5",
    neutralMid: "#525252",
    neutralHigh: "#0a0a0a",
    accent: "#6d28d9",
    success: "#15803d",
    warning: "#b45309",
    hairline: "#e5e5e5",
  },
} as const;

export const spacing = {
  marginX: 64,
  heroWidth: 1200,
  heroHeight: 300,
  statStripHeight: 60,
} as const;

export const typeScale = {
  kicker: { fontSize: "12px", fontWeight: 600 as const, letterSpacing: "3px" },
  display: { fontSize: "60px", fontWeight: 600 as const, letterSpacing: "-1.5px" },
  body: { fontSize: "15px", fontWeight: 400 as const },
  label: { fontSize: "10px", fontWeight: 400 as const, letterSpacing: "2px" },
  value: { fontSize: "14px", fontWeight: 400 as const },
  meta: { fontSize: "11px", fontWeight: 400 as const, letterSpacing: "2px" },
  statValue: { fontSize: "16px", fontWeight: 600 as const },
} as const;
