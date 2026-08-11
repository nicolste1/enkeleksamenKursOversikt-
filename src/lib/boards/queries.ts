// Read model for the board table view. getBoardData fetches everything the
// table needs in parallel queries keyed on board_id (RLS enforces access;
// soft-deleted rows are filtered here) and reshapes DB rows into camelCase
// domain objects the components consume.

import type { CellValue } from "@/lib/cells/cell-value";
import { comparePositions } from "@/lib/ordering/position";
import { createClient } from "@/lib/supabase/server";
import type { ColumnSettings, ColumnType } from "@/lib/types";
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
  /** Cell values keyed by column id (JSONB shapes from cell-value.ts). */
  cells: Record<string, CellValue>;
}

export interface BoardGroupData {
  id: string;
  name: string;
  color: string | null;
  items: BoardItem[];
}

export interface BoardPerson {
  id: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface BoardData {
  id: string;
  name: string;
  archivedAt: string | null;
  columns: BoardColumn[];
  labelsById: Record<string, BoardLabel>;
  groups: BoardGroupData[];
  /** Only the people referenced by person cells — not the whole directory. */
  peopleById: Record<string, BoardPerson>;
  /** The signed-in user's production functions on this board (column focus). */
  userFunctionIds: string[];
}

/** Everything the read-only table needs; null when the board does not exist
 *  or the user has no access (RLS returns zero rows either way). */
export async function getBoardData(boardId: string): Promise<BoardData | null> {
  // A malformed id would otherwise surface as a Postgres cast error; treat it
  // as "no such board" before touching the database.
  if (!isUuid(boardId)) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    boardRes,
    groupsRes,
    columnsRes,
    labelsRes,
    itemsRes,
    cellsRes,
    userFunctionsRes,
    profilesRes,
  ] = await Promise.all([
    supabase
      .from("boards")
      .select("id, name, archived_at")
      .eq("id", boardId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("groups")
      .select("id, name, color, position")
      .eq("board_id", boardId)
      .is("deleted_at", null)
      .order("position"),
    supabase
      .from("columns")
      .select("id, title, type, position, settings")
      .eq("board_id", boardId)
      .is("deleted_at", null)
      .order("position"),
    supabase
      .from("column_labels")
      .select(
        "id, column_id, title, color, position, is_done, is_not_applicable, points, progress",
      )
      .eq("board_id", boardId)
      .order("position"),
    supabase
      .from("items")
      .select("id, group_id, name, position")
      .eq("board_id", boardId)
      .is("deleted_at", null)
      .order("position"),
    supabase
      .from("cell_values")
      .select("item_id, column_id, value")
      .eq("board_id", boardId),
    supabase
      .from("board_member_functions")
      .select("function_id")
      .eq("board_id", boardId)
      .eq("user_id", user.id),
    supabase.from("profiles").select("id, full_name, email, avatar_url"),
  ]);

  // Real errors must surface as errors, not as a 404 — check them before
  // interpreting "no board row" as missing/no access.
  const firstError =
    boardRes.error ??
    groupsRes.error ??
    columnsRes.error ??
    labelsRes.error ??
    itemsRes.error ??
    cellsRes.error ??
    userFunctionsRes.error ??
    profilesRes.error;
  if (firstError) throw new Error(`Kunne ikke hente kurset: ${firstError.message}`);
  if (!boardRes.data) return null;

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
    .map((g) => ({
      id: g.id,
      name: g.name,
      color: g.color,
      items: [],
    }));
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const sortedItems = (itemsRes.data ?? [])
    .slice()
    .sort((a, b) => comparePositions(a.position, b.position));
  for (const item of sortedItems) {
    groupById.get(item.group_id)?.items.push({
      id: item.id,
      name: item.name,
      cells: cellsByItem.get(item.id) ?? {},
    });
  }

  const labelsById: Record<string, BoardLabel> = {};
  for (const l of labelsRes.data ?? []) {
    labelsById[l.id] = {
      id: l.id,
      columnId: l.column_id,
      title: l.title,
      color: l.color,
      position: l.position,
      isDone: l.is_done,
      isNotApplicable: l.is_not_applicable,
      points: l.points,
      progress: l.progress,
    };
  }

  // Ship only the people the table actually references, not the directory.
  const referencedUserIds = new Set<string>();
  for (const cells of cellsByItem.values()) {
    for (const value of Object.values(cells)) {
      if (typeof value.userId === "string") referencedUserIds.add(value.userId);
    }
  }
  const peopleById: Record<string, BoardPerson> = {};
  for (const p of profilesRes.data ?? []) {
    if (!referencedUserIds.has(p.id)) continue;
    peopleById[p.id] = {
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      avatarUrl: p.avatar_url,
    };
  }

  return {
    id: boardRes.data.id,
    name: boardRes.data.name,
    archivedAt: boardRes.data.archived_at,
    columns: (columnsRes.data ?? [])
      .slice()
      .sort((a, b) => comparePositions(a.position, b.position))
      .map((c) => ({
        id: c.id,
        title: c.title,
        type: c.type,
        position: c.position,
        settings: (c.settings ?? {}) as ColumnSettings,
      })),
    labelsById,
    groups,
    peopleById,
    userFunctionIds: (userFunctionsRes.data ?? []).map((f) => f.function_id),
  };
}
