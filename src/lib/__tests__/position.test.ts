import { describe, expect, it } from "vitest";

import {
  comparePositions,
  initialPositions,
  positionBetween,
} from "@/lib/ordering/position";

describe("positionBetween", () => {
  it("produces a key that sorts between its neighbours", () => {
    const a = positionBetween(null, null);
    const b = positionBetween(a, null);
    const mid = positionBetween(a, b);
    expect(a < b).toBe(true);
    expect(a < mid && mid < b).toBe(true);
  });

  it("keeps ordering stable when repeatedly inserting at the front", () => {
    let first = positionBetween(null, null);
    for (let i = 0; i < 5; i++) {
      const next = positionBetween(null, first);
      expect(next < first).toBe(true);
      first = next;
    }
  });
});

describe("initialPositions", () => {
  it("returns the requested count in ascending order", () => {
    const keys = initialPositions(4);
    expect(keys).toHaveLength(4);
    expect([...keys].sort()).toEqual(keys);
  });

  it("returns an empty array for non-positive counts", () => {
    expect(initialPositions(0)).toEqual([]);
    expect(initialPositions(-3)).toEqual([]);
  });
});

describe("comparePositions", () => {
  it("orders by code point (digits < uppercase < lowercase)", () => {
    expect(comparePositions("a0", "aZ")).toBeLessThan(0);
    expect(comparePositions("aZ", "aa")).toBeLessThan(0); // locale collations get this wrong
    expect(comparePositions("Zz", "a0")).toBeLessThan(0);
    expect(comparePositions("a1", "a1")).toBe(0);
  });

  it("agrees with the order fractional-indexing generates", () => {
    const keys = initialPositions(80); // enough to mix digit/letter suffixes
    const shuffled = [...keys].reverse();
    expect(shuffled.sort(comparePositions)).toEqual(keys);
  });
});
