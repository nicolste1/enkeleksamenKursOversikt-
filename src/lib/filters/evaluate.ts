// Filter evaluation (F13). Pure — evaluates a FilterDefinition against one
// row's cells. Semantics follow Notion: «er ikke X» is the pure negation of
// «er X», so empty cells DO match «er ikke X»; value null means «(tom)» and
// matches unset cells. Unknown column ids are treated as empty cells so saved
// views degrade gracefully when a column is deleted.

import type { CellValue } from "@/lib/cells/cell-value";
import type { ColumnType } from "@/lib/types";
import type {
  FilterCondition,
  FilterDefinition,
  FilterGroup,
} from "@/lib/filters/filter-model";

export interface FilterContext {
  /** Column type per id — tells the evaluator which key to read from the cell
   *  JSONB. Columns missing here (deleted) are treated as empty cells. */
  columnTypeById: Readonly<Record<string, ColumnType>>;
}

/**
 * The comparable primitive for a cell, normalized so missing cells, explicit
 * nulls and "" (text, link url) all become null (= empty). Exported for tests.
 */
export function cellComparable(
  type: ColumnType | undefined,
  value: CellValue | undefined,
): string | number | null {
  if (type === undefined || value === undefined) return null;
  switch (type) {
    case "status":
    case "label": {
      const labelId = value.labelId;
      return typeof labelId === "string" ? labelId : null;
    }
    case "person": {
      const userId = value.userId;
      return typeof userId === "string" ? userId : null;
    }
    case "date": {
      const date = value.date;
      return typeof date === "string" ? date : null;
    }
    case "text": {
      const text = value.text;
      return typeof text === "string" && text !== "" ? text : null;
    }
    case "number": {
      const number = value.number;
      return typeof number === "number" && Number.isFinite(number) ? number : null;
    }
    case "link": {
      const url = value.url;
      return typeof url === "string" && url !== "" ? url : null;
    }
  }
}

function matchesCondition(
  condition: FilterCondition,
  cells: Readonly<Record<string, CellValue>>,
  context: FilterContext,
): boolean {
  const comparable = cellComparable(
    context.columnTypeById[condition.columnId],
    cells[condition.columnId],
  );
  const equal = comparable === condition.value;
  return condition.operator === "is" ? equal : !equal;
}

function matchesGroup(
  group: FilterGroup,
  cells: Readonly<Record<string, CellValue>>,
  context: FilterContext,
): boolean {
  if (group.combinator === "and") {
    return group.conditions.every((c) => matchesCondition(c, cells, context));
  }
  return group.conditions.some((c) => matchesCondition(c, cells, context));
}

/** Does one row (its cells) match the definition? An empty definition — no
 *  conditions at all — matches everything (no filter). */
export function matchesFilter(
  definition: FilterDefinition,
  cells: Readonly<Record<string, CellValue>>,
  context: FilterContext,
): boolean {
  // Groups with zero conditions are dropped so they cannot poison `or`
  // (an empty group has no opinion, it is not a match-all/match-none).
  const rules = definition.rules.filter(
    (rule) => rule.kind === "condition" || rule.conditions.length > 0,
  );
  if (rules.length === 0) return true;

  const matches = (rule: FilterCondition | FilterGroup): boolean =>
    rule.kind === "condition"
      ? matchesCondition(rule, cells, context)
      : matchesGroup(rule, cells, context);

  return definition.combinator === "and"
    ? rules.every(matches)
    : rules.some(matches);
}
