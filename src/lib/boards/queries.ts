// Read model for the board table view. getBoardData fetches everything the
// table and its admin dialogs need (RLS enforces access; soft-deleted rows are
// filtered here) and reshapes DB rows into camelCase domain objects.

import { effectiveBoardRole } from "@/lib/access/roles";
import {
  rowToColumn,
  rowToGroupFields,
  rowToItemFields,
  rowToLabel,
} from "@/lib/boards/mappers";
import type { CellValue } from "@/lib/cells/cell-value";
import { comparePositions } from "@/lib/ordering/position";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import type { BoardRole, ColumnSettings, ColumnType } from "@/lib/types";
import { isUuid } from "@/lib/validation";

export interface BoardColumn {
  id: string;
  title: string;
  type: ColumnType;
  position: string;
  settings: ColumnSettings;
}

export interface BoardLabel {
  id: string;
  columnId: string;
  title: string;
  color: string;
  position: string;
  isDone: boolean;
  isNotApplicable: boolean;
  points: number | null;
  progress: number;
}

export interface BoardItem {
  id: string;
  name: string;
  position: string;
  /** Cell values keyed by column id (JSONB shapes from cell-value.ts). */
  cells: Record<string, CellValue>;
}

export interface BoardGroupData {
  id: string;
  name: string;
  color: string | null;
  position: string;
  items: BoardItem[];
}

export interface BoardPerson {
  id: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface BoardFunction {
  id: string;
  name: string;
  position: string;
}

export interface BoardMemberInfo {
  userId: string;
  role: BoardRole;
  functionIds: string[];
}

export interface BoardData {
  id: string;
  workspaceId: string;
  name: string;
  archivedAt: string | null;
  columns: BoardColumn[];
  labelsById: Record<string, BoardLabel>;
  groups: BoardGroupData[];
  /** People referenced by cells, board members and workspace members. */
  peopleById: Record<string, BoardPerson>;
  functions: BoardFunction[];
  members: BoardMemberInfo[];
  /** Candidates for the person picker and «legg til medlem» (workspace scope). */
  workspaceMemberIds: string[];
  myUserId: string;
  /** Effective role — mirrors private.board_access; used for UI gating only. */
  myRole: BoardRole | null;
  /** Site- or workspace-admin: may reopen an archived board (FR5). */
  canReopen: boolean;
  /** The signed-in user's production functions on this board (column focus). */
  userFunctionIds: string[];
}

/** Everything the board view needs; null when the board does not exist or the
 *  user has no access (RLS returns zero rows either way). */
export async function getBoardData(boardId: string): Promise<BoardData | null> {
  // A malformed id would otherwise surface as a Postgres cast error; treat it
  // as "no such board" before touching the database.
  if (!isUuid(boardId)) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // The board row first: the rest keys on board_id, and workspace_members
  // needs the board's workspace_id.
  const boardRes = await supabase
    .from("boards")
    .select("id, workspace_id, name, archived_at")
    .eq("id", boardId)
    .is("deleted_at", null)
    .maybeSingle();
  if (boardRes.error) {
    throw new Error(`Kunne ikke hente kurset: ${boardRes.error.message}`);
  }
  if (!boardRes.data) return null;
  const board = boardRes.data;

  const [
    profileRes,
    groupsRes,
    columnsRes,
    labelsRes,
    itemsRes,
    cellsRes,
    functionsRes,
    boardMembersRes,
    memberFunctionsRes,
    workspaceMembersRes,
    profilesRes,
  ] = await Promise.all([
    supabase.from("profiles").select("is_site_admin").eq("id", user.id).maybeSingle(),
    supabase
      .from("groups")
      .select("id, name, color, position")
      .eq("board_id", boardId)
      .is("deleted_at", null),
    supabase
      .from("columns")
      .select("id, title, type, position, settings")
      .eq("board_id", boardId)
      .is("deleted_at", null),
    supabase
      .from("column_labels")
      .select(
        "id, column_id, title, color, position, is_done, is_not_applicable, points, progress",
      )
      .eq("board_id", boardId),
    // items and cell_values grow with course size (100+ videos × columns) and
    // must page past PostgREST's silent 1000-row cap.
    fetchAll((from, to) =>
      supabase
        .from("items")
        .select("id, group_id, name, position")
        .eq("board_id", boardId)
        .is("deleted_at", null)
        .order("id")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("cell_values")
        .select("item_id, column_id, value")
        .eq("board_id", boardId)
        .order("item_id")
        .order("column_id")
        .range(from, to),
    ),
    supabase
      .from("board_functions")
      .select("id, name, position")
      .eq("board_id", boardId)
      .is("deleted_at", null),
    supabase.from("board_members").select("user_id, role").eq("board_id", boardId),
    supabase
      .from("board_member_functions")
      .select("user_id, function_id")
      .eq("board_id", boardId),
    supabase
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", board.workspace_id),
    supabase.from("profiles").select("id, full_name, email, avatar_url"),
  ]);

  const firstError =
    profileRes.error ??
    groupsRes.error ??
    columnsRes.error ??
    labelsRes.error ??
    itemsRes.error ??
    cellsRes.error ??
    functionsRes.error ??
    boardMembersRes.error ??
    memberFunctionsRes.error ??
    workspaceMembersRes.error ??
    profilesRes.error;
  if (firstError) throw new Error(`Kunne ikke hente kurset: ${firstError.message}`);

  const cellsByItem = new Map<string, Record<string, CellValue>>();
  for (const cell of cellsRes.data ?? []) {
    const forItem = cellsByItem.get(cell.item_id) ?? {};
    forItem[cell.column_id] = (cell.value ?? {}) as CellValue;
    cellsByItem.set(cell.item_id, forItem);
  }

  // Sort every positioned list in code: fractional-index keys need byte-order
  // comparison, which `order by position` only gives under C collation.
  const groups: BoardGroupData[] = (groupsRes.data ?? [])
    .slice()
    .sort((a, b) => comparePositions(a.position, b.position))
    .map((g) => ({ ...rowToGroupFields(g), items: [] }));
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const sortedItems = (itemsRes.data ?? [])
    .slice()
    .sort((a, b) => comparePositions(a.position, b.position));
  for (const item of sortedItems) {
    groupById.get(item.group_id)?.items.push({
      ...rowToItemFields(item),
      cells: cellsByItem.get(item.id) ?? {},
    });
  }

  const labelsById: Record<string, BoardLabel> = {};
  for (const l of labelsRes.data ?? []) {
    labelsById[l.id] = rowToLabel(l);
  }

  const functionIdsByUser = new Map<string, string[]>();
  for (const mf of memberFunctionsRes.data ?? []) {
    const list = functionIdsByUser.get(mf.user_id) ?? [];
    list.push(mf.function_id);
    functionIdsByUser.set(mf.user_id, list);
  }
  const members: BoardMemberInfo[] = (boardMembersRes.data ?? []).map((m) => ({
    userId: m.user_id,
    role: m.role,
    functionIds: functionIdsByUser.get(m.user_id) ?? [],
  }));

  const workspaceMemberIds = (workspaceMembersRes.data ?? []).map((m) => m.user_id);

  // Ship only the people the view can actually reference.
  const relevantUserIds = new Set<string>(workspaceMemberIds);
  for (const m of members) relevantUserIds.add(m.userId);
  for (const cells of cellsByItem.values()) {
    for (const value of Object.values(cells)) {
      if (typeof value.userId === "string") relevantUserIds.add(value.userId);
    }
  }
  const peopleById: Record<string, BoardPerson> = {};
  for (const p of profilesRes.data ?? []) {
    if (!relevantUserIds.has(p.id)) continue;
    peopleById[p.id] = {
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      avatarUrl: p.avatar_url,
    };
  }

  const isSiteAdmin = profileRes.data?.is_site_admin ?? false;
  const myWorkspaceRole =
    (workspaceMembersRes.data ?? []).find((m) => m.user_id === user.id)?.role ?? null;
  const myBoardRole = members.find((m) => m.userId === user.id)?.role ?? null;

  return {
    id: board.id,
    workspaceId: board.workspace_id,
    name: board.name,
    archivedAt: board.archived_at,
    columns: (columnsRes.data ?? [])
      .slice()
      .sort((a, b) => comparePositions(a.position, b.position))
      .map(rowToColumn),
    labelsById,
    groups,
    peopleById,
    functions: (functionsRes.data ?? [])
      .slice()
      .sort((a, b) => comparePositions(a.position, b.position)),
    members,
    workspaceMemberIds,
    myUserId: user.id,
    myRole: effectiveBoardRole(isSiteAdmin, myWorkspaceRole, myBoardRole),
    canReopen: isSiteAdmin || myWorkspaceRole === "admin",
    userFunctionIds: functionIdsByUser.get(user.id) ?? [],
  };
}
