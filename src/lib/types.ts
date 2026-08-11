// Shared domain types mirroring the database schema. Full generated row types
// live in src/lib/supabase/database.types.ts (added in the auth milestone); this
// file holds the hand-written domain shapes used by business logic and the UI.

export type WorkspaceRole = "admin" | "medlem";
export type BoardRole = "admin" | "medlem" | "leser";

export type ColumnType =
  | "status"
  | "person"
  | "date"
  | "text"
  | "number"
  | "link"
  | "label";

/**
 * Semantic role a column plays in the points model (FR1–FR2). Stored in data,
 * not inferred from the Norwegian title, since users can rename columns (F7).
 * questionCount/questionRate drive the per-question estimate used for
 * «Repetisjonsoppgaver» (FR1): estimate = question count × rate per question.
 */
export type ColumnRole =
  | "contentType"
  | "estimate"
  | "earned"
  | "step"
  | "questionCount"
  | "questionRate";

/** Board-level column configuration stored in columns.settings (JSONB). */
export interface ColumnSettings {
  /** Function ids that may see this column. Empty/absent = visible to everyone. */
  visibleToFunctions?: string[];
  /** Role in the points model; absent for ordinary columns. */
  role?: ColumnRole;
  /** Share of a video's estimated points earned by completing this step (FR2). */
  pointWeight?: number;
  /** questionRate columns: rate per question when no label is set (FR1). */
  defaultPointsPerQuestion?: number;
}
