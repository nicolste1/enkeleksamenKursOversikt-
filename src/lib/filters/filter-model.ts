// Filter model for board views and the cross-course view (F13). One definition
// shape shared by the board filter UI and «Mine leksjoner» — always evaluated
// in TS against a row's cells (see evaluate.ts), never in SQL. Definitions are
// persisted as JSONB (saved_views) and in localStorage, so parsing untrusted
// data goes through isValidFilterDefinition.

export type FilterOperator = "is" | "isNot";
export type FilterCombinator = "and" | "or";

/**
 * One condition: column → operator → value. `value` holds the comparable
 * primitive for the column type: labelId (status/label), userId (person),
 * "YYYY-MM-DD" (date), string (text/link URL), number (number).
 * `value: null` means «(tom)» — compares against an unset cell.
 */
export interface FilterCondition {
  kind: "condition";
  columnId: string;
  operator: FilterOperator;
  value: string | number | null;
}

/**
 * One level of nesting («+ Ny gruppe»): a group holds only conditions,
 * combined with its own combinator. Groups inside groups are not allowed.
 */
export interface FilterGroup {
  kind: "group";
  combinator: FilterCombinator;
  conditions: FilterCondition[];
}

export interface FilterDefinition {
  combinator: FilterCombinator;
  rules: (FilterCondition | FilterGroup)[];
}

export const EMPTY_FILTER: FilterDefinition = { combinator: "and", rules: [] };

const isCombinator = (v: unknown): v is FilterCombinator =>
  v === "and" || v === "or";

const isOperator = (v: unknown): v is FilterOperator =>
  v === "is" || v === "isNot";

const isConditionValue = (v: unknown): v is string | number | null =>
  v === null || typeof v === "string" || (typeof v === "number" && Number.isFinite(v));

function isCondition(value: unknown): value is FilterCondition {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    v.kind === "condition" &&
    typeof v.columnId === "string" &&
    isOperator(v.operator) &&
    isConditionValue(v.value)
  );
}

function isGroup(value: unknown): value is FilterGroup {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    v.kind === "group" &&
    isCombinator(v.combinator) &&
    Array.isArray(v.conditions) &&
    v.conditions.every(isCondition)
  );
}

/**
 * Parse guard for untrusted sources (saved_views.definition JSONB and
 * localStorage). Rejects anything but the exact shape above — in particular
 * groups nested inside groups.
 */
export function isValidFilterDefinition(value: unknown): value is FilterDefinition {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    isCombinator(v.combinator) &&
    Array.isArray(v.rules) &&
    v.rules.every((rule) => isCondition(rule) || isGroup(rule))
  );
}

/** True when the definition has at least one condition (drives «filter aktivt» UI). */
export function hasConditions(definition: FilterDefinition): boolean {
  return definition.rules.some(
    (rule) => rule.kind === "condition" || rule.conditions.length > 0,
  );
}
