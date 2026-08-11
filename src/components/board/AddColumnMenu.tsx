"use client";

// «+»-menu in the header: pick a column type (F7), name it, done.

import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { useBoard } from "@/components/board/board-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { ColumnType } from "@/lib/types";

const COLUMN_TYPES: { type: ColumnType; label: string }[] = [
  { type: "status", label: "Status" },
  { type: "label", label: "Etikett" },
  { type: "person", label: "Person" },
  { type: "date", label: "Dato" },
  { type: "text", label: "Tekst" },
  { type: "number", label: "Tall" },
  { type: "link", label: "Lenke" },
];

export function AddColumnMenu() {
  const { addColumn } = useBoard();
  const [pendingType, setPendingType] = useState<ColumnType | null>(null);
  const [title, setTitle] = useState("");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-xs" aria-label="Ny kolonne" />
          }
        >
          <PlusIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {COLUMN_TYPES.map(({ type, label }) => (
            <DropdownMenuItem
              key={type}
              onClick={() => {
                setTitle("");
                setPendingType(type);
              }}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={pendingType !== null}
        onOpenChange={(open) => !open && setPendingType(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Ny {COLUMN_TYPES.find((c) => c.type === pendingType)?.label.toLowerCase()}
              -kolonne
            </DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!pendingType || !title.trim()) return;
              addColumn(pendingType, title);
              setPendingType(null);
            }}
          >
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kolonnenavn"
              autoFocus
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={!title.trim()}>
                Opprett kolonne
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
