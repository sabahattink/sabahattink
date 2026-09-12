import { h, type SatoriNode } from "../satori-h.js";
import { colors, spacing, typeScale, type Mode } from "../tokens.js";

export function SectionDivider(mode: Mode, label: string): SatoriNode {
  const c = colors[mode];
  const { heroWidth: width, dividerHeight: height, marginX } = spacing;

  return h(
    "div",
    {
      style: {
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        alignItems: "center",
        backgroundColor: c.bg,
        padding: `0 ${marginX}px`,
      },
    },
    h("div", { style: { display: "flex", flex: 1, height: "1px", backgroundColor: c.hairline } }),
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          margin: "0 16px",
          padding: "6px 14px",
          borderRadius: "14px",
          backgroundColor: c.accentSoft,
        },
      },
      h("span", { style: { ...typeScale.pillLabel, fontFamily: "Space Mono", color: c.accent } }, label)
    ),
    h("div", { style: { display: "flex", flex: 1, height: "1px", backgroundColor: c.hairline } })
  );
}
