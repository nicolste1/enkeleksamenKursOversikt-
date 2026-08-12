// Single-row snake_case → camelCase mappers for board domain objects, shared
// by the read model (queries.ts) and the realtime channel, so the mapping
// lives in exactly one place. Input types are structural: both Postgres query
// rows and realtime event payloads fit.

import type {
  BoardColumn,
  BoardFunction,
  BoardGroupData,
  BoardItem,
  BoardLabel,
} from "@/lib/boards/queries";
import type { ColumnSettings, ColumnType } from "@/lib/types";

export function rowToColumn(row: {
  id: string;
  title: string;
  type: ColumnType;
  position: string;
  settings: unknown;
}): BoardColumn {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    position: row.position,
    settings: (row.settings ?? {}) as ColumnSettings,
  };
}

export function rowToLabel(row: {
  id: string;
  column_id: string;
  title: string;
  color: string;
  position: string;
  is_done: boolean;
  is_not_applicable: boolean;
  points: number | null;
  progress: number;
}): BoardLabel {
  return {
    id: row.id,
    columnId: row.column_id,
    title: row.title,
    color: row.color,
    position: row.position,
    isDone: row.is_done,
    isNotApplicable: row.is_not_applicable,
    points: row.points,
    progress: row.progress,
  };
}

export function rowToGroupFields(row: {
  id: string;
  name: string;
  color: string | null;
  position: string;
}): Omit<BoardGroupData, "items"> {
  return { id: row.id, name: row.name, color: row.color, position: row.position };
}

export function rowToFunction(row: {
  id: string;
  name: string;
  position: string;
}): BoardFunction {
  return { id: row.id, name: row.name, position: row.position };
}

export function rowToItemFields(row: {
  id: string;
  name: string;
  position: string;
}): Pick<BoardItem, "id" | "name" | "position"> {
  return { id: row.id, name: row.name, position: row.position };
}
