"use client";

import { ChevronDownIcon, MoreHorizontalIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { groupPoints, type PointsContext } from "@/components/board/board-points";
import { useBoard } from "@/components/board/board-store";
import { BoardRow } from "@/components/board/BoardRow";
import { colorFor, readableTint } from "@/components/board/cells/label-colors";
import { InlineText } from "@/components/board/InlineText";
import { ProgressBar } from "@/components/board/ProgressBar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BoardColumn, BoardGroupData } from "@/lib/boards/queries";

const pointsFormat = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 });

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

/** One subchapter as a collapsible, editable section of rows (F4), with its
 *  own accent color and progress rollup in the header. */
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

  // Stored color when set (editable in a later round); otherwise a stable
  // color derived from the name so every group has an identity for free.
  const color = group.color ?? colorFor(group.name);
  const totals = groupPoints(group.items, pointsContext);

  return (
    <tbody className="border-t">
      <tr>
        <td colSpan={colSpan} className="px-2 pt-3 pb-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Vis gruppen" : "Skjul gruppen"}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-0.5"
            >
              <ChevronDownIcon
                className={`size-4 transition-transform duration-150 ${
                  collapsed ? "-rotate-90" : ""
                }`}
              />
            </button>
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <div
              className="min-w-0 text-sm font-semibold"
              style={{ color: readableTint(color) }}
            >
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
            {totals.estimated > 0 && (
              <span className="text-muted-foreground ml-auto flex shrink-0 items-center gap-2 pr-2 text-xs tabular-nums">
                <ProgressBar
                  fraction={totals.fraction}
                  color={color}
                  className="w-24"
                />
                {pointsFormat.format(totals.earned)} av{" "}
                {pointsFormat.format(totals.estimated)} p ·{" "}
                {Math.round(totals.fraction * 100)} %
              </span>
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
            groupColor={color}
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
