// «Mine leksjoner» read model (F13/FR9): lessons across EVERY course the user
// can access where Redigeringsansvarlig = me, pre-filtered on «Klar til
// redigering» = «Ja» — the editing work queue keys on who edits, not the
// general «Ansvarlig». No board filter in any query — RLS is the gate (same
// pattern as getWorkspacesWithCourses). Archived courses are excluded: this
// is a work queue, not an archive. No realtime in v1 (one channel per board —
// a cross-course page must not subscribe to N courses).

// Type-only: the points-context shape lives with its view adapters.
import type { PointsContext } from "@/components/board/board-points";
import { visibleColumns } from "@/lib/access/column-visibility";
import { rowToColumn, rowToLabel } from "@/lib/boards/mappers";
import type {
  BoardColumn,
  BoardItem,
  BoardLabel,
  BoardPerson,
} from "@/lib/boards/queries";
import type { CellValue } from "@/lib/cells/cell-value";
import { matchesFilter, type FilterContext } from "@/lib/filters/evaluate";
import { buildMyLessonsDefinition, isJaLabelTitle } from "@/lib/filters/my-lessons";
import { comparePositions } from "@/lib/ordering/position";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";

export interface MyLessonRow {
  item: BoardItem;
  groupName: string;
}

export interface MyLessonsBoardSection {
  boardId: string;
  boardName: string;
  /** The same focused column set the user sees on the board itself. */
  columns: BoardColumn[];
  labelsById: Record<string, BoardLabel>;
  peopleById: Record<string, BoardPerson>;
  pointsContext: PointsContext;
  /** Matching lessons in board order (group position, then item position). */
  rows: MyLessonRow[];
}

export async function getMyLessons(): Promise<MyLessonsBoardSection[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Boards first: archived courses are excluded (work queue, not archive), and
  // on a mature workspace most rows belong to them — the .in()-filters below
  // are a pure perf measure so we never page through their content. RLS is
  // still the gate; the ids only narrow what we ask for.
  const boardsRes = await supabase
    .from("boards")
    .select("id, name, archived_at, position")
    .is("deleted_at", null)
    .is("archived_at", null);
  if (boardsRes.error) {
    throw new Error(`Kunne ikke hente Mine leksjoner: ${boardsRes.error.message}`);
  }
  const activeBoardIds = (boardsRes.data ?? []).map((b) => b.id);
  if (activeBoardIds.length === 0) return [];

  const [columnsRes, labelsRes, groupsRes, itemsRes, cellsRes, profilesRes, myFunctionsRes] =
    await Promise.all([
      // These span EVERY active board and grow without bound — they MUST page
      // past PostgREST's silent 1000-row cap, with a stable order() so range()
      // paging neither skips nor duplicates rows.
      fetchAll((from, to) =>
        supabase
          .from("columns")
          .select("id, board_id, title, type, position, settings")
          .in("board_id", activeBoardIds)
          .is("deleted_at", null)
          .order("id")
          .range(from, to),
      ),
      fetchAll((from, to) =>
        supabase
          .from("column_labels")
          .select(
            "id, board_id, column_id, title, color, position, is_done, is_not_applicable, points, progress",
          )
          .in("board_id", activeBoardIds)
          .order("id")
          .range(from, to),
      ),
      fetchAll((from, to) =>
        supabase
          .from("groups")
          .select("id, board_id, name, position")
          .in("board_id", activeBoardIds)
          .is("deleted_at", null)
          .order("id")
          .range(from, to),
      ),
      fetchAll((from, to) =>
        supabase
          .from("items")
          .select("id, board_id, group_id, name, position")
          .in("board_id", activeBoardIds)
          .is("deleted_at", null)
          .order("id")
          .range(from, to),
      ),
      fetchAll((from, to) =>
        supabase
          .from("cell_values")
          .select("board_id, item_id, column_id, value")
          .in("board_id", activeBoardIds)
          .order("item_id")
          .order("column_id")
          .range(from, to),
      ),
      supabase.from("profiles").select("id, full_name, email, avatar_url"),
      supabase
        .from("board_member_functions")
        .select("board_id, function_id")
        .eq("user_id", user.id),
    ]);
  const firstError =
    columnsRes.error ??
    labelsRes.error ??
    groupsRes.error ??
    itemsRes.error ??
    cellsRes.error ??
    profilesRes.error ??
    myFunctionsRes.error;
  if (firstError) {
    throw new Error(`Kunne ikke hente Mine leksjoner: ${firstError.message}`);
  }

  const peopleById: Record<string, BoardPerson> = Object.fromEntries(
    (profilesRes.data ?? []).map((p) => [
      p.id,
      { id: p.id, fullName: p.full_name, email: p.email, avatarUrl: p.avatar_url },
    ]),
  );

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
  const groupsByBoard = groupBy(groupsRes.data);
  const itemsByBoard = groupBy(itemsRes.data);
  const cellsByBoard = groupBy(cellsRes.data);
  const functionsByBoard = new Map<string, string[]>();
  for (const row of myFunctionsRes.data ?? []) {
    const list = functionsByBoard.get(row.board_id) ?? [];
    list.push(row.function_id);
    functionsByBoard.set(row.board_id, list);
  }

  const sections: MyLessonsBoardSection[] = [];
  const sortedBoards = (boardsRes.data ?? [])
    .slice()
    .sort((a, b) => comparePositions(a.position, b.position));

  for (const board of sortedBoards) {
    const columns = (columnsByBoard.get(board.id) ?? [])
      .map(rowToColumn)
      .sort((a, b) => comparePositions(a.position, b.position));
    const editResponsible = columns.find(
      (c) => c.settings.role === "editResponsible",
    );
    // No «Redigeringsansvarlig» column (deleted/renamed without the role):
    // the board has no editing queue — skip it rather than guessing on titles.
    if (!editResponsible) continue;

    const labels = (labelsByBoard.get(board.id) ?? []).map(rowToLabel);
    const labelsById = Object.fromEntries(labels.map((l) => [l.id, l]));
    const ready = columns.find((c) => c.settings.role === "readyForEdit") ?? null;
    const jaLabelIds = ready
      ? labels
          .filter((l) => l.columnId === ready.id && isJaLabelTitle(l.title))
          .map((l) => l.id)
      : [];

    const definition = buildMyLessonsDefinition({
      personColumnId: editResponsible.id,
      readyColumnId: ready?.id ?? null,
      jaLabelIds,
      myUserId: user.id,
    });
    const context: FilterContext = {
      columnTypeById: Object.fromEntries(columns.map((c) => [c.id, c.type])),
    };

    // Rebuild each item's cells map, evaluate the shared filter, and keep
    // board order: groups by position, then items by position within each.
    const cellsByItem = new Map<string, Record<string, CellValue>>();
    for (const cell of cellsByBoard.get(board.id) ?? []) {
      const cells = cellsByItem.get(cell.item_id) ?? {};
      cells[cell.column_id] = (cell.value ?? {}) as CellValue;
      cellsByItem.set(cell.item_id, cells);
    }

    const groups = (groupsByBoard.get(board.id) ?? [])
      .slice()
      .sort((a, b) => comparePositions(a.position, b.position));
    const boardItems = itemsByBoard.get(board.id) ?? [];
    const itemsByGroup = new Map<string, typeof boardItems>();
    for (const item of boardItems) {
      const list = itemsByGroup.get(item.group_id) ?? [];
      list.push(item);
      itemsByGroup.set(item.group_id, list);
    }

    const rows: MyLessonRow[] = [];
    for (const group of groups) {
      const groupItems = (itemsByGroup.get(group.id) ?? [])
        .slice()
        .sort((a, b) => comparePositions(a.position, b.position));
      for (const item of groupItems) {
        const cells = cellsByItem.get(item.id) ?? {};
        if (!matchesFilter(definition, cells, context)) continue;
        rows.push({
          item: { id: item.id, name: item.name, position: item.position, cells },
          groupName: group.name,
        });
      }
    }
    if (rows.length === 0) continue;

    const pointsContext: PointsContext = {
      stepColumns: columns
        .filter((c) => c.settings.role === "step")
        .map((c) => ({ id: c.id, settings: c.settings })),
      labelProgressById: Object.fromEntries(
        labels.map((l) => [l.id, { progress: l.progress }]),
      ),
      estimateColumnId:
        columns.find((c) => c.settings.role === "estimate")?.id ?? null,
    };

    // Same focus rule as BoardTable: without functions there is nothing to
    // focus on — show everything (else function-restricted columns like
    // «Klar til redigering» vanish for exactly the people filtering on them).
    const myFunctionIds = functionsByBoard.get(board.id) ?? [];
    sections.push({
      boardId: board.id,
      boardName: board.name,
      columns: visibleColumns(columns, myFunctionIds, myFunctionIds.length === 0),
      labelsById,
      peopleById,
      pointsContext,
      rows,
    });
  }

  return sections;
}
