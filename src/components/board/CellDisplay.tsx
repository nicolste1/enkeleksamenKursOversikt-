"use client";

// Renders one read-only cell for every column type (F5/F7). The «Fullført
// arbeid» column (role: earned) is never stored — the computed value comes in
// via computedEarned (FR2).

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { BoardColumn, BoardLabel, BoardPerson } from "@/lib/boards/queries";
import type { CellValue } from "@/lib/cells/cell-value";

const numberFormat = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 2 });

const Empty = () => <span className="text-muted-foreground/60">—</span>;

function LabelPill({ label }: { label: BoardLabel }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: label.color }}
    >
      {label.title}
    </span>
  );
}

function initials(person: BoardPerson): string {
  const source = person.fullName?.trim() || person.email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/** "YYYY-MM-DD" → "dd.mm.yyyy" without Date-object timezone surprises;
 *  anything malformed is shown as-is rather than mangled. */
function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

/** Cell values are member-writable data: only link out to http(s) URLs so a
 *  stored javascript:-URL can never execute in a colleague's session. */
function safeHttpUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function CellDisplay({
  column,
  value,
  labelsById,
  peopleById,
  computedEarned,
}: {
  column: BoardColumn;
  value: CellValue | undefined;
  labelsById: Record<string, BoardLabel>;
  peopleById: Record<string, BoardPerson>;
  computedEarned: number | null;
}) {
  if (column.settings.role === "earned") {
    return computedEarned === null ? (
      <Empty />
    ) : (
      <span className="tabular-nums">{numberFormat.format(computedEarned)}</span>
    );
  }

  switch (column.type) {
    case "status":
    case "label": {
      const labelId = value?.labelId;
      const label = typeof labelId === "string" ? labelsById[labelId] : undefined;
      // A stray value pointing at another column's label renders as empty
      // rather than silently showing the wrong pill.
      return label && label.columnId === column.id ? (
        <LabelPill label={label} />
      ) : (
        <Empty />
      );
    }
    case "person": {
      const userId = value?.userId;
      const person = typeof userId === "string" ? peopleById[userId] : undefined;
      if (!person) return <Empty />;
      return (
        <span className="flex items-center gap-2">
          <Avatar size="sm">
            {person.avatarUrl && (
              <AvatarImage src={person.avatarUrl} alt="" referrerPolicy="no-referrer" />
            )}
            <AvatarFallback>{initials(person)}</AvatarFallback>
          </Avatar>
          <span className="max-w-40 truncate">{person.fullName ?? person.email}</span>
        </span>
      );
    }
    case "date": {
      const date = value?.date;
      return typeof date === "string" && date ? (
        <span className="tabular-nums">{formatDate(date)}</span>
      ) : (
        <Empty />
      );
    }
    case "text": {
      const text = value?.text;
      return typeof text === "string" && text ? (
        <span className="inline-block max-w-64 truncate align-bottom">{text}</span>
      ) : (
        <Empty />
      );
    }
    case "number": {
      const num = value?.number;
      return typeof num === "number" ? (
        <span className="tabular-nums">{numberFormat.format(num)}</span>
      ) : (
        <Empty />
      );
    }
    case "link": {
      const url = value?.url;
      if (typeof url !== "string" || !url) return <Empty />;
      const label = typeof value?.label === "string" && value.label ? value.label : null;
      const safeUrl = safeHttpUrl(url);
      if (!safeUrl) {
        // Not linkable (bad or non-http protocol): show the text, never a link.
        return (
          <span className="inline-block max-w-56 truncate align-bottom">
            {label ?? url}
          </span>
        );
      }
      const display = label ?? new URL(safeUrl).hostname.replace(/^www\./, "");
      return (
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-block max-w-56 truncate align-bottom underline underline-offset-2"
        >
          {display}
        </a>
      );
    }
    default:
      return <Empty />;
  }
}
