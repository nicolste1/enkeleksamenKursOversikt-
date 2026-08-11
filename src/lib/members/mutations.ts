// Board-membership mutations — client-callable, board-admin only via RLS
// (board_members_mutate). Removing a member cascades their function
// assignments (FK on board_member_functions).

import type { BrowserClient } from "@/lib/supabase/client";
import type { BoardRole } from "@/lib/types";

export async function addBoardMember(
  supabase: BrowserClient,
  params: { boardId: string; userId: string; role: BoardRole },
): Promise<void> {
  const { error } = await supabase.from("board_members").insert({
    board_id: params.boardId,
    user_id: params.userId,
    role: params.role,
  });
  if (error) throw new Error(`Kunne ikke legge til medlemmet: ${error.message}`);
}

export async function updateBoardMemberRole(
  supabase: BrowserClient,
  params: { boardId: string; userId: string; role: BoardRole },
): Promise<void> {
  const { error } = await supabase
    .from("board_members")
    .update({ role: params.role })
    .eq("board_id", params.boardId)
    .eq("user_id", params.userId);
  if (error) throw new Error(`Kunne ikke endre rollen: ${error.message}`);
}

export async function removeBoardMember(
  supabase: BrowserClient,
  params: { boardId: string; userId: string },
): Promise<void> {
  const { error } = await supabase
    .from("board_members")
    .delete()
    .eq("board_id", params.boardId)
    .eq("user_id", params.userId);
  if (error) throw new Error(`Kunne ikke fjerne medlemmet: ${error.message}`);
}
