// Column and label mutations — client-callable. Ids come from the caller so
// optimistic state and DB rows agree. Column deletes are soft (deleted_at);
// label deletes are hard — a dangling labelId in a cell renders as empty.

import type { BrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import type { ColumnSettings, ColumnType } from "@/lib/types";

export interface NewLabelRow {
  id: string;
  columnId: string;
  title: string;
  color: string;
  position: string;
  isDone?: boolean;
  isNotApplicable?: boolean;
  points?: number | null;
  progress?: number;
}

function toLabelInsert(boardId: string, label: NewLabelRow) {
  return {
    id: label.id,
    column_id: label.columnId,
    board_id: boardId,
    title: label.title,
    color: label.color,
    position: label.position,
    is_done: label.isDone ?? false,
    is_not_applicable: label.isNotApplicable ?? false,
    points: label.points ?? null,
    progress: label.progress ?? 0,
  };
}

export async function insertColumn(
  supabase: BrowserClient,
  params: {
    id: string;
    boardId: string;
    title: string;
    type: ColumnType;
    position: string;
    settings: ColumnSettings;
    labels?: NewLabelRow[];
  },
): Promise<void> {
  const { error } = await supabase.from("columns").insert({
    id: params.id,
    board_id: params.boardId,
    title: params.title,
    type: params.type,
    position: params.position,
    settings: params.settings as Json,
  });
  if (error) throw new Error(`Kunne ikke opprette kolonnen: ${error.message}`);

  if (params.labels && params.labels.length > 0) {
    const { error: labelError } = await supabase
      .from("column_labels")
      .insert(params.labels.map((l) => toLabelInsert(params.boardId, l)));
    if (labelError) {
      throw new Error(`Kunne ikke opprette statusverdiene: ${labelError.message}`);
    }
  }
}

export async function renameColumn(
  supabase: BrowserClient,
  params: { boardId: string; columnId: string; title: string },
): Promise<void> {
  const { error } = await supabase
    .from("columns")
    .update({ title: params.title })
    .eq("id", params.columnId)
    .eq("board_id", params.boardId);
  if (error) throw new Error(`Kunne ikke endre kolonnenavnet: ${error.message}`);
}

export async function moveColumn(
  supabase: BrowserClient,
  params: { boardId: string; columnId: string; position: string },
): Promise<void> {
  const { error } = await supabase
    .from("columns")
    .update({ position: params.position })
    .eq("id", params.columnId)
    .eq("board_id", params.boardId);
  if (error) throw new Error(`Kunne ikke flytte kolonnen: ${error.message}`);
}

/** Writes the full settings object (the store owns the merge). */
export async function updateColumnSettings(
  supabase: BrowserClient,
  params: { boardId: string; columnId: string; settings: ColumnSettings },
): Promise<void> {
  const { error } = await supabase
    .from("columns")
    .update({ settings: params.settings as Json })
    .eq("id", params.columnId)
    .eq("board_id", params.boardId);
  if (error) throw new Error(`Kunne ikke lagre kolonneinnstillingene: ${error.message}`);
}

export async function softDeleteColumn(
  supabase: BrowserClient,
  params: { boardId: string; columnId: string },
): Promise<void> {
  const { error } = await supabase
    .from("columns")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.columnId)
    .eq("board_id", params.boardId);
  if (error) throw new Error(`Kunne ikke slette kolonnen: ${error.message}`);
}

export async function insertLabel(
  supabase: BrowserClient,
  params: { boardId: string; label: NewLabelRow },
): Promise<void> {
  const { error } = await supabase
    .from("column_labels")
    .insert(toLabelInsert(params.boardId, params.label));
  if (error) throw new Error(`Kunne ikke opprette labelen: ${error.message}`);
}

export async function updateLabel(
  supabase: BrowserClient,
  params: {
    boardId: string;
    labelId: string;
    patch: { title?: string; color?: string; points?: number | null };
  },
): Promise<void> {
  const { error } = await supabase
    .from("column_labels")
    .update(params.patch)
    .eq("id", params.labelId)
    .eq("board_id", params.boardId);
  if (error) throw new Error(`Kunne ikke oppdatere labelen: ${error.message}`);
}

export async function deleteLabel(
  supabase: BrowserClient,
  params: { boardId: string; labelId: string },
): Promise<void> {
  const { error } = await supabase
    .from("column_labels")
    .delete()
    .eq("id", params.labelId)
    .eq("board_id", params.boardId);
  if (error) throw new Error(`Kunne ikke slette labelen: ${error.message}`);
}
