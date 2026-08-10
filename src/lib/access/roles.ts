// TypeScript mirror of the RLS intent in supabase/migrations (private.board_access
// + policies). SQL is the enforcement; this is the readable source of truth the UI
// uses to show/hide affordances, and what the unit tests pin down.

import type { BoardRole, WorkspaceRole } from "@/lib/types";

export type BoardCapability =
  | "viewBoard"
  | "editItems"
  | "manageColumns"
  | "manageMembers"
  | "manageBoard";

/**
 * Effective board role, matching private.board_access precedence exactly:
 * site admin -> workspace-admin -> explicit board membership -> none.
 */
export function effectiveBoardRole(
  isSiteAdmin: boolean,
  workspaceRole: WorkspaceRole | null,
  boardRole: BoardRole | null,
): BoardRole | null {
  if (isSiteAdmin) return "admin";
  if (workspaceRole === "admin") return "admin";
  return boardRole;
}

const CAPABILITIES: Record<BoardRole, ReadonlySet<BoardCapability>> = {
  // Mirrors the policy write conditions: content tables allow admin+medlem,
  // board membership/settings require admin, leser is read-only.
  admin: new Set<BoardCapability>([
    "viewBoard",
    "editItems",
    "manageColumns",
    "manageMembers",
    "manageBoard",
  ]),
  medlem: new Set<BoardCapability>(["viewBoard", "editItems", "manageColumns"]),
  leser: new Set<BoardCapability>(["viewBoard"]),
};

export function can(role: BoardRole | null, action: BoardCapability): boolean {
  if (!role) return false;
  return CAPABILITIES[role].has(action);
}
