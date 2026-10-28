import { describe, expect, it } from "vitest";
import { monthGrid } from "@/lib/calendar";

describe("monthGrid", () => {
  it("starts on the Sunday before the 1st and has 42 days", () => {
    const g = monthGrid(2026, 9); // outubro 2026, dia 1 é quinta
    expect(g).toHaveLength(42);
    expect(g[0]).toBe("2026-09-27");
    expect(g[4]).toBe("2026-10-01");
  });
});
