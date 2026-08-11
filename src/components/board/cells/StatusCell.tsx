"use client";

// Editor for status and label columns: pick a value or clear it. Label
// management lives behind «Rediger labels …» (a separate dialog) so the
// everyday picker stays clean — editing is the rare case.

import { useState } from "react";

import { useBoard } from "@/components/board/board-store";
import { CellDisplay } from "@/components/board/CellDisplay";
import { LabelEditorDialog } from "@/components/board/LabelEditorDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BoardColumn } from "@/lib/boards/queries";
import type { CellValue } from "@/lib/cells/cell-value";
import { comparePositions } from "@/lib/ordering/position";

export function StatusCell({
  itemId,
  column,
  value,
  computedEarned,
}: {
  itemId: string;
  column: BoardColumn;
  value: CellValue | undefined;
  computedEarned: number | null;
}) {
  const { state, setCell, allows } = useBoard();
  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const labels = Object.values(state.labelsById)
    .filter((l) => l.columnId === column.id)
    .sort((a, b) => comparePositions(a.position, b.position));
  const currentId = typeof value?.labelId === "string" ? value.labelId : null;

  const pick = (labelId: string | null) => {
    setCell(itemId, column, { labelId });
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button type="button" className="block w-full cursor-pointer text-left" />
          }
        >
          <CellDisplay
            column={column}
            value={value}
            labelsById={state.labelsById}
            peopleById={state.peopleById}
            computedEarned={computedEarned}
          />
        </PopoverTrigger>
        <PopoverContent className="w-60 p-2" align="start">
          <div className="flex flex-col gap-1">
            {labels.map((label) => (
              <button
                key={label.id}
                type="button"
                onClick={() => pick(label.id)}
                className={`hover:bg-muted flex items-center gap-2 rounded px-2 py-1 text-left text-sm ${
                  label.id === currentId ? "bg-muted" : ""
                }`}
              >
                <span
                  className="inline-block size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                {label.title}
              </button>
            ))}
            <button
              type="button"
              onClick={() => pick(null)}
              className="hover:bg-muted text-muted-foreground rounded px-2 py-1 text-left text-sm"
            >
              Uten verdi
            </button>
          </div>

          {allows("manageColumns") && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setEditorOpen(true);
              }}
              className="hover:bg-muted text-muted-foreground mt-1 w-full rounded border-t px-2 pt-2 pb-1 text-left text-sm"
            >
              ✎ Rediger labels …
            </button>
          )}
        </PopoverContent>
      </Popover>

      <LabelEditorDialog column={column} open={editorOpen} onOpenChange={setEditorOpen} />
    </>
  );
}
