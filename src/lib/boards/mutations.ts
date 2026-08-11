// Board mutations. createBoardFromTemplate materializes DEFAULT_COURSE_TEMPLATE
// as rows the new board owns (copy-on-create). RLS enforces FR4 (any workspace
// member may create a course) and the on_board_created trigger makes the
// creator board-admin — never done here.

import {
  comparePositions,
  initialPositions,
  positionBetween,
} from "@/lib/ordering/position";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { DEFAULT_COURSE_TEMPLATE } from "@/lib/templates/default-course-template";
import type { ColumnSettings } from "@/lib/types";

/**
 * Creates a course from the default template and returns its id. Inserts run
 * sequentially (board → functions → columns → labels); if a later insert fails
 * the board exists without full content — acceptable for MVP, the user sees
 * the error and can delete the shell (a transactional RPC is a later hardening).
 */
export async function createBoardFromTemplate(
  workspaceId: string,
  name: string,
): Promise<string> {
  const supabase = await createClient();

  // Place the new course last in its workspace. Max is computed in code:
  // fractional-index keys need byte-order comparison, not DB collation order.
  const { data: existing } = await supabase
    .from("boards")
    .select("position")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null);
  const lastPosition =
    (existing ?? [])
      .map((b) => b.position)
      .sort(comparePositions)
      .at(-1) ?? null;

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .insert({
      workspace_id: workspaceId,
      name,
      position: positionBetween(lastPosition, null),
    })
    .select("id")
    .single();
  if (boardError || !board) {
    throw new Error(`Kunne ikke opprette kurset: ${boardError?.message}`);
  }
  const boardId = board.id;

  // Functions first: columns reference them via settings.visibleToFunctions.
  const { functions, columns } = DEFAULT_COURSE_TEMPLATE;
  const functionPositions = initialPositions(functions.length);
  const functionRows = functions.map((f, i) => ({
    id: crypto.randomUUID(),
    board_id: boardId,
    name: f.name,
    position: functionPositions[i],
  }));
  const { error: functionsError } = await supabase
    .from("board_functions")
    .insert(functionRows);
  if (functionsError) {
    throw new Error(`Kunne ikke opprette funksjoner: ${functionsError.message}`);
  }
  const functionIdByKey = new Map(functions.map((f, i) => [f.key, functionRows[i].id]));

  const columnPositions = initialPositions(columns.length);
  const columnRows = columns.map((column, i) => {
    const settings: ColumnSettings = {};
    if (column.visibleToFunctions) {
      settings.visibleToFunctions = column.visibleToFunctions.map((key) => {
        const id = functionIdByKey.get(key);
        if (!id) throw new Error(`Ukjent funksjonsnøkkel i malen: ${key}`);
        return id;
      });
    }
    if (column.role !== undefined) settings.role = column.role;
    if (column.pointWeight !== undefined) settings.pointWeight = column.pointWeight;
    if (column.defaultPointsPerQuestion !== undefined) {
      settings.defaultPointsPerQuestion = column.defaultPointsPerQuestion;
    }
    return {
      id: crypto.randomUUID(),
      board_id: boardId,
      title: column.title,
      type: column.type,
      position: columnPositions[i],
      settings: settings as Json,
    };
  });
  const { error: columnsError } = await supabase.from("columns").insert(columnRows);
  if (columnsError) {
    throw new Error(`Kunne ikke opprette kolonner: ${columnsError.message}`);
  }

  const labelRows = columns.flatMap((column, i) => {
    const labels = column.labels ?? [];
    const labelPositions = initialPositions(labels.length);
    return labels.map((label, j) => ({
      column_id: columnRows[i].id,
      board_id: boardId,
      title: label.title,
      color: label.color,
      position: labelPositions[j],
      is_done: label.isDone ?? false,
      is_not_applicable: label.isNotApplicable ?? false,
      points: label.points ?? null,
      progress: label.progress ?? 0,
    }));
  });
  const { error: labelsError } = await supabase.from("column_labels").insert(labelRows);
  if (labelsError) {
    throw new Error(`Kunne ikke opprette statusverdier: ${labelsError.message}`);
  }

  return boardId;
}
