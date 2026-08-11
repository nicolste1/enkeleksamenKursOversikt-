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
