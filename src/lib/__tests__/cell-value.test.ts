import { describe, expect, it } from "vitest";

import { emptyValue, isValidValue } from "@/lib/cells/cell-value";
import type { ColumnType } from "@/lib/types";

const ALL_TYPES: ColumnType[] = [
  "status",
  "person",
  "date",
  "text",
  "number",
  "link",
  "label",
];

describe("emptyValue", () => {
  it("produces a valid empty value for every column type", () => {
    for (const type of ALL_TYPES) {
      expect(isValidValue(type, emptyValue(type))).toBe(true);
    }
  });
});

describe("isValidValue", () => {
  it("rejects non-object values", () => {
    expect(isValidValue("text", null)).toBe(false);
    expect(isValidValue("text", "hei")).toBe(false);
    expect(isValidValue("status", [])).toBe(false);
  });

  it("validates status/label label ids", () => {
    expect(isValidValue("status", { labelId: "abc" })).toBe(true);
    expect(isValidValue("label", { labelId: null })).toBe(true);
    expect(isValidValue("status", { labelId: 3 })).toBe(false);
  });

  it("validates dates as YYYY-MM-DD or null", () => {
    expect(isValidValue("date", { date: "2026-08-10" })).toBe(true);
    expect(isValidValue("date", { date: null })).toBe(true);
    expect(isValidValue("date", { date: "10.08.2026" })).toBe(false);
  });

  it("validates numbers by JS type, rejecting NaN and Infinity", () => {
    expect(isValidValue("number", { number: 3.5 })).toBe(true);
    expect(isValidValue("number", { number: null })).toBe(true);
    expect(isValidValue("number", { number: "3" })).toBe(false);
    expect(isValidValue("number", { number: NaN })).toBe(false);
    expect(isValidValue("number", { number: Infinity })).toBe(false);
  });

  it("validates link urls", () => {
    expect(isValidValue("link", { url: "https://x.no", label: "X" })).toBe(true);
    expect(isValidValue("link", { url: "" })).toBe(true);
    expect(isValidValue("link", { label: "mangler url" })).toBe(false);
  });
});
