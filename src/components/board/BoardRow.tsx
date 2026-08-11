"use client";

import type { PointsContext } from "@/components/board/BoardTable";
import { CellDisplay } from "@/components/board/CellDisplay";
import type {
  BoardColumn,
  BoardItem,
  BoardLabel,
  BoardPerson,
} from "@/lib/boards/queries";
import { earnedPoints, type StepCellValues } from "@/lib/points/earned";

/** «Fullført arbeid» for one row: earned fraction (FR2) × the row's estimate.
 *  null when the row has no estimate — rendered as an empty cell. */
function computeEarned(item: BoardItem, ctx: PointsContext): number | null {
  if (!ctx.estimateColumnId) return null;
  const estimateRaw = item.cells[ctx.estimateColumnId]?.number;
  if (typeof estimateRaw !== "number") return null;

  const stepCells: Record<string, { labelId: string | null }> = {};
  for (const step of ctx.stepColumns) {
    const labelId = item.cells[step.id]?.labelId;
    stepCells[step.id] = { labelId: typeof labelId === "string" ? labelId : null };
  }
  const fraction = earnedPoints(
    ctx.stepColumns,
    stepCells as StepCellValues,
    ctx.labelProgressById,
  );
  return fraction * estimateRaw;
}

export function BoardRow({
  item,
  columns,
  labelsById,
  peopleById,
  pointsContext,
}: {
  item: BoardItem;
  columns: BoardColumn[];
  labelsById: Record<string, BoardLabel>;
  peopleById: Record<string, BoardPerson>;
  pointsContext: PointsContext;
}) {
  const earned = computeEarned(item, pointsContext);

  return (
    <tr className="hover:bg-muted/30 border-t">
      <td className="bg-background sticky left-0 z-10 max-w-72 truncate border-r px-3 py-1.5 font-medium">
        {item.name}
      </td>
      {columns.map((column) => (
        <td key={column.id} className="px-3 py-1.5 whitespace-nowrap">
          <CellDisplay
            column={column}
            value={item.cells[column.id]}
            labelsById={labelsById}
            peopleById={peopleById}
            computedEarned={earned}
          />
        </td>
      ))}
    </tr>
  );
}
