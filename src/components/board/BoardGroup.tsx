"use client";

import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import { BoardRow } from "@/components/board/BoardRow";
import type { PointsContext } from "@/components/board/BoardTable";
import type {
  BoardColumn,
  BoardGroupData,
  BoardLabel,
  BoardPerson,
} from "@/lib/boards/queries";

/** One subchapter as a collapsible section of rows (F4). */
export function BoardGroup({
  group,
  columns,
  labelsById,
  peopleById,
  pointsContext,
  collapsed,
  onToggle,
}: {
  group: BoardGroupData;
  columns: BoardColumn[];
  labelsById: Record<string, BoardLabel>;
  peopleById: Record<string, BoardPerson>;
  pointsContext: PointsContext;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <tbody className="border-t">
      <tr>
        <td colSpan={columns.length + 1} className="bg-muted/30 px-2 py-1.5">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            className="hover:text-foreground flex items-center gap-1.5 text-sm font-medium"
          >
            {collapsed ? (
              <ChevronRightIcon className="size-4" />
            ) : (
              <ChevronDownIcon className="size-4" />
            )}
            {group.name}
            <span className="text-muted-foreground text-xs font-normal">
              {group.items.length}
            </span>
          </button>
        </td>
      </tr>
      {!collapsed &&
        group.items.map((item) => (
          <BoardRow
            key={item.id}
            item={item}
            columns={columns}
            labelsById={labelsById}
            peopleById={peopleById}
            pointsContext={pointsContext}
          />
        ))}
      {!collapsed && group.items.length === 0 && (
        <tr>
          <td
            colSpan={columns.length + 1}
            className="text-muted-foreground px-3 py-2 text-sm"
          >
            Ingen videoer i dette delkapittelet.
          </td>
        </tr>
      )}
    </tbody>
  );
}
