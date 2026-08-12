"use client";

// Saved views menu (F13): apply, delete and save named filter combinations.
// Views are personal (RLS: own rows only) and the list is server-fetched by
// the board page, so create/delete refresh the route to re-sync it. The
// browser client is created here (like board-store does) but all DB access
// goes through src/lib/views/mutations.

import { BookmarkIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useBoard } from "@/components/board/board-store";
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
import { hasConditions, type FilterDefinition } from "@/lib/filters/filter-model";
import { createSavedView, deleteSavedView } from "@/lib/views/mutations";
import { createClient } from "@/lib/supabase/client";
import type { SavedView } from "@/lib/views/queries";

export function SavedViewsMenu({
  savedViews,
  activeViewId,
  definition,
  onApply,
  onDeleted,
}: {
  savedViews: SavedView[];
  activeViewId: string | null;
  /** The current (possibly unsaved) filter — what «Lagre …» persists. */
  definition: FilterDefinition;
  onApply: (view: SavedView) => void;
  onDeleted: (viewId: string) => void;
}) {
  const { state } = useBoard();
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createSavedView(supabase, {
        userId: state.myUserId,
        boardId: state.id,
        name: trimmed,
        definition,
      });
      setSaveOpen(false);
      setName("");
      router.refresh(); // re-fetch the server-rendered view list
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noe gikk galt ved lagring.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (viewId: string) => {
    try {
      await deleteSavedView(supabase, { id: viewId });
      onDeleted(viewId);
      router.refresh();
    } catch {
      // The list re-syncs on refresh either way; a failed delete leaves the
      // view in place, which the refreshed list makes obvious.
      router.refresh();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button size="sm" variant="outline" aria-label="Lagrede visninger" />}
        >
          <BookmarkIcon className="size-3.5" />
          Visninger
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {savedViews.map((view) => (
            <DropdownMenuItem
              key={view.id}
              onClick={() => onApply(view)}
              className={view.id === activeViewId ? "font-semibold" : undefined}
            >
              <span className="min-w-0 flex-1 truncate">{view.name}</span>
              <button
                type="button"
                aria-label={`Slett visningen ${view.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  void remove(view.id);
                }}
                className="text-muted-foreground hover:text-destructive rounded p-0.5"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </DropdownMenuItem>
          ))}
          {savedViews.length === 0 && (
            <p className="text-muted-foreground px-2 py-1.5 text-sm">
              Ingen lagrede visninger.
            </p>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!hasConditions(definition)}
            onClick={() => setSaveOpen(true)}
          >
            Lagre gjeldende filter som visning …
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lagre visning</DialogTitle>
            <DialogDescription>
              Filterkombinasjonen lagres som en personlig visning på dette kurset.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="flex flex-col gap-3"
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Navn på visningen …"
              autoFocus
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSaveOpen(false)}
              >
                Avbryt
              </Button>
              <Button type="submit" disabled={!name.trim() || saving}>
                Lagre
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
