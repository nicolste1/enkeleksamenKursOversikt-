"use client";

// Click-to-edit text used by item names, group names and text/number cells.
// Commits on Enter/blur, cancels on Escape.

import { useRef, useState, type ReactNode } from "react";

export function InlineText({
  value,
  display,
  onCommit,
  placeholder,
  className,
  inputClassName,
}: {
  value: string;
  /** What to show when not editing; defaults to the raw value. */
  display?: ReactNode;
  onCommit: (next: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const cancelled = useRef(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`block w-full cursor-text text-left ${className ?? ""}`}
      >
        {display ?? (value || <span className="text-muted-foreground/60">{placeholder ?? "—"}</span>)}
      </button>
    );
  }

  return (
    <input
      autoFocus
      defaultValue={value}
      placeholder={placeholder}
      className={`w-full min-w-24 rounded border px-1 py-0.5 text-sm outline-none focus:border-ring ${inputClassName ?? ""}`}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        setEditing(false);
        if (cancelled.current) {
          cancelled.current = false;
          return;
        }
        const next = e.currentTarget.value;
        if (next !== value) onCommit(next);
      }}
    />
  );
}
