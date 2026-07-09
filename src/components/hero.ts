import { h, type SatoriNode } from "../satori-h.js";
import { colors, spacing, typeScale, type Mode, type ColorTokens } from "../tokens.js";

export interface HeroData {
  name: string;
  kicker: string;
  missionLine: string;
  focus: string;
  stack: string;
  based: string;
  revDate: string;
}

function SpecField(c: ColorTokens, label: string, value: string): SatoriNode {
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column" } },
    h(
      "span",
      { style: { ...typeScale.label, fontFamily: "JetBrains Mono", color: c.neutralMid } },
      label
    ),
    h(
      "span",
      { style: { ...typeScale.value, fontFamily: "Inter", color: c.neutralHigh, marginTop: "4px" } },
      value
    )
  );
}

export function Hero(mode: Mode, data: HeroData): SatoriNode {
  const c = colors[mode];
  const { heroWidth: width, heroHeight: height, marginX } = spacing;

  return h(
    "div",
    {
      style: {
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        flexDirection: "column",
        backgroundColor: c.bg,
      },
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          padding: `28px ${marginX}px 0 ${marginX}px`,
          fontFamily: "JetBrains Mono",
          color: c.neutralMid,
          ...typeScale.meta,
        },
      },
      h("span", {}, "ENGINEERING PROFILE"),
      h("span", {}, `REV ${data.revDate}`)
    ),
    h("div", {
      style: {
        display: "flex",
        margin: `14px ${marginX}px 0 ${marginX}px`,
        height: "1px",
        backgroundColor: c.hairline,
      },
    }),
    // Two-column row: Satori/Yoga does not shrink fixed-width flex children to fit
    // their container, so these widths must sum exactly to the available content
    // box or the right column silently overflows past the right margin.
    // 716 (left) + 1 (divider) + 17 + 18 (asymmetric divider margins) + 320 (right)
    // = 1072 = spacing.heroWidth - 2*spacing.marginX (1200 - 128).
    // If marginX, heroWidth, or either column width changes, rebalance these four
    // numbers so the sum still equals heroWidth - 2*marginX.
    h(
      "div",
      { style: { display: "flex", flex: 1, padding: `32px ${marginX}px 0 ${marginX}px` } },
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", width: "716px" } },
        h(
          "span",
          { style: { ...typeScale.kicker, fontFamily: "Inter", color: c.accent } },
          data.kicker
        ),
        h(
          "span",
          { style: { ...typeScale.display, fontFamily: "Inter", color: c.neutralHigh, marginTop: "8px" } },
          data.name
        ),
        h(
          "span",
          { style: { ...typeScale.body, fontFamily: "Inter", color: c.neutralMid, marginTop: "14px" } },
          data.missionLine
        )
      ),
      h("div", {
        style: {
          display: "flex",
          width: "1px",
          backgroundColor: c.hairline,
          marginLeft: "17px",
          marginRight: "18px",
        },
      }),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", width: "320px", gap: "18px" } },
        SpecField(c, "FOCUS", data.focus),
        SpecField(c, "STACK", data.stack),
        SpecField(c, "BASED", data.based)
      )
    ),
    h("div", {
      style: {
        display: "flex",
        marginTop: "auto",
        marginLeft: `${marginX}px`,
        marginRight: `${marginX}px`,
        marginBottom: "24px",
        height: "1px",
        backgroundColor: c.hairline,
      },
    })
  );
}
