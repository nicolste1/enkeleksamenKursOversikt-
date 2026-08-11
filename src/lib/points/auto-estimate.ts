// FR1: «Arbeid» is written automatically from the content type (or question
// count × rate) and stays manually overridable. A user edit stores
// { number, manual: true }; automatic writes never carry the flag, and the
// automation backs off as soon as the flag exists. Pure function: the store
// calls it after any change to a contentType/questionCount/questionRate cell
// and applies the returned update (if any) as a normal cell write.

import type { CellValue } from "@/lib/cells/cell-value";
import { estimatedPoints } from "@/lib/points/estimate";
import type { ColumnRole, ColumnSettings } from "@/lib/types";

export interface EstimateColumn {
  id: string;
  settings: ColumnSettings;
}

export interface EstimateLabel {
  points?: number | null;
}

/** Column roles whose cell changes may re-derive the estimate. */
export const ESTIMATE_INPUT_ROLES: ReadonlySet<ColumnRole> = new Set([
  "contentType",
  "questionCount",
  "questionRate",
]);

const labelIdOf = (cell: CellValue | undefined): string | null => {
  const id = cell?.labelId;
  return typeof id === "string" ? id : null;
};

/**
 * The estimate-cell update implied by the item's current cells, or null when
 * nothing should change (no estimate column, manual override, or already in
 * sync). A cleared input set clears the estimate (number: null) rather than
 * writing a misleading 0.
 */
export function autoEstimateUpdate(params: {
  columns: readonly EstimateColumn[];
  labelsById: Readonly<Record<string, EstimateLabel | undefined>>;
  cells: Readonly<Record<string, CellValue | undefined>>;
}): { columnId: string; value: CellValue } | null {
  const { columns, labelsById, cells } = params;
  const byRole = (role: ColumnRole) => columns.find((c) => c.settings.role === role);

  const estimateColumn = byRole("estimate");
  if (!estimateColumn) return null;

  const current = cells[estimateColumn.id];
  if (current?.manual === true) return null; // user owns the value now

  const contentTypeId = labelIdOf(cells[byRole("contentType")?.id ?? ""]);
  const contentTypeLabel = contentTypeId ? labelsById[contentTypeId] : null;

  const questionCountRaw = cells[byRole("questionCount")?.id ?? ""]?.number;
  const questionCount =
    typeof questionCountRaw === "number" ? questionCountRaw : null;

  const rateColumn = byRole("questionRate");
  const rateLabelId = labelIdOf(cells[rateColumn?.id ?? ""]);
  const questionRateLabel = rateLabelId ? labelsById[rateLabelId] : null;

  const hasAnyInput =
    (contentTypeLabel?.points != null) || (questionCount !== null && questionCount > 0);
  const target = hasAnyInput
    ? estimatedPoints({
        contentTypeLabel,
        questionCount,
        questionRateLabel,
        defaultPointsPerQuestion: rateColumn?.settings.defaultPointsPerQuestion,
      })
    : null;

  const currentNumber = typeof current?.number === "number" ? current.number : null;
  if (currentNumber === target) return null;

  return { columnId: estimateColumn.id, value: { number: target } };
}
