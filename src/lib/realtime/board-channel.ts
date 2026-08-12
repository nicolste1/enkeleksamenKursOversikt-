// Realtime board sync (M5/F10): one Supabase channel per board translates
// postgres_changes events into the board reducer's own action vocabulary.
// eventToAction is pure so the mapping is unit-tested; subscribeToBoard is a
// thin wrapper around the channel API, verified manually.
//
// Convergence (N3): the server is last-write-wins (rows overwrite, updated_at
// trigger) and events arrive in commit order, so applying EVERY event — echoes
// of our own optimistic writes included — always lands on the server's value.
// Deliberately no echo suppression: dropping our own echo would diverge
// whenever our write committed BEFORE someone else's (the echo is what
// restores the server truth on top of their earlier value).

import {
  rowToColumn,
  rowToFunction,
  rowToGroupFields,
  rowToItemFields,
  rowToLabel,
} from "@/lib/boards/mappers";
import type { BoardAction } from "@/lib/boards/reducer";
import type { CellValue } from "@/lib/cells/cell-value";
import type { BrowserClient } from "@/lib/supabase/client";

export type ChangeType = "INSERT" | "UPDATE" | "DELETE";

/** Loosely-typed event row: realtime payloads are unvalidated JSON, and
 *  DELETE old-records may carry only the primary key columns. */
type Row = Record<string, unknown>;

/** Tables the channel subscribes to. `boards`, `board_members` and `profiles`
 *  are not in the publication (archive/member/profile changes do not stream);
 *  `chapters` is published but has no client-side representation. */
const REALTIME_TABLES = [
  "groups",
  "columns",
  "column_labels",
  "items",
  "cell_values",
  "board_functions",
  "board_member_functions",
] as const;

const isString = (v: unknown): v is string => typeof v === "string";

/** Pure mapping: one Postgres change → one reducer action, or null to ignore.
 *  Soft-deleted rows (deleted_at set) map to remove actions; the hard DELETE
 *  that follows a purge is ignored for soft-delete tables. Rows from other
 *  boards and malformed/errored payloads map to null: DELETE events bypass
 *  both RLS and (for default replica identity) the server-side filter, so the
 *  boardId check here is the real scoping for them. */
export function eventToAction(
  boardId: string,
  table: string,
  eventType: ChangeType,
  newRow: Row,
  oldRow: Row,
): BoardAction | null {
  const rowBoardId = newRow.board_id ?? oldRow.board_id;
  if (isString(rowBoardId) && rowBoardId !== boardId) return null;
  switch (table) {
    case "items": {
      if (eventType === "DELETE") return null;
      if (!isString(newRow.id)) return null;
      if (newRow.deleted_at != null) return { type: "removeItem", itemId: newRow.id };
      if (!isString(newRow.group_id)) return null;
      return {
        type: "upsertItem",
        groupId: newRow.group_id,
        item: rowToItemFields(newRow as { id: string; name: string; position: string }),
      };
    }
    case "groups": {
      if (eventType === "DELETE") return null;
      if (!isString(newRow.id)) return null;
      if (newRow.deleted_at != null) return { type: "removeGroup", groupId: newRow.id };
      return {
        type: "upsertGroup",
        group: rowToGroupFields(
          newRow as { id: string; name: string; color: string | null; position: string },
        ),
      };
    }
    case "columns": {
      if (eventType === "DELETE") return null;
      if (!isString(newRow.id)) return null;
      if (newRow.deleted_at != null) return { type: "removeColumn", columnId: newRow.id };
      return {
        type: "upsertColumn",
        column: rowToColumn(newRow as Parameters<typeof rowToColumn>[0]),
      };
    }
    case "board_functions": {
      if (eventType === "DELETE") return null;
      if (!isString(newRow.id)) return null;
      if (newRow.deleted_at != null)
        return { type: "removeFunction", functionId: newRow.id };
      return {
        type: "upsertFunction",
        fn: rowToFunction(newRow as { id: string; name: string; position: string }),
      };
    }
    case "column_labels": {
      // Labels hard-delete. The DELETE old-record carries only the PK id —
      // no board_id — so foreign deletes reach the reducer, which no-ops on
      // unknown label ids without allocating new state.
      if (eventType === "DELETE") {
        if (!isString(oldRow.id)) return null;
        return { type: "removeLabel", labelId: oldRow.id };
      }
      if (!isString(newRow.id)) return null;
      return {
        type: "upsertLabel",
        label: rowToLabel(newRow as Parameters<typeof rowToLabel>[0]),
      };
    }
    case "cell_values": {
      // Cells are only ever upserted by the app; hard deletes happen solely
      // via cascade purges. With default replica identity the DELETE
      // old-record still carries the PK (item_id, column_id), so clear the
      // cell if such an event arrives.
      const row = eventType === "DELETE" ? oldRow : newRow;
      if (!isString(row.item_id) || !isString(row.column_id)) return null;
      return {
        type: "setCell",
        itemId: row.item_id,
        columnId: row.column_id,
        value: eventType === "DELETE" ? {} : ((newRow.value ?? {}) as CellValue),
      };
    }
    case "board_member_functions": {
      // Pure PK rows (board_id, user_id, function_id): row-level assign and
      // unassign of a single production function. UPDATE cannot happen. The
      // DELETE old-record is the full PK, so the boardId guard above scopes it.
      if (eventType === "UPDATE") return null;
      const row = eventType === "DELETE" ? oldRow : newRow;
      if (!isString(row.user_id) || !isString(row.function_id)) return null;
      return {
        type: eventType === "DELETE" ? "removeMemberFunction" : "addMemberFunction",
        userId: row.user_id,
        functionId: row.function_id,
      };
    }
    default:
      return null;
  }
}

export type ChannelStatus = "live" | "offline";

export interface SubscribeOptions {
  supabase: BrowserClient;
  boardId: string;
  onAction: (action: BoardAction) => void;
  onStatus: (status: ChannelStatus) => void;
}

/** Subscribes one channel with listeners for all board content tables.
 *  supabase-js re-joins automatically after connection loss; every status
 *  change flows through onStatus. Returns an unsubscribe function. */
export function subscribeToBoard({
  supabase,
  boardId,
  onAction,
  onStatus,
}: SubscribeOptions): () => void {
  const handle = (payload: {
    table: string;
    eventType: ChangeType;
    new: Row;
    old: Row;
  }) => {
    const action = eventToAction(
      boardId,
      payload.table,
      payload.eventType,
      payload.new,
      payload.old,
    );
    if (action) onAction(action);
  };

  let channel = supabase.channel(`board:${boardId}`);
  const filter = `board_id=eq.${boardId}`;
  for (const table of REALTIME_TABLES) {
    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter },
      handle,
    );
  }
  // DELETE events are only server-side filterable with replica identity full,
  // which we deliberately avoid (full old rows would broadcast past RLS —
  // Realtime never policy-checks DELETEs). Listen unfiltered for the two
  // hard-delete tables instead; eventToAction scopes by board_id when the
  // old-record carries it, and the reducer no-ops on foreign label ids.
  for (const table of ["column_labels", "board_member_functions"] as const) {
    channel = channel.on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table },
      handle,
    );
  }

  channel.subscribe((status) => {
    onStatus(status === "SUBSCRIBED" ? "live" : "offline");
  });

  return () => {
    void supabase.removeChannel(channel);
  };
}
