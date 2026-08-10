// Per-function column visibility. This is a UI focus/declutter feature, NOT an
// access boundary — anyone with board access can reveal everything via the
// "Vis alle kolonner" toggle. Security is handled by RLS, not here.

import type { ColumnSettings } from "@/lib/types";

export interface VisibilityColumn {
  id: string;
  settings: ColumnSettings | null;
}

/** A column with no visibleToFunctions is visible to all; otherwise a viewer
 *  sees it if any of their functions is listed. */
export function isColumnVisible(
  column: VisibilityColumn,
  userFunctionIds: ReadonlySet<string>,
  showAll = false,
): boolean {
  if (showAll) return true;
  const restrictedTo = column.settings?.visibleToFunctions;
  if (!restrictedTo || restrictedTo.length === 0) return true;
  return restrictedTo.some((fnId) => userFunctionIds.has(fnId));
}

export function visibleColumns<T extends VisibilityColumn>(
  columns: readonly T[],
  userFunctionIds: Iterable<string>,
  showAll = false,
): T[] {
  const set =
    userFunctionIds instanceof Set
      ? (userFunctionIds as ReadonlySet<string>)
      : new Set(userFunctionIds);
  return columns.filter((column) => isColumnVisible(column, set, showAll));
}
