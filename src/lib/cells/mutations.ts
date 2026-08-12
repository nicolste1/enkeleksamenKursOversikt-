// Cell mutations (client-callable: the store passes the browser client).
// Last-write-wins via updated_at (N3); RLS enforces write access and the
// archive lock — errors surface to the store which resyncs.

import type { CellValue } from "@/lib/cells/cell-value";
import type { BrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";

export async function upsertCellValue(
  supabase: BrowserClient,
  params: {
    boardId: string;
    itemId: string;
    columnId: string;
    value: CellValue;
    userId: string;
  },
): Promise<void> {
  const { error } = await supabase.from("cell_values").upsert(
    {
      board_id: params.boardId,
      item_id: params.itemId,
      column_id: params.columnId,
      value: params.value as Json,
      updated_by: params.userId,
    },
    { onConflict: "item_id,column_id" },
  );
  if (error) throw new Error(`Kunne ikke lagre cellen: ${error.message}`);
}

/** Set one person column to the same user on many rows in a single upsert —
 *  «Sett redigerer for kurset» (F13). The caller picks which rows (only empty
 *  cells, per FR10) from ITS view of the board; a concurrent per-row edit in
 *  the snapshot-to-upsert window loses to this write (last-write-wins, N3). */
export async function bulkSetPersonCells(
  supabase: BrowserClient,
  params: {
    boardId: string;
    columnId: string;
    itemIds: string[];
    userId: string;
    updatedBy: string;
  },
): Promise<void> {
  if (params.itemIds.length === 0) return;
  const { error } = await supabase.from("cell_values").upsert(
    params.itemIds.map((itemId) => ({
      board_id: params.boardId,
      item_id: itemId,
      column_id: params.columnId,
      value: { userId: params.userId } as Json,
      updated_by: params.updatedBy,
    })),
    { onConflict: "item_id,column_id" },
  );
  if (error) throw new Error(`Kunne ikke tilordne redigerer: ${error.message}`);
}
