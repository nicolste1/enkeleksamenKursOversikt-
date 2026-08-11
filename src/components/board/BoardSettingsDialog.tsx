"use client";

// Board administration (board-admins only, gated by manageMembers):
// production functions (create/rename/delete), members (add/role/remove, F2–F3)
// and per-member function assignment — which drives the column focus.

import { XIcon } from "lucide-react";
import { useState } from "react";

import { useBoard } from "@/components/board/board-store";
import { InlineText } from "@/components/board/InlineText";
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
import type { BoardRole } from "@/lib/types";

const ROLES: { value: BoardRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "medlem", label: "Medlem" },
  { value: "leser", label: "Leser" },
];

function personName(person: BoardPerson | undefined, fallback: string): string {
  return person?.fullName ?? person?.email ?? fallback;
}

export function BoardSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    state,
    addFunction,
    renameFunction,
    deleteFunction,
    assignFunction,
    unassignFunction,
    addMember,
    setMemberRole,
    removeMember,
  } = useBoard();
  const [newFunction, setNewFunction] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [candidateRole, setCandidateRole] = useState<BoardRole>("medlem");

  const memberIds = new Set(state.members.map((m) => m.userId));
  const candidates = state.workspaceMemberIds
    .filter((id) => !memberIds.has(id))
    .map((id) => state.peopleById[id])
    .filter((p): p is BoardPerson => Boolean(p))
    .sort((a, b) => (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email, "nb"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Funksjoner og medlemmer</DialogTitle>
          <DialogDescription>
            Funksjoner styrer hvilke kolonner hver person ser (fokus, ikke
            tilgang). Roller styrer hva medlemmene kan gjøre (F3).
          </DialogDescription>
        </DialogHeader>

        <section>
          <h3 className="mb-2 text-sm font-medium">Produksjonsfunksjoner</h3>
          <div className="flex flex-wrap gap-2">
            {state.functions.map((fn) => (
              <span
                key={fn.id}
                className="bg-muted flex items-center gap-1 rounded-full py-0.5 pr-1 pl-3 text-sm"
              >
                <InlineText
                  value={fn.name}
                  className="min-w-0"
                  inputClassName="min-w-32"
                  onCommit={(name) => renameFunction(fn.id, name)}
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Slett ${fn.name}`}
                  onClick={() => deleteFunction(fn.id)}
                >
                  <XIcon />
                </Button>
              </span>
            ))}
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newFunction.trim()) return;
              addFunction(newFunction);
              setNewFunction("");
            }}
          >
            <Input
              value={newFunction}
              onChange={(e) => setNewFunction(e.target.value)}
              placeholder="Ny funksjon …"
              className="h-8 max-w-56 text-sm"
            />
            <Button type="submit" size="sm" variant="outline" disabled={!newFunction.trim()}>
              Legg til
            </Button>
          </form>
        </section>

        <section className="border-t pt-3">
          <h3 className="mb-2 text-sm font-medium">Medlemmer</h3>
          <div className="flex flex-col gap-3">
            {state.members.map((member) => {
              const person = state.peopleById[member.userId];
              // No self-demotion/-removal: you could lock yourself out
              // mid-dialog. Another admin makes such changes.
              const isSelf = member.userId === state.myUserId;
              return (
                <div key={member.userId} className="rounded-lg border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {personName(person, member.userId)}
                      {isSelf && (
                        <span className="text-muted-foreground ml-1 text-xs">(deg)</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <select
                        value={member.role}
                        disabled={isSelf}
                        title={
                          isSelf
                            ? "Du kan ikke endre din egen rolle — be en annen admin."
                            : undefined
                        }
                        onChange={(e) =>
                          setMemberRole(member.userId, e.target.value as BoardRole)
                        }
                        className="h-7 rounded border bg-transparent px-1 text-sm disabled:opacity-50"
                        aria-label="Rolle"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Fjern medlem"
                        disabled={isSelf}
                        title={
                          isSelf
                            ? "Du kan ikke fjerne deg selv — be en annen admin."
                            : undefined
                        }
                        onClick={() => removeMember(member.userId)}
                      >
                        <XIcon />
                      </Button>
                    </span>
                  </div>
                  {state.functions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {state.functions.map((fn) => {
                        const active = member.functionIds.includes(fn.id);
                        return (
                          <button
                            key={fn.id}
                            type="button"
                            onClick={() =>
                              active
                                ? unassignFunction(member.userId, fn.id)
                                : assignFunction(member.userId, fn.id)
                            }
                            className={`rounded-full border px-2 py-0.5 text-xs ${
                              active
                                ? "bg-primary text-primary-foreground border-transparent"
                                : "text-muted-foreground hover:border-foreground/40"
                            }`}
                          >
                            {fn.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {candidates.length > 0 ? (
            <form
              className="mt-3 flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!candidateId) return;
                addMember(candidateId, candidateRole);
                setCandidateId("");
              }}
            >
              <select
                value={candidateId}
                onChange={(e) => setCandidateId(e.target.value)}
                className="h-8 min-w-48 rounded border bg-transparent px-1 text-sm"
                aria-label="Velg person"
              >
                <option value="">Velg person …</option>
                {candidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName ?? p.email}
                  </option>
                ))}
              </select>
              <select
                value={candidateRole}
                onChange={(e) => setCandidateRole(e.target.value as BoardRole)}
                className="h-8 rounded border bg-transparent px-1 text-sm"
                aria-label="Rolle for nytt medlem"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline" disabled={!candidateId}>
                Legg til medlem
              </Button>
            </form>
          ) : (
            <p className="text-muted-foreground mt-3 text-sm">
              Alle i workspacen er allerede medlemmer av kurset.
            </p>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
