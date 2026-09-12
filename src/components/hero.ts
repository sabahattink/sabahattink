import { h, type SatoriNode } from "../satori-h.js";
import { colors, spacing, typeScale, type Mode, type ColorTokens } from "../tokens.js";

export interface HeroData {
  name: string;
  kicker: string;
  missionLine: string;
  focus: string;
  domains: string;
  based: string;
}

function SpecField(c: ColorTokens, label: string, value: string): SatoriNode {
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column" } },
    h(
      "span",
      { style: { ...typeScale.specLabel, fontFamily: "Space Mono", color: c.neutralMid } },
      label
    ),
    h(
      "span",
      {
        style: {
          ...typeScale.specValue,
          fontFamily: "Space Grotesk",
          color: c.neutralHigh,
          marginTop: "6px",
          lineHeight: 1.35,
        },
      },
      value
    )
  );
}

export function Hero(mode: Mode, data: HeroData): SatoriNode {
  const c = colors[mode];
  const {
    heroWidth: width,
    heroHeight: height,
    cardInset,
    cardRadius,
    cardPaddingX,
    cardPaddingY,
    panelRadius,
    panelPadding,
  } = spacing;
  const cardWidth = width - cardInset * 2;
  const cardHeight = height - cardInset * 2;

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
          flexDirection: "column",
          width: `${cardWidth}px`,
          height: `${cardHeight}px`,
          margin: `${cardInset}px`,
          padding: `${cardPaddingY}px ${cardPaddingX}px`,
          backgroundColor: c.surface,
          border: `1px solid ${c.hairline}`,
          borderRadius: `${cardRadius}px`,
          boxShadow: mode === "dark" ? "0 2px 6px rgba(0,0,0,0.35)" : "0 2px 3px rgba(0,0,0,0.06)",
        },
      },
      // Eyebrow row — replaces the old "ENGINEERING PROFILE / REV {date}" meta
      // bar. Both sides are now stable positioning text, nothing generated
      // per-render.
      h(
        "div",
        { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "8px" } },
          h("div", {
            style: {
              display: "flex",
              width: "6px",
              height: "6px",
              borderRadius: "3px",
              backgroundColor: c.accent,
            },
          }),
          h(
            "span",
            { style: { ...typeScale.eyebrow, fontFamily: "Space Mono", color: c.neutralMid } },
            "ENGINEERING PROFILE"
          )
        ),
        h(
          "span",
          { style: { ...typeScale.eyebrow, fontFamily: "Space Mono", color: c.neutralMid } },
          "SYSTEMS · SOFTWARE · BUILDINGS"
        )
      ),
      h("div", { style: { display: "flex", marginTop: "14px", height: "1px", backgroundColor: c.hairline } }),
      // Two-column body
      h(
        "div",
        { style: { display: "flex", flex: 1, marginTop: "24px", gap: "40px" } },
        h(
          "div",
          { style: { display: "flex", flexDirection: "column", width: "652px" } },
          h(
            "span",
            { style: { ...typeScale.kicker, fontFamily: "Space Mono", color: c.accent } },
            data.kicker
          ),
          h(
            "span",
            { style: { ...typeScale.display, fontFamily: "Space Grotesk", color: c.neutralHigh, marginTop: "10px" } },
            data.name
          ),
          h(
            "span",
            {
              style: {
                ...typeScale.body,
                fontFamily: "Space Grotesk",
                color: c.neutralMid,
                marginTop: "14px",
                lineHeight: 1.5,
              },
            },
            data.missionLine
          )
        ),
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              width: "380px",
              gap: "14px",
              backgroundColor: c.accentSoft,
              borderRadius: `${panelRadius}px`,
              padding: `${panelPadding}px`,
            },
          },
          SpecField(c, "FOCUS", data.focus),
          SpecField(c, "DOMAINS", data.domains),
          SpecField(c, "BASED", data.based)
        )
      )
    )
  );
}
