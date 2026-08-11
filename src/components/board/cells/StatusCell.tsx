"use client";

// Editor for status and label columns: pick a value, clear it, or (for those
// who manage columns) add a new label with its own color (F6).

import { useState } from "react";

import { useBoard } from "@/components/board/board-store";
import { LABEL_COLORS } from "@/components/board/cells/label-colors";
import { CellDisplay } from "@/components/board/CellDisplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const { state, setCell, allows, addLabel } = useBoard();
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState<string>(LABEL_COLORS[0]);

  const labels = Object.values(state.labelsById)
    .filter((l) => l.columnId === column.id)
    .sort((a, b) => comparePositions(a.position, b.position));
  const currentId = typeof value?.labelId === "string" ? value.labelId : null;

  const pick = (labelId: string | null) => {
    setCell(itemId, column, { labelId });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<button type="button" className="block w-full cursor-pointer text-left" />}
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
          <form
            className="mt-2 flex flex-col gap-2 border-t pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTitle.trim()) return;
              addLabel(column.id, newTitle, newColor);
              setNewTitle("");
            }}
          >
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ny label …"
              className="h-7 text-sm"
            />
            <div className="flex flex-wrap gap-1">
              {LABEL_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Farge ${color}`}
                  onClick={() => setNewColor(color)}
                  className={`size-5 rounded-full border-2 ${
                    color === newColor ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <Button type="submit" size="xs" variant="outline" disabled={!newTitle.trim()}>
              Legg til label
            </Button>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
