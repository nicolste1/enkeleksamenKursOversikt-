"use client";

// Board title + archive state + admin actions (FR5): board-admins archive,
// only site-/workspace-admins reopen. Settings dialog for functions/members.

import { MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";

import { useBoard } from "@/components/board/board-store";
import { BoardSettingsDialog } from "@/components/board/BoardSettingsDialog";
import { SetCourseEditorDialog } from "@/components/board/SetCourseEditorDialog";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function BoardHeader() {
  const store = useBoard();
  const { state } = store;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const archived = state.archivedAt !== null;
  const canSetEditor =
    store.allows("manageColumns") &&
    state.columns.some((c) => c.settings.role === "editResponsible");
  const showMenu =
    store.allows("manageMembers") || store.allows("manageBoard") || canSetEditor;

  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="flex min-w-0 items-center gap-2 text-xl font-semibold">
        <span className="truncate">{state.name}</span>
        {archived && (
          <span className="bg-muted text-muted-foreground shrink-0 rounded px-2 py-0.5 text-xs font-normal">
            Arkivert — skrivebeskyttet
          </span>
        )}
        {state.connection === "connecting" && (
          <span className="bg-muted text-muted-foreground shrink-0 rounded px-2 py-0.5 text-xs font-normal">
            Kobler til …
          </span>
        )}
        {state.connection === "offline" && (
          <span className="bg-destructive/10 text-destructive shrink-0 rounded px-2 py-0.5 text-xs font-normal">
            Frakoblet — endringer fra andre vises ikke
          </span>
        )}
      </h1>

      <div className="flex shrink-0 items-center gap-2">
        {archived && state.canReopen && (
          <Button size="sm" variant="outline" onClick={store.reopen}>
            Gjenåpne kurset
          </Button>
        )}
        {showMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label="Kursmeny" />}
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canSetEditor && (
                <DropdownMenuItem onClick={() => setEditorOpen(true)}>
                  Sett redigerer …
                </DropdownMenuItem>
              )}
              {store.allows("manageMembers") && (
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  Funksjoner og medlemmer …
                </DropdownMenuItem>
              )}
              {store.allows("manageBoard") && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setConfirmArchive(true)}
                >
                  Arkiver kurset …
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <BoardSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <SetCourseEditorDialog open={editorOpen} onOpenChange={setEditorOpen} />

      <Dialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arkivere «{state.name}»?</DialogTitle>
            <DialogDescription>
              Kurset skjules fra den aktive listen og blir skrivebeskyttet
              (FR5). Tallene telles fortsatt med i rapporter, og en
              administrator kan gjenåpne kurset senere.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmArchive(false)}>
              Avbryt
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                store.archive();
                setConfirmArchive(false);
              }}
            >
              Arkiver
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
