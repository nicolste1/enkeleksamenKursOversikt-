// Group (subchapter) mutations — client-callable. Soft deletes cascade
// logically: items keep their rows but disappear with the group (their group
// filter), and the week-2 trash can restore everything (N6).

import type { BrowserClient } from "@/lib/supabase/client";

export async function insertGroup(
  supabase: BrowserClient,
  params: { id: string; boardId: string; name: string; position: string },
): Promise<void> {
  const { error } = await supabase.from("groups").insert({
    id: params.id,
    board_id: params.boardId,
    name: params.name,
    position: params.position,
  });
  if (error) throw new Error(`Kunne ikke opprette delkapittelet: ${error.message}`);
}

export async function renameGroup(
  supabase: BrowserClient,
  params: { boardId: string; groupId: string; name: string },
): Promise<void> {
  const { error } = await supabase
    .from("groups")
    .update({ name: params.name })
    .eq("id", params.groupId)
    .eq("board_id", params.boardId);
  if (error) throw new Error(`Kunne ikke endre navnet: ${error.message}`);
}

export async function moveGroup(
  supabase: BrowserClient,
  params: { boardId: string; groupId: string; position: string },
): Promise<void> {
  const { error } = await supabase
    .from("groups")
    .update({ position: params.position })
    .eq("id", params.groupId)
    .eq("board_id", params.boardId);
  if (error) throw new Error(`Kunne ikke flytte delkapittelet: ${error.message}`);
}

export async function softDeleteGroup(
  supabase: BrowserClient,
  params: { boardId: string; groupId: string },
): Promise<void> {
  const { error } = await supabase
    .from("groups")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.groupId)
    .eq("board_id", params.boardId);
  if (error) throw new Error(`Kunne ikke slette delkapittelet: ${error.message}`);
}
