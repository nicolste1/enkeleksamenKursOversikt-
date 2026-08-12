"use client";

// One person bucket for «Grupper etter person» (F13), rendered as a <tbody>
// with the same table contract as BoardGroup. Buckets are synthesized at
// render time — no group menu, rename or add-row — but cells stay editable
// (BoardRow only needs the BoardProvider).

import { groupPoints, type PointsContext } from "@/components/board/board-points";
import { useBoard } from "@/components/board/board-store";
import { BoardRow } from "@/components/board/BoardRow";
import {
  chapterColor,
  readableTint,
  softBackground,
} from "@/components/board/cells/label-colors";
import { ProgressBar } from "@/components/board/ProgressBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { BoardColumn, BoardPerson } from "@/lib/boards/queries";
import type { PersonBucket } from "@/lib/filters/board-view";

const pointsFormat = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 });

const UNASSIGNED_COLOR = "#90a4ae";

function initials(person: BoardPerson): string {
  const source = person.fullName?.trim() || person.email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function PersonGroupSection({
  bucket,
  columns,
  colSpan,
  pointsContext,
}: {
  bucket: PersonBucket;
  columns: BoardColumn[];
  colSpan: number;
  pointsContext: PointsContext;
}) {
  const { state } = useBoard();
  const person = bucket.userId ? state.peopleById[bucket.userId] : undefined;
  const name = person ? (person.fullName ?? person.email) : "Uten ansvarlig";
  const color = person ? chapterColor(name) : UNASSIGNED_COLOR;
  const totals = groupPoints(bucket.items, pointsContext);

  return (
    <tbody className="border-t-4 border-transparent">
      <tr>
        <td colSpan={colSpan} className="p-0">
          <div
            className="flex items-center gap-2 border-y border-l-4 px-3 py-2.5"
            style={{
              borderLeftColor: color,
              backgroundColor: softBackground(color),
            }}
          >
            {person && (
              <Avatar size="sm">
                {person.avatarUrl && (
                  <AvatarImage src={person.avatarUrl} alt="" referrerPolicy="no-referrer" />
                )}
                <AvatarFallback>{initials(person)}</AvatarFallback>
              </Avatar>
            )}
            <span
              className="min-w-0 truncate text-base font-semibold"
              style={{ color: readableTint(color) }}
            >
              {name}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs">
              {bucket.items.length} {bucket.items.length === 1 ? "leksjon" : "leksjoner"}
            </span>
            {totals.estimated > 0 && (
              <span className="text-muted-foreground ml-auto flex shrink-0 items-center gap-2 pr-2 text-xs tabular-nums">
                <ProgressBar fraction={totals.fraction} color={color} className="w-24" />
                {pointsFormat.format(totals.earned)} av{" "}
                {pointsFormat.format(totals.estimated)} p ·{" "}
                {Math.round(totals.fraction * 100)} %
              </span>
            )}
          </div>
        </td>
      </tr>
      {bucket.items.map((item) => (
        <BoardRow
          key={item.id}
          item={item}
          columns={columns}
          pointsContext={pointsContext}
          groupColor={color}
        />
      ))}
    </tbody>
  );
}
