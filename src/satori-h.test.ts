import { describe, it, expect } from "vitest";
import { h } from "./satori-h.js";

describe("h", () => {
  it("builds a node with string children", () => {
    const node = h("span", { style: { color: "red" } }, "hello");
    expect(node).toEqual({
      type: "span",
      props: { style: { color: "red" }, children: "hello" },
    });
  });

  it("builds a node with element children", () => {
    const child = h("span", {}, "a");
    const node = h("div", {}, child);
    expect(node.props.children).toEqual([child]);
  });

  it("builds a node with multiple element children", () => {
    const a = h("span", {}, "a");
    const b = h("span", {}, "b");
    const node = h("div", {}, a, b);
    expect(node.props.children).toEqual([a, b]);
  });

  it("builds a node with multiple string children as an array", () => {
    const node = h("div", {}, "a", "b");
    expect(node.props.children).toEqual(["a", "b"]);
  });

  it("builds a node with mixed string and element children", () => {
    const child = h("span", {}, "a");
    const node = h("div", {}, "text", child);
    expect(node.props.children).toEqual(["text", child]);
  });

  it("builds a node with no children as an empty array", () => {
    const node = h("div", { style: { color: "blue" } });
    expect(node.props.children).toEqual([]);
  });
});
