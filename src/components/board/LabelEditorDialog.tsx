"use client";

// Label management for one status/label column (F6/FR1): rename, recolor,
// rates («poeng») where relevant, delete, add. Reached from the column-header
// menu and from the «Rediger labels …» button in the status picker — editing
// is deliberately tucked away since it is used far less often than picking.

import { XIcon } from "lucide-react";
import { useState } from "react";

import { useBoard } from "@/components/board/board-store";
import { LABEL_COLORS } from "@/components/board/cells/label-colors";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { BoardColumn, BoardLabel } from "@/lib/boards/queries";
import { comparePositions } from "@/lib/ordering/position";

export function ColorSwatches({
  selected,
  onPick,
}: {
  selected: string;
  onPick: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {LABEL_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Farge ${color}`}
          onClick={() => onPick(color)}
          className={`size-5 rounded-full border-2 ${
            color === selected ? "border-foreground" : "border-transparent"
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function LabelRow({ label, withPoints }: { label: BoardLabel; withPoints: boolean }) {
  const { updateLabel, deleteLabel } = useBoard();
  const [showColors, setShowColors] = useState(false);

  return (
    <div className="flex flex-col gap-1 border-b py-1.5 last:border-b-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Endre farge"
          onClick={() => setShowColors((v) => !v)}
          className="size-4 shrink-0 rounded-full"
          style={{ backgroundColor: label.color }}
        />
        <Input
          key={label.title} // remount when the store value changes (resync)
          defaultValue={label.title}
          className="h-7 flex-1 text-sm"
          onBlur={(e) => {
            const title = e.currentTarget.value.trim();
            if (title && title !== label.title) updateLabel(label.id, { title });
          }}
        />
        {withPoints && (
          <Input
            key={String(label.points)} // remount when the store value changes
            defaultValue={label.points ?? ""}
            placeholder="poeng"
            className="h-7 w-20 text-sm"
            onBlur={(e) => {
              const raw = e.currentTarget.value.trim().replace(",", ".");
              const points = raw === "" ? null : Number(raw);
              if (points !== null && !Number.isFinite(points)) return;
              if (points !== label.points) updateLabel(label.id, { points });
            }}
          />
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Slett label"
          onClick={() => deleteLabel(label.id)}
        >
          <XIcon />
        </Button>
      </div>
      {showColors && (
        <ColorSwatches
          selected={label.color}
          onPick={(color) => {
            updateLabel(label.id, { color });
            setShowColors(false);
          }}
        />
      )}
    </div>
  );
}

export function LabelEditorDialog({
  column,
  open,
  onOpenChange,
}: {
  column: BoardColumn;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, addLabel } = useBoard();
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState<string>(LABEL_COLORS[4]);

  const withPoints =
    column.settings.role === "contentType" || column.settings.role === "questionRate";
  const labels = Object.values(state.labelsById)
    .filter((l) => l.columnId === column.id)
    .sort((a, b) => comparePositions(a.position, b.position));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Labels for «{column.title}»</DialogTitle>
          {withPoints && (
            <DialogDescription>
              «Poeng» er{" "}
              {column.settings.role === "questionRate"
                ? "sats per spørsmål"
                : "beregnet arbeid for innholdstypen"}{" "}
              (FR1).
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="max-h-72 overflow-y-auto">
          {labels.map((label) => (
            <LabelRow key={label.id} label={label} withPoints={withPoints} />
          ))}
          {labels.length === 0 && (
            <p className="text-muted-foreground text-sm">Ingen labels ennå.</p>
          )}
        </div>
        <form
          className="grid gap-2 border-t pt-3"
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
            className="h-8 text-sm"
          />
          <ColorSwatches selected={newColor} onPick={setNewColor} />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={!newTitle.trim()}
            >
              Legg til label
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
