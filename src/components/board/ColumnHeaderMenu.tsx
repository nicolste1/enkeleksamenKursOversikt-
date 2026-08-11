"use client";

// Column management (F7): rename, reorder, per-function visibility, point
// weight for production steps (FR2), label editing with rates (FR1/F6), and
// delete. All actions live behind the column header's dropdown.

import { ChevronDownIcon, XIcon } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { BoardColumn, BoardLabel } from "@/lib/boards/queries";
import { comparePositions } from "@/lib/ordering/position";

type DialogKind = "rename" | "visibility" | "weight" | "labels" | "delete" | null;

function ColorSwatches({
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

function LabelRow({
  label,
  withPoints,
}: {
  label: BoardLabel;
  withPoints: boolean;
}) {
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

export function ColumnHeaderMenu({
  column,
  visibleColumnIds,
}: {
  column: BoardColumn;
  /** Ids of the columns currently shown — moves anchor on visible neighbors. */
  visibleColumnIds: string[];
}) {
  const {
    state,
    renameColumn,
    moveColumn,
    deleteColumn,
    setColumnVisibility,
    setPointWeight,
    addLabel,
  } = useBoard();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [renameValue, setRenameValue] = useState(column.title);
  const [weightValue, setWeightValue] = useState(
    column.settings.pointWeight !== undefined ? String(column.settings.pointWeight) : "",
  );
  const [visibleTo, setVisibleTo] = useState<Set<string>>(
    () => new Set(column.settings.visibleToFunctions ?? []),
  );
  const [newLabelTitle, setNewLabelTitle] = useState("");
  const [newLabelColor, setNewLabelColor] = useState<string>(LABEL_COLORS[4]);

  const hasLabels = column.type === "status" || column.type === "label";
  const withPoints =
    column.settings.role === "contentType" || column.settings.role === "questionRate";
  const labels = Object.values(state.labelsById)
    .filter((l) => l.columnId === column.id)
    .sort((a, b) => comparePositions(a.position, b.position));

  const openDialog = (kind: Exclude<DialogKind, null>) => {
    setRenameValue(column.title);
    setWeightValue(
      column.settings.pointWeight !== undefined
        ? String(column.settings.pointWeight)
        : "",
    );
    setVisibleTo(new Set(column.settings.visibleToFunctions ?? []));
    setDialog(kind);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="hover:text-foreground flex items-center gap-1 whitespace-nowrap"
            />
          }
        >
          {column.title}
          <ChevronDownIcon className="size-3.5 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => openDialog("rename")}>
            Gi nytt navn …
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => moveColumn(column.id, -1, visibleColumnIds)}>
            Flytt til venstre
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => moveColumn(column.id, 1, visibleColumnIds)}>
            Flytt til høyre
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => openDialog("visibility")}>
            Synlig for funksjoner …
          </DropdownMenuItem>
          {column.settings.role === "step" && (
            <DropdownMenuItem onClick={() => openDialog("weight")}>
              Poengvekt …
            </DropdownMenuItem>
          )}
          {hasLabels && (
            <DropdownMenuItem onClick={() => openDialog("labels")}>
              Rediger labels …
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => openDialog("delete")}>
            Slett kolonne …
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          {dialog === "rename" && (
            <>
              <DialogHeader>
                <DialogTitle>Gi kolonnen nytt navn</DialogTitle>
              </DialogHeader>
              <form
                className="grid gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  renameColumn(column.id, renameValue);
                  setDialog(null);
                }}
              >
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  autoFocus
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={!renameValue.trim()}>
                    Lagre
                  </Button>
                </div>
              </form>
            </>
          )}

          {dialog === "visibility" && (
            <>
              <DialogHeader>
                <DialogTitle>Synlig for funksjoner</DialogTitle>
                <DialogDescription>
                  Ingen avhukede = synlig for alle. Dette er fokus/rydding, ikke
                  tilgangsstyring — alle kan vise alt med «Vis alle kolonner».
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                {state.functions.map((fn) => (
                  <label key={fn.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={visibleTo.has(fn.id)}
                      onChange={(e) => {
                        const next = new Set(visibleTo);
                        if (e.target.checked) next.add(fn.id);
                        else next.delete(fn.id);
                        setVisibleTo(next);
                      }}
                    />
                    {fn.name}
                  </label>
                ))}
                {state.functions.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Ingen funksjoner definert på kurset ennå.
                  </p>
                )}
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      setColumnVisibility(column.id, [...visibleTo]);
                      setDialog(null);
                    }}
                  >
                    Lagre
                  </Button>
                </div>
              </div>
            </>
          )}

          {dialog === "weight" && (
            <>
              <DialogHeader>
                <DialogTitle>Poengvekt</DialogTitle>
                <DialogDescription>
                  Stegets andel av videoens poeng (FR2), som desimal — f.eks. 0,15.
                  Vektene på kurset bør til sammen bli 1.
                </DialogDescription>
              </DialogHeader>
              <form
                className="grid gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const parsed = Number(weightValue.trim().replace(",", "."));
                  if (!Number.isFinite(parsed) || parsed < 0) return;
                  setPointWeight(column.id, parsed);
                  setDialog(null);
                }}
              >
                <Input
                  value={weightValue}
                  onChange={(e) => setWeightValue(e.target.value)}
                  placeholder="0,15"
                  autoFocus
                />
                <div className="flex justify-end">
                  <Button type="submit">Lagre</Button>
                </div>
              </form>
            </>
          )}

          {dialog === "labels" && (
            <>
              <DialogHeader>
                <DialogTitle>Labels for «{column.title}»</DialogTitle>
                {withPoints && (
                  <DialogDescription>
                    «Poeng» er {column.settings.role === "questionRate"
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
                  if (!newLabelTitle.trim()) return;
                  addLabel(column.id, newLabelTitle, newLabelColor);
                  setNewLabelTitle("");
                }}
              >
                <Input
                  value={newLabelTitle}
                  onChange={(e) => setNewLabelTitle(e.target.value)}
                  placeholder="Ny label …"
                  className="h-8 text-sm"
                />
                <ColorSwatches selected={newLabelColor} onPick={setNewLabelColor} />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" variant="outline" disabled={!newLabelTitle.trim()}>
                    Legg til label
                  </Button>
                </div>
              </form>
            </>
          )}

          {dialog === "delete" && (
            <>
              <DialogHeader>
                <DialogTitle>Slett kolonnen «{column.title}»?</DialogTitle>
                <DialogDescription>
                  Kolonnen skjules fra kurset (celleverdiene beholdes og kan
                  gjenopprettes fra papirkurven senere).
                  {column.settings.role &&
                    " NB: Kolonnen har en rolle i poengmodellen — sletting påvirker beregningen."}
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialog(null)}>
                  Avbryt
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    deleteColumn(column.id);
                    setDialog(null);
                  }}
                >
                  Slett kolonne
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
