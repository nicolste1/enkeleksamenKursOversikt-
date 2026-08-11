"use client";

// Picks the right editor per column type; falls back to the read-only
// CellDisplay for viewers, archived boards and the computed earned column.

import { useBoard } from "@/components/board/board-store";
import { StatusCell } from "@/components/board/cells/StatusCell";
import { PersonCell } from "@/components/board/cells/PersonCell";
import { DateCell } from "@/components/board/cells/DateCell";
import { TextCell } from "@/components/board/cells/TextCell";
import { NumberCell } from "@/components/board/cells/NumberCell";
import { LinkCell } from "@/components/board/cells/LinkCell";
import { CellDisplay } from "@/components/board/CellDisplay";
import type { BoardColumn } from "@/lib/boards/queries";
import type { CellValue } from "@/lib/cells/cell-value";

export function CellEditor({
  itemId,
  column,
  value,
  computedEarned,
  earnedFraction = null,
}: {
  itemId: string;
  column: BoardColumn;
  value: CellValue | undefined;
  computedEarned: number | null;
  earnedFraction?: number | null;
}) {
  const { state, allows } = useBoard();

  if (!allows("editItems") || column.settings.role === "earned") {
    return (
      <CellDisplay
        column={column}
        value={value}
        labelsById={state.labelsById}
        peopleById={state.peopleById}
        computedEarned={computedEarned}
        earnedFraction={earnedFraction}
      />
    );
  }

  switch (column.type) {
    case "status":
    case "label":
      return (
        <StatusCell
          itemId={itemId}
          column={column}
          value={value}
          computedEarned={computedEarned}
        />
      );
    case "person":
      return (
        <PersonCell
          itemId={itemId}
          column={column}
          value={value}
          computedEarned={computedEarned}
        />
      );
    case "date":
      return <DateCell itemId={itemId} column={column} value={value} />;
    case "text":
      return <TextCell itemId={itemId} column={column} value={value} />;
    case "number":
      return <NumberCell itemId={itemId} column={column} value={value} />;
    case "link":
      return <LinkCell itemId={itemId} column={column} value={value} />;
  }
}
