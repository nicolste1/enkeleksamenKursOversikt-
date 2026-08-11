// Per-course progress rollup (home-page cards; groundwork for the FR3
// report): earned vs. estimated points across a board's videos, using the
// exact same earnedPoints() rule as the table — never a parallel SQL
// implementation (two implementations of one rule always drift).

import type { CellValue } from "@/lib/cells/cell-value";
import { earnedPoints } from "@/lib/points/earned";
import type { ColumnSettings } from "@/lib/types";

export interface ProgressColumn {
  id: string;
  settings: ColumnSettings;
}

export interface ProgressLabel {
  id: string;
  progress: number;
}

export interface ProgressCell {
  itemId: string;
  columnId: string;
  value: CellValue;
}

export interface CourseProgress {
  videoCount: number;
  estimatedPoints: number;
  earnedPoints: number;
  /** earned/estimated, 0 when nothing is estimated (never NaN). */
  fraction: number;
}

export function courseProgress(params: {
  columns: readonly ProgressColumn[];
  labels: readonly ProgressLabel[];
  /** Ids of live (non-deleted) items — cells of deleted items are ignored. */
  itemIds: readonly string[];
  cells: readonly ProgressCell[];
}): CourseProgress {
  const stepColumns = params.columns.filter((c) => c.settings.role === "step");
  const estimateColumnId =
    params.columns.find((c) => c.settings.role === "estimate")?.id ?? null;
  const labelsById = Object.fromEntries(
    params.labels.map((l) => [l.id, { progress: l.progress }]),
  );

  const cellsByItem = new Map<string, Record<string, CellValue>>();
  const alive = new Set(params.itemIds);
  for (const cell of params.cells) {
    if (!alive.has(cell.itemId)) continue;
    const forItem = cellsByItem.get(cell.itemId) ?? {};
    forItem[cell.columnId] = cell.value;
    cellsByItem.set(cell.itemId, forItem);
  }

  let estimated = 0;
  let earned = 0;
  for (const itemId of params.itemIds) {
    const cells = cellsByItem.get(itemId) ?? {};
    const estimateRaw = estimateColumnId ? cells[estimateColumnId]?.number : null;
    if (typeof estimateRaw !== "number" || estimateRaw <= 0) continue;

    const stepCells: Record<string, { labelId: string | null }> = {};
    for (const step of stepColumns) {
      const labelId = cells[step.id]?.labelId;
      stepCells[step.id] = { labelId: typeof labelId === "string" ? labelId : null };
    }
    estimated += estimateRaw;
    earned += earnedPoints(stepColumns, stepCells, labelsById) * estimateRaw;
  }

  return {
    videoCount: params.itemIds.length,
    estimatedPoints: estimated,
    earnedPoints: earned,
    fraction: estimated > 0 ? earned / estimated : 0,
  };
}
