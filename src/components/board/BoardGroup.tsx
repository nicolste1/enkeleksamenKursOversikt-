"use client";

import {
  ChevronDownIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PlusIcon,
} from "lucide-react";
import { useState } from "react";

import { useBoard } from "@/components/board/board-store";
import { BoardRow } from "@/components/board/BoardRow";
import type { PointsContext } from "@/components/board/BoardTable";
import { InlineText } from "@/components/board/InlineText";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BoardColumn, BoardGroupData } from "@/lib/boards/queries";

function AddItemRow({ groupId, colSpan }: { groupId: string; colSpan: number }) {
  const { addItem } = useBoard();
  const [name, setName] = useState("");

  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-1">
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            addItem(groupId, name);
            setName("");
          }}
        >
          <PlusIcon className="text-muted-foreground size-3.5" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Legg til video …"
            className="placeholder:text-muted-foreground/70 w-64 bg-transparent py-0.5 text-sm outline-none"
          />
        </form>
      </td>
    </tr>
  );
}

/** One subchapter as a collapsible, editable section of rows (F4). */
export function BoardGroup({
  group,
  columns,
  colSpan,
  pointsContext,
  collapsed,
  onToggle,
}: {
  group: BoardGroupData;
  columns: BoardColumn[];
  /** Total table columns incl. the name column and any trailing «+»-column. */
  colSpan: number;
  pointsContext: PointsContext;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { allows, renameGroup, moveGroup, deleteGroup } = useBoard();
  const editable = allows("editItems");

  return (
    <tbody className="border-t">
      <tr>
        <td colSpan={colSpan} className="bg-muted/30 px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Vis gruppen" : "Skjul gruppen"}
              className="hover:text-foreground"
            >
              {collapsed ? (
                <ChevronRightIcon className="size-4" />
              ) : (
                <ChevronDownIcon className="size-4" />
              )}
            </button>
            <div className="min-w-0 text-sm font-medium">
              {editable ? (
                <InlineText
                  value={group.name}
                  className="truncate"
                  onCommit={(name) => renameGroup(group.id, name)}
                />
              ) : (
                <span className="truncate">{group.name}</span>
              )}
            </div>
            <span className="text-muted-foreground text-xs">{group.items.length}</span>
            {editable && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-xs" aria-label="Gruppemeny" />
                  }
                >
                  <MoreHorizontalIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => moveGroup(group.id, -1)}>
                    Flytt opp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => moveGroup(group.id, 1)}>
                    Flytt ned
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => deleteGroup(group.id)}
                  >
                    Slett delkapittel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </td>
      </tr>
      {!collapsed &&
        group.items.map((item) => (
          <BoardRow
            key={item.id}
            item={item}
            columns={columns}
            pointsContext={pointsContext}
          />
        ))}
      {!collapsed && group.items.length === 0 && !editable && (
        <tr>
          <td colSpan={colSpan} className="text-muted-foreground px-3 py-2 text-sm">
            Ingen videoer i dette delkapittelet.
          </td>
        </tr>
      )}
      {!collapsed && editable && <AddItemRow groupId={group.id} colSpan={colSpan} />}
    </tbody>
  );
}
