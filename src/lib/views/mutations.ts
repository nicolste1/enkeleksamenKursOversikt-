// Saved-view mutations (client-callable: the caller passes the browser
// client). RLS pins user_id to the signed-in user (saved_views_mutate), so a
// mismatched userId fails server-side. No update/rename in v1 — delete and
// re-save covers the need.

import type { FilterDefinition } from "@/lib/filters/filter-model";
import type { BrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";

export async function createSavedView(
  supabase: BrowserClient,
  params: {
    userId: string;
    boardId: string | null;
    name: string;
    definition: FilterDefinition;
  },
): Promise<string> {
  const { data, error } = await supabase
    .from("saved_views")
    .insert({
      user_id: params.userId,
      board_id: params.boardId,
      name: params.name,
      definition: params.definition as unknown as Json,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Kunne ikke lagre visningen: ${error.message}`);
  return data.id;
}

export async function deleteSavedView(
  supabase: BrowserClient,
  params: { id: string },
): Promise<void> {
  const { error } = await supabase.from("saved_views").delete().eq("id", params.id);
  if (error) throw new Error(`Kunne ikke slette visningen: ${error.message}`);
}
