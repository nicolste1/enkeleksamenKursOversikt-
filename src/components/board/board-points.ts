// Points context + per-item/per-group rollups for the board view («Fullført
// arbeid», FR2). Thin adapters over the tested earnedPoints() rule.

import type { BoardItem } from "@/lib/boards/queries";
import {
  earnedPoints,
  type LabelsById,
  type StepColumn,
} from "@/lib/points/earned";

export interface PointsContext {
  stepColumns: StepColumn[];
  labelProgressById: LabelsById;
  estimateColumnId: string | null;
}

export interface ItemPoints {
  estimate: number;
  earned: number;
  fraction: number;
}

/** null when the row has no estimate — rendered as an empty cell. */
export function itemPoints(item: BoardItem, ctx: PointsContext): ItemPoints | null {
  if (!ctx.estimateColumnId) return null;
  const estimateRaw = item.cells[ctx.estimateColumnId]?.number;
  if (typeof estimateRaw !== "number") return null;

  const stepCells: Record<string, { labelId: string | null }> = {};
  for (const step of ctx.stepColumns) {
    const labelId = item.cells[step.id]?.labelId;
    stepCells[step.id] = { labelId: typeof labelId === "string" ? labelId : null };
  }
  const fraction = earnedPoints(ctx.stepColumns, stepCells, ctx.labelProgressById);
  return { estimate: estimateRaw, earned: fraction * estimateRaw, fraction };
}

export interface GroupPoints {
  estimated: number;
  earned: number;
  fraction: number;
}

export function groupPoints(
  items: readonly BoardItem[],
  ctx: PointsContext,
): GroupPoints {
  let estimated = 0;
  let earned = 0;
  for (const item of items) {
    const points = itemPoints(item, ctx);
    if (!points || points.estimate <= 0) continue;
    estimated += points.estimate;
    earned += points.earned;
  }
  return { estimated, earned, fraction: estimated > 0 ? earned / estimated : 0 };
}
