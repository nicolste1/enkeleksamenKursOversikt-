// Read model for saved filter views (F13). RLS limits rows to the signed-in
// user (saved_views_select), so no user filter is needed here. Definitions are
// untrusted JSONB — rows that fail the parse guard are dropped defensively so
// one corrupt view cannot break the board page.

import {
  isValidFilterDefinition,
  type FilterDefinition,
} from "@/lib/filters/filter-model";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

export interface SavedView {
  id: string;
  boardId: string | null;
  name: string;
  definition: FilterDefinition;
}

/** The signed-in user's saved views for one board (or the cross-course views
 *  when boardId is null), ordered by name. */
export async function getSavedViews(boardId: string | null): Promise<SavedView[]> {
  // A malformed id (route param) would surface as a Postgres cast error;
  // treat it as «no views» — the board fetch 404s the page anyway.
  if (boardId !== null && !isUuid(boardId)) return [];
  const supabase = await createClient();
  let query = supabase.from("saved_views").select("id, board_id, name, definition");
  query = boardId === null ? query.is("board_id", null) : query.eq("board_id", boardId);
  const { data, error } = await query.order("name");
  if (error) {
    throw new Error(`Kunne ikke hente lagrede visninger: ${error.message}`);
  }
  return (data ?? [])
    .filter((row) => isValidFilterDefinition(row.definition))
    .map((row) => ({
      id: row.id,
      boardId: row.board_id,
      name: row.name,
      definition: row.definition as unknown as FilterDefinition,
    }));
}
