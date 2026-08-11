"use client";

// Date editor: native date input, cleared value stores { date: null }.

import { useBoard } from "@/components/board/board-store";
import type { BoardColumn } from "@/lib/boards/queries";
import type { CellValue } from "@/lib/cells/cell-value";

export function DateCell({
  itemId,
  column,
  value,
}: {
  itemId: string;
  column: BoardColumn;
  value: CellValue | undefined;
}) {
  const { setCell } = useBoard();
  const current = typeof value?.date === "string" ? value.date : "";

  return (
    <input
      type="date"
      value={current}
      onChange={(e) => {
        const next = e.target.value;
        // Skip half-typed years (native inputs emit e.g. 0002-… while typing).
        if (next !== "" && next < "1900-01-01") return;
        setCell(itemId, column, { date: next || null });
      }}
      className="focus:border-ring w-32 cursor-pointer rounded border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none hover:border-border"
    />
  );
}
