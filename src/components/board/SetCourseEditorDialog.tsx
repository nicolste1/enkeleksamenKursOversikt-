"use client";

// «Sett redigerer for kurset» (F13): assigns one editor to the course — fills
// empty «Redigeringsansvarlig» cells (per-row choices stand, FR10) and is
// remembered as the default for new lessons (settings.defaultUserId).

import { CheckIcon } from "lucide-react";
import { useState } from "react";

import { useBoard } from "@/components/board/board-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { BoardPerson } from "@/lib/boards/queries";

function initials(person: BoardPerson): string {
  const source = person.fullName?.trim() || person.email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function SetCourseEditorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, assignCourseEditor } = useBoard();
  const [filter, setFilter] = useState("");

  const column = state.columns.find((c) => c.settings.role === "editResponsible");
  const currentDefault = column?.settings.defaultUserId ?? null;

  const candidates = state.workspaceMemberIds
    .map((id) => state.peopleById[id])
    .filter((p): p is BoardPerson => Boolean(p))
    .sort((a, b) => (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email, "nb"))
    .filter((p) => {
      const q = filter.trim().toLowerCase();
      if (!q) return true;
      return (
        (p.fullName ?? "").toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
      );
    });

  const pick = (userId: string | null) => {
    assignCourseEditor(userId);
    onOpenChange(false);
    setFilter("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sett redigerer for kurset</DialogTitle>
          <DialogDescription>
            Fyller tomme «Redigeringsansvarlig»-felter og brukes automatisk for
            nye leksjoner. Leksjoner som allerede har en redigerer beholder den.
          </DialogDescription>
        </DialogHeader>
        {!column ? (
          <p className="text-muted-foreground text-sm">
            Kurset har ingen «Redigeringsansvarlig»-kolonne.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Søk person …"
              className="h-8 text-sm"
            />
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {candidates.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => pick(person.id)}
                  className="hover:bg-muted flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm"
                >
                  <Avatar size="sm">
                    {person.avatarUrl && (
                      <AvatarImage
                        src={person.avatarUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <AvatarFallback>{initials(person)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate">
                    {person.fullName ?? person.email}
                  </span>
                  {person.id === currentDefault && (
                    <CheckIcon className="text-primary size-4 shrink-0" />
                  )}
                </button>
              ))}
              {candidates.length === 0 && (
                <p className="text-muted-foreground px-2 py-1 text-sm">Ingen treff.</p>
              )}
            </div>
            {currentDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => pick(null)}
                className="self-start"
              >
                Fjern standard for nye leksjoner
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
