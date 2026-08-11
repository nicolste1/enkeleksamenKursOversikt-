"use client";

import { MoreHorizontalIcon } from "lucide-react";

import { itemPoints, type PointsContext } from "@/components/board/board-points";
import { useBoard } from "@/components/board/board-store";
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

export function BoardRow({
  item,
  columns,
  pointsContext,
  groupColor,
}: {
  item: BoardItem;
  columns: BoardColumn[];
  pointsContext: PointsContext;
  /** The group's accent color — rendered as a thin left edge on the row. */
  groupColor: string;
}) {
  const { allows, renameItem, moveItem, deleteItem } = useBoard();
  const points = itemPoints(item, pointsContext);
  const editable = allows("editItems");

  return (
    <tr className="group/row hover:bg-muted/60 border-t transition-colors">
      <td
        className="bg-background sticky left-0 z-10 max-w-72 border-r px-2 py-1 font-medium"
        style={{ boxShadow: `inset 3px 0 0 ${groupColor}` }}
      >
        <span className="flex items-center gap-1 pl-1">
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
        <td
          key={column.id}
          className={`px-2 py-1 whitespace-nowrap ${
            column.type === "number" ? "text-right" : ""
          }`}
        >
          <CellEditor
            itemId={item.id}
            column={column}
            value={item.cells[column.id]}
            computedEarned={points === null ? null : points.earned}
            earnedFraction={points === null ? null : points.fraction}
          />
        </td>
      ))}
      {allows("manageColumns") && <td />}
    </tr>
  );
}
