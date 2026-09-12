import { h, type SatoriNode } from "../satori-h.js";
import { colors, spacing, typeScale, type Mode, type ColorTokens } from "../tokens.js";

export interface StatTileData {
  tag: string;
  value: string;
  caption: string;
}

function Tile(c: ColorTokens, tileWidth: number, data: StatTileData): SatoriNode {
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: `${tileWidth}px`,
        backgroundColor: c.surface,
        border: `1px solid ${c.hairline}`,
        borderRadius: `${spacing.tileRadius}px`,
        padding: `${spacing.tilePadding}px`,
      },
    },
    h("span", { style: { ...typeScale.tileTag, fontFamily: "Space Mono", color: c.neutralMid } }, data.tag),
    h(
      "span",
      { style: { ...typeScale.tileValue, fontFamily: "Space Grotesk", color: c.neutralHigh, marginTop: "8px" } },
      data.value
    ),
    h(
      "span",
      {
        style: {
          ...typeScale.tileCaption,
          fontFamily: "Space Grotesk",
          color: c.neutralMid,
          marginTop: "6px",
          lineHeight: 1.4,
        },
      },
      data.caption
    )
  );
}

// tileWidth is computed from tiles.length rather than hardcoded, so this
// component isn't silently wrong if a future edit adds/removes a tile without
// updating a hand-picked width constant.
export function StatStrip(mode: Mode, tiles: StatTileData[]): SatoriNode {
  const c = colors[mode];
  const { heroWidth: width, statStripHeight: height, marginX, tileGap } = spacing;
  const tileWidth = (width - marginX * 2 - tileGap * (tiles.length - 1)) / tiles.length;

  return h(
    "div",
    {
      style: {
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: `${tileGap}px`,
        backgroundColor: c.bg,
        padding: `0 ${marginX}px`,
      },
    },
    ...tiles.map((t) => Tile(c, tileWidth, t))
  );
}
