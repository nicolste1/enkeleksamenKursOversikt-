"use client";

import { useBoard } from "@/components/board/board-store";
import { InlineText } from "@/components/board/InlineText";
import type { BoardColumn } from "@/lib/boards/queries";
import type { CellValue } from "@/lib/cells/cell-value";

export function TextCell({
  itemId,
  column,
  value,
}: {
  itemId: string;
  column: BoardColumn;
  value: CellValue | undefined;
}) {
  const { setCell } = useBoard();
  const current = typeof value?.text === "string" ? value.text : "";

  return (
    <InlineText
      value={current}
      placeholder="—"
      className="max-w-64 truncate"
      onCommit={(next) => setCell(itemId, column, { text: next })}
    />
  );
}
