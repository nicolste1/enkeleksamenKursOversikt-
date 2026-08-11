"use client";

// Link editor (FR8: feedback lives in Google Docs/Drive — the app only needs
// the link). Bare domains get https:// prepended for convenience.

import { useState } from "react";

import { useBoard } from "@/components/board/board-store";
import { safeHttpUrl } from "@/components/board/CellDisplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BoardColumn } from "@/lib/boards/queries";
import type { CellValue } from "@/lib/cells/cell-value";

function displayText(url: string, label: string): string | null {
  if (label) return label;
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LinkCell({
  itemId,
  column,
  value,
}: {
  itemId: string;
  column: BoardColumn;
  value: CellValue | undefined;
}) {
  const { setCell } = useBoard();
  const [open, setOpen] = useState(false);
  const currentUrl = typeof value?.url === "string" ? value.url : "";
  const currentLabel = typeof value?.label === "string" ? value.label : "";
  const [url, setUrl] = useState(currentUrl);
  const [label, setLabel] = useState(currentLabel);
  const display = displayText(currentUrl, currentLabel);

  const save = () => {
    let nextUrl = url.trim();
    if (nextUrl && !/^[a-z][a-z0-9+.-]*:/i.test(nextUrl)) {
      nextUrl = `https://${nextUrl}`;
    }
    setCell(itemId, column, { url: nextUrl, label: label.trim() });
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setUrl(currentUrl);
          setLabel(currentLabel);
        }
      }}
    >
      <PopoverTrigger
        render={<button type="button" className="block w-full cursor-pointer text-left" />}
      >
        {/* Plain text in the trigger — the actual anchor lives in the popover
            (an <a> inside a <button> is invalid and double-triggers). */}
        {display ? (
          <span className="text-primary inline-block max-w-56 truncate align-bottom underline underline-offset-2">
            {display}
          </span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="h-7 text-sm"
            autoFocus
          />
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Visningstekst (valgfri)"
            className="h-7 text-sm"
          />
          {currentUrl && safeHttpUrl(currentUrl) && (
            <a
              href={safeHttpUrl(currentUrl)!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary truncate text-sm underline underline-offset-2"
            >
              Åpne lenken ↗
            </a>
          )}
          <div className="flex justify-between">
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => {
                setCell(itemId, column, { url: "", label: "" });
                setOpen(false);
              }}
            >
              Fjern lenke
            </Button>
            <Button type="submit" size="xs">
              Lagre
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
