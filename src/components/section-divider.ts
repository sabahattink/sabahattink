import { h, type SatoriNode } from "../satori-h.js";
import { colors, spacing, typeScale, type Mode } from "../tokens.js";

export function SectionDivider(mode: Mode, label: string): SatoriNode {
  const c = colors[mode];
  const { heroWidth: width, marginX } = spacing;

  return h(
    "div",
    {
      style: {
        width: `${width}px`,
        height: "48px",
        display: "flex",
        alignItems: "center",
        backgroundColor: c.bg,
        padding: `0 ${marginX}px`,
      },
    },
    h("div", { style: { display: "flex", flex: 1, height: "1px", backgroundColor: c.hairline } }),
    h(
      "span",
      { style: { ...typeScale.meta, fontFamily: "JetBrains Mono", color: c.neutralMid, margin: "0 16px" } },
      label
    ),
    h("div", { style: { display: "flex", flex: 1, height: "1px", backgroundColor: c.hairline } })
  );
}
