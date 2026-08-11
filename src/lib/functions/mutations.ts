// Production-function mutations — client-callable. Functions drive column
// focus (visibleToFunctions); assignments require board membership (FK).

import type { BrowserClient } from "@/lib/supabase/client";

export async function insertFunction(
  supabase: BrowserClient,
  params: { id: string; boardId: string; name: string; position: string },
): Promise<void> {
  const { error } = await supabase.from("board_functions").insert({
    id: params.id,
    board_id: params.boardId,
    name: params.name,
    position: params.position,
  });
  if (error) throw new Error(`Kunne ikke opprette funksjonen: ${error.message}`);
}

export async function renameFunction(
  supabase: BrowserClient,
  params: { boardId: string; functionId: string; name: string },
): Promise<void> {
  const { error } = await supabase
    .from("board_functions")
    .update({ name: params.name })
    .eq("id", params.functionId)
    .eq("board_id", params.boardId);
  if (error) throw new Error(`Kunne ikke endre funksjonsnavnet: ${error.message}`);
}

export async function softDeleteFunction(
  supabase: BrowserClient,
  params: { boardId: string; functionId: string },
): Promise<void> {
  const { error } = await supabase
    .from("board_functions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.functionId)
    .eq("board_id", params.boardId);
  if (error) throw new Error(`Kunne ikke slette funksjonen: ${error.message}`);
}

export async function assignFunction(
  supabase: BrowserClient,
  params: { boardId: string; userId: string; functionId: string },
): Promise<void> {
  const { error } = await supabase.from("board_member_functions").insert({
    board_id: params.boardId,
    user_id: params.userId,
    function_id: params.functionId,
  });
  if (error) throw new Error(`Kunne ikke tildele funksjonen: ${error.message}`);
}

export async function unassignFunction(
  supabase: BrowserClient,
  params: { boardId: string; userId: string; functionId: string },
): Promise<void> {
  const { error } = await supabase
    .from("board_member_functions")
    .delete()
    .eq("board_id", params.boardId)
    .eq("user_id", params.userId)
    .eq("function_id", params.functionId);
  if (error) throw new Error(`Kunne ikke fjerne funksjonen: ${error.message}`);
}
