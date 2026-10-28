import { describe, expect, it } from "vitest";
import { insertionPosition, reordered } from "@/lib/board-order";

describe("Board ordering", () => {
  it("moves an item forward without losing siblings", () => {
    expect(reordered([{ id: "a" }, { id: "b" }, { id: "c" }], "a", "c").map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
  it("moves an item backward", () => {
    expect(reordered([{ id: "a" }, { id: "b" }, { id: "c" }], "c", "a").map((x) => x.id)).toEqual(["c", "a", "b"]);
  });
  it("places a moved task between its neighbors", () => {
    expect(insertionPosition([{ posicao: 100 }, { posicao: 200 }], 1)).toBe(150);
  });
  it("supports a drop into an empty column", () => {
    expect(insertionPosition([], 0)).toBe(1024);
  });
});