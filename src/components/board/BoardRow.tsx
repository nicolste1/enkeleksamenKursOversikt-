"use client";

import { MoreHorizontalIcon } from "lucide-react";

import { useBoard } from "@/components/board/board-store";
import type { PointsContext } from "@/components/board/BoardTable";
import { CellEditor } from "@/components/board/cells/CellEditor";
import { InlineText } from "@/components/board/InlineText";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { BoardColumn, BoardItem } from "@/lib/boards/queries";
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
  pointsContext,
}: {
  item: BoardItem;
  columns: BoardColumn[];
  pointsContext: PointsContext;
}) {
  const { allows, renameItem, moveItem, deleteItem } = useBoard();
  const earned = computeEarned(item, pointsContext);
  const editable = allows("editItems");

  return (
    <tr className="group/row hover:bg-muted/30 border-t">
      <td className="bg-background sticky left-0 z-10 max-w-72 border-r px-3 py-1.5 font-medium">
        <span className="flex items-center gap-1">
          {editable ? (
            <InlineText
              value={item.name}
              className="truncate"
              onCommit={(name) => renameItem(item.id, name)}
            />
          ) : (
            <span className="truncate">{item.name}</span>
          )}
          {editable && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 opacity-0 group-hover/row:opacity-100 aria-expanded:opacity-100"
                    aria-label="Radmeny"
                  />
                }
              >
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => moveItem(item.id, -1)}>
                  Flytt opp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => moveItem(item.id, 1)}>
                  Flytt ned
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => deleteItem(item.id)}
                >
                  Slett video
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </span>
      </td>
      {columns.map((column) => (
        <td key={column.id} className="px-3 py-1.5 whitespace-nowrap">
          <CellEditor
            itemId={item.id}
            column={column}
            value={item.cells[column.id]}
            computedEarned={earned}
          />
        </td>
      ))}
      {allows("manageColumns") && <td />}
    </tr>
  );
}
