"use client";

// Number editor. Accepts Norwegian decimal comma. Editing the estimate column
// («Arbeid») marks the value as manual so the FR1 automation backs off.

import { useBoard } from "@/components/board/board-store";
import { InlineText } from "@/components/board/InlineText";
import type { BoardColumn } from "@/lib/boards/queries";
import type { CellValue } from "@/lib/cells/cell-value";

const numberFormat = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 2 });

export function NumberCell({
  itemId,
  column,
  value,
}: {
  itemId: string;
  column: BoardColumn;
  value: CellValue | undefined;
}) {
  const { setCell } = useBoard();
  const current = typeof value?.number === "number" ? value.number : null;
  const isEstimate = column.settings.role === "estimate";

  const commit = (raw: string) => {
    const trimmed = raw.trim().replace(",", ".");
    let next: number | null = null;
    if (trimmed !== "") {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) return; // ignore invalid input
      next = parsed;
    }
    const cell: CellValue = { number: next };
    // FR1: a typed value makes the estimate manual; clearing the field hands
    // it back to the automation (the store re-derives it immediately).
    if (isEstimate && next !== null) cell.manual = true;
    setCell(itemId, column, cell);
  };

  return (
    <InlineText
      value={current === null ? "" : String(current)}
      display={
        current === null ? undefined : (
          <span className="tabular-nums">{numberFormat.format(current)}</span>
        )
      }
      placeholder="—"
      className="max-w-28"
      onCommit={commit}
    />
  );
}
