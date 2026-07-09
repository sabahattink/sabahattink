export interface SatoriNode {
  type: string;
  props: {
    style?: Record<string, string | number>;
    children?: (SatoriNode | string)[] | string;
    [key: string]: unknown;
  };
}

export function h(
  type: string,
  props: Record<string, unknown> = {},
  ...children: (SatoriNode | string)[]
): SatoriNode {
  const isSingleString = children.length === 1 && typeof children[0] === "string";
  const flatChildren: (SatoriNode | string)[] | string = isSingleString
    ? (children[0] as string)
    : children;

  return {
    type,
    props: {
      ...props,
      children: flatChildren,
    },
  };
}
