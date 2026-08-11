"use client";

// Column management (F7): rename, reorder, per-function visibility, point
// weight for production steps (FR2), label editing (own dialog) and delete.
// The header reads as plain text — the chevron only appears on hover/open.

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { useBoard } from "@/components/board/board-store";
import { LabelEditorDialog } from "@/components/board/LabelEditorDialog";
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
import type { BoardColumn } from "@/lib/boards/queries";

type DialogKind = "rename" | "visibility" | "weight" | "delete" | null;

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
  } = useBoard();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(column.title);
  const [weightValue, setWeightValue] = useState("");
  const [visibleTo, setVisibleTo] = useState<Set<string>>(() => new Set());

  const hasLabels = column.type === "status" || column.type === "label";

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
              className="group/colhead hover:text-foreground flex items-center gap-1 whitespace-nowrap"
            />
          }
        >
          {column.title}
          {/* Hidden until the header is hovered or the menu is open. */}
          <ChevronDownIcon className="size-3.5 opacity-0 transition-opacity group-hover/colhead:opacity-60 group-aria-expanded/colhead:opacity-60" />
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
            <DropdownMenuItem onClick={() => setLabelsOpen(true)}>
              Rediger labels …
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => openDialog("delete")}>
            Slett kolonne …
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {hasLabels && (
        <LabelEditorDialog
          column={column}
          open={labelsOpen}
          onOpenChange={setLabelsOpen}
        />
      )}

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
