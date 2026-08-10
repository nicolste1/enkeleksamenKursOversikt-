import { describe, expect, it } from "vitest";

import {
  isColumnVisible,
  visibleColumns,
  type VisibilityColumn,
} from "@/lib/access/column-visibility";

const col = (id: string, visibleToFunctions?: string[]): VisibilityColumn => ({
  id,
  settings: visibleToFunctions ? { visibleToFunctions } : {},
});

describe("isColumnVisible", () => {
  it("columns with no restriction are visible to everyone", () => {
    expect(isColumnVisible(col("a"), new Set())).toBe(true);
    expect(isColumnVisible(col("a", []), new Set())).toBe(true);
  });

  it("restricted columns require an overlapping function", () => {
    const manus = col("manus", ["manusforfatter"]);
    expect(isColumnVisible(manus, new Set(["redigerer"]))).toBe(false);
    expect(isColumnVisible(manus, new Set(["manusforfatter"]))).toBe(true);
  });

  it("showAll overrides all restrictions", () => {
    const manus = col("manus", ["manusforfatter"]);
    expect(isColumnVisible(manus, new Set(["redigerer"]), true)).toBe(true);
  });

  it("handles a null settings object", () => {
    expect(isColumnVisible({ id: "x", settings: null }, new Set())).toBe(true);
  });
});

describe("visibleColumns", () => {
  const columns = [
    col("navn"),
    col("manus", ["manusforfatter"]),
    col("redigering", ["redigerer"]),
  ];

  it("a redigerer sees shared + editing columns, not manus", () => {
    const result = visibleColumns(columns, ["redigerer"]).map((c) => c.id);
    expect(result).toEqual(["navn", "redigering"]);
  });

  it("showAll returns every column", () => {
    expect(visibleColumns(columns, [], true)).toHaveLength(3);
  });

  it("accepts a Set as well as an array", () => {
    expect(visibleColumns(columns, new Set(["manusforfatter"])).map((c) => c.id)).toEqual([
      "navn",
      "manus",
    ]);
  });
});
