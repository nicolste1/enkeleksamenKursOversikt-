"use client";

// Person picker — candidates are the board's workspace members (decided in
// the plan: workspace scope, not the whole company beyond it).

import { useState } from "react";

import { useBoard } from "@/components/board/board-store";
import { CellDisplay } from "@/components/board/CellDisplay";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BoardColumn, BoardPerson } from "@/lib/boards/queries";
import type { CellValue } from "@/lib/cells/cell-value";

function personInitials(person: BoardPerson): string {
  const source = person.fullName?.trim() || person.email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function PersonCell({
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
  const { state, setCell } = useBoard();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const candidates = state.workspaceMemberIds
    .map((id) => state.peopleById[id])
    .filter((p): p is BoardPerson => Boolean(p))
    .sort((a, b) =>
      (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email, "nb"),
    )
    .filter((p) => {
      const q = filter.trim().toLowerCase();
      if (!q) return true;
      return (
        (p.fullName ?? "").toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
      );
    });

  const pick = (userId: string | null) => {
    setCell(itemId, column, { userId });
    setOpen(false);
    setFilter("");
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
      <PopoverContent className="w-64 p-2" align="start">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Søk person …"
          className="mb-2 h-7 text-sm"
        />
        <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
          {candidates.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => pick(person.id)}
              className="hover:bg-muted flex items-center gap-2 rounded px-2 py-1 text-left text-sm"
            >
              <Avatar size="sm">
                {person.avatarUrl && (
                  <AvatarImage src={person.avatarUrl} alt="" referrerPolicy="no-referrer" />
                )}
                <AvatarFallback>{personInitials(person)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{person.fullName ?? person.email}</span>
            </button>
          ))}
          {candidates.length === 0 && (
            <p className="text-muted-foreground px-2 py-1 text-sm">Ingen treff.</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => pick(null)}
          className="hover:bg-muted text-muted-foreground mt-1 w-full rounded border-t px-2 pt-2 pb-1 text-left text-sm"
        >
          Fjern person
        </button>
      </PopoverContent>
    </Popover>
  );
}
