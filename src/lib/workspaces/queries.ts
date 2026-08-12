// Course-list data for the home page and sidebar: every workspace the
// signed-in user can see, with its courses and their progress rollup
// (earned vs. estimated points — same earnedPoints() rule as the table).
// All database access lives here (never in components); RLS is the real
// gate — these queries only shape data.

import type { CellValue } from "@/lib/cells/cell-value";
import { comparePositions } from "@/lib/ordering/position";
import { courseProgress, type CourseProgress } from "@/lib/points/course-progress";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import type { ColumnSettings } from "@/lib/types";

export interface CourseSummary {
  id: string;
  name: string;
  archivedAt: string | null;
  progress: CourseProgress;
}

export interface WorkspaceWithCourses {
  id: string;
  name: string;
  /** Site admin or workspace admin — may see archived courses (FR5). */
  isAdmin: boolean;
  courses: CourseSummary[];
  archivedCourses: CourseSummary[];
}

export async function getWorkspacesWithCourses(): Promise<WorkspaceWithCourses[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // RLS scopes every query to boards the user can see. The cell/column/label
  // fetches power the progress rollup; at 30–100 users and a few thousand
  // rows per course this is well within budget (same reasoning as FR3).
  const [
    profileRes,
    workspacesRes,
    membershipsRes,
    boardsRes,
    columnsRes,
    labelsRes,
    itemsRes,
    cellsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("is_site_admin").eq("id", user.id).maybeSingle(),
    supabase.from("workspaces").select("id, name").order("name"),
    supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id),
    supabase
      .from("boards")
      .select("id, workspace_id, name, archived_at, position")
      .is("deleted_at", null),
    // These four span EVERY visible board and grow without bound, so they must
    // page past PostgREST's silent 1000-row cap (stable order() is required
    // for range() paging to neither skip nor duplicate rows).
    fetchAll((from, to) =>
      supabase
        .from("columns")
        .select("id, board_id, settings")
        .is("deleted_at", null)
        .order("id")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from("column_labels").select("id, board_id, progress").order("id").range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("items")
        .select("id, board_id")
        .is("deleted_at", null)
        .order("id")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("cell_values")
        .select("board_id, item_id, column_id, value")
        .order("item_id")
        .order("column_id")
        .range(from, to),
    ),
  ]);
  const firstError =
    profileRes.error ??
    workspacesRes.error ??
    membershipsRes.error ??
    boardsRes.error ??
    columnsRes.error ??
    labelsRes.error ??
    itemsRes.error ??
    cellsRes.error;
  if (firstError) throw new Error(`Kunne ikke hente kurslisten: ${firstError.message}`);

  const isSiteAdmin = profileRes.data?.is_site_admin ?? false;
  const roleByWorkspace = new Map(
    (membershipsRes.data ?? []).map((m) => [m.workspace_id, m.role]),
  );

  // Group the progress ingredients per board.
  const groupBy = <T extends { board_id: string }>(rows: T[] | null) => {
    const map = new Map<string, T[]>();
    for (const row of rows ?? []) {
      const list = map.get(row.board_id) ?? [];
      list.push(row);
      map.set(row.board_id, list);
    }
    return map;
  };
  const columnsByBoard = groupBy(columnsRes.data);
  const labelsByBoard = groupBy(labelsRes.data);
  const itemsByBoard = groupBy(itemsRes.data);
  const cellsByBoard = groupBy(cellsRes.data);

  const progressFor = (boardId: string): CourseProgress =>
    courseProgress({
      columns: (columnsByBoard.get(boardId) ?? []).map((c) => ({
        id: c.id,
        settings: (c.settings ?? {}) as ColumnSettings,
      })),
      labels: labelsByBoard.get(boardId) ?? [],
      itemIds: (itemsByBoard.get(boardId) ?? []).map((i) => i.id),
      cells: (cellsByBoard.get(boardId) ?? []).map((c) => ({
        itemId: c.item_id,
        columnId: c.column_id,
        value: (c.value ?? {}) as CellValue,
      })),
    });

  // Sort in code: fractional-index keys need byte-order comparison, which
  // `order by position` only gives under C collation.
  const sortedBoards = (boardsRes.data ?? [])
    .slice()
    .sort((a, b) => comparePositions(a.position, b.position));

  return (workspacesRes.data ?? []).map((ws) => {
    const boards = sortedBoards.filter((b) => b.workspace_id === ws.id);
    const toSummary = (b: (typeof boards)[number]): CourseSummary => ({
      id: b.id,
      name: b.name,
      archivedAt: b.archived_at,
      progress: progressFor(b.id),
    });
    const role = roleByWorkspace.get(ws.id) ?? null;
    return {
      id: ws.id,
      name: ws.name,
      isAdmin: isSiteAdmin || role === "admin",
      courses: boards.filter((b) => b.archived_at === null).map(toSummary),
      archivedCourses: boards.filter((b) => b.archived_at !== null).map(toSummary),
    };
  });
}
