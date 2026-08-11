// Archiving (FR5) — client-callable, separate from mutations.ts so client
// components never pull in the server-only Supabase client. RLS enforces the
// asymmetry: board-admins may archive, only site-/workspace-admins may reopen.

import type { BrowserClient } from "@/lib/supabase/client";

export async function archiveBoard(
  supabase: BrowserClient,
  boardId: string,
): Promise<void> {
  const { error } = await supabase
    .from("boards")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", boardId);
  if (error) throw new Error(`Kunne ikke arkivere kurset: ${error.message}`);
}

export async function reopenBoard(
  supabase: BrowserClient,
  boardId: string,
): Promise<void> {
  const { error } = await supabase
    .from("boards")
    .update({ archived_at: null })
    .eq("id", boardId);
  if (error) throw new Error(`Kunne ikke gjenåpne kurset: ${error.message}`);
}
