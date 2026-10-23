/** Fixed-precision numbers keep output byte-stable across platforms. */
export function n(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

export function esc(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

type AttrValue = string | number | undefined;

export function attrs(record: Record<string, AttrValue>): string {
  return Object.entries(record)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => `${key}="${typeof value === "number" ? n(value) : esc(value)}"`)
    .join(" ");
}

export function el(tag: string, record: Record<string, AttrValue>, children?: string): string {
  const a = attrs(record);
  const open = a.length > 0 ? `<${tag} ${a}` : `<${tag}`;
  return children === undefined ? `${open}/>` : `${open}>${children}</${tag}>`;
}

export function text(
  x: number,
  y: number,
  content: string,
  cls: string,
  extra: Record<string, AttrValue> = {},
): string {
  return el("text", { x, y, class: cls, ...extra }, esc(content));
}
