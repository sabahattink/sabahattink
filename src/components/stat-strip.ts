import { h, type SatoriNode } from "../satori-h.js";
import { colors, spacing, typeScale, type Mode, type ColorTokens } from "../tokens.js";
import type { GithubStats } from "../github-data.js";

function Stat(c: ColorTokens, label: string, value: number): SatoriNode {
  return h(
    "div",
    { style: { display: "flex", alignItems: "baseline", gap: "8px" } },
    h(
      "span",
      { style: { ...typeScale.statValue, fontFamily: "Inter", color: c.neutralHigh } },
      String(value)
    ),
    h(
      "span",
      { style: { ...typeScale.meta, fontFamily: "JetBrains Mono", color: c.neutralMid } },
      label
    )
  );
}

// Mirrors Hero's hairline-rule language (top/bottom hairline framing a content row) —
// StatStrip must share Hero's visual framing, not just sit as a bare row underneath it.
export function StatStrip(mode: Mode, stats: GithubStats): SatoriNode {
  const c = colors[mode];
  const { heroWidth: width, marginX, statStripHeight: height } = spacing;

  return h(
    "div",
    {
      style: {
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        backgroundColor: c.bg,
      },
    },
    h("div", { style: { display: "flex", margin: `0 ${marginX}px`, height: "1px", backgroundColor: c.hairline } }),
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "40px",
          padding: `12px ${marginX}px`,
        },
      },
      Stat(c, "FOLLOWERS", stats.followers),
      Stat(c, "PUBLIC REPOS", stats.publicRepos),
      Stat(c, "STARS", stats.totalStars)
    ),
    h("div", { style: { display: "flex", margin: `0 ${marginX}px`, height: "1px", backgroundColor: c.hairline } })
  );
}
