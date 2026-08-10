// Typed parse/validate/empty helpers for the JSONB stored in cell_values.value.
// The database stores an untyped jsonb per (item, column); this module is the
// single place that knows the shape each column type expects.

import type { ColumnType } from "@/lib/types";

export type CellValue = Record<string, unknown>;

function assertNever(type: never): never {
  throw new Error(`Unhandled column type: ${String(type)}`);
}

/** The canonical "no value set" shape for each column type. */
export function emptyValue(type: ColumnType): CellValue {
  switch (type) {
    case "status":
    case "label":
      return { labelId: null };
    case "person":
      return { userId: null };
    case "date":
      return { date: null };
    case "text":
      return { text: "" };
    case "number":
      return { number: null };
    case "link":
      return { url: "", label: "" };
    default:
      return assertNever(type);
  }
}

const isStringOrNull = (v: unknown): boolean => v === null || typeof v === "string";

/** Validate that a raw JSONB value matches the expected shape for `type`. */
export function isValidValue(type: ColumnType, value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const v = value as CellValue;
  switch (type) {
    case "status":
    case "label":
      return isStringOrNull(v.labelId);
    case "person":
      return isStringOrNull(v.userId);
    case "date":
      // Expect null or an ISO calendar date (YYYY-MM-DD).
      return (
        v.date === null ||
        (typeof v.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.date))
      );
    case "text":
      return typeof v.text === "string";
    case "number":
      return v.number === null || Number.isFinite(v.number);
    case "link":
      return typeof v.url === "string" && isStringOrNull(v.label ?? "");
    default:
      return assertNever(type);
  }
}
