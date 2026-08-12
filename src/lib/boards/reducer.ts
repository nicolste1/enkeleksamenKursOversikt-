// Pure board reducer, extracted from the board store so it can be unit-tested
// and shared by the realtime channel (M5). Optimistic mutations and remote
// events dispatch the same actions; every handler is idempotent so echoes of
// our own writes are harmless.
//
// NOTE: imports from queries.ts MUST stay type-only — that module pulls in the
// server-side Supabase client (next/headers), which cannot load in vitest.

import { comparePositions } from "@/lib/ordering/position";
import type {
  BoardColumn,
  BoardData,
  BoardGroupData,
  BoardItem,
  BoardLabel,
  BoardMemberInfo,
} from "@/lib/boards/queries";
import type { CellValue } from "@/lib/cells/cell-value";

export type ConnectionStatus = "connecting" | "live" | "offline";

export interface BoardState extends BoardData {
  error: string | null;
  /** Realtime channel health (M5); "connecting" until the first SUBSCRIBED. */
  connection: ConnectionStatus;
}

export type BoardAction =
  | { type: "reset"; data: BoardData }
  | { type: "error"; message: string }
  | { type: "clearError" }
  | { type: "setConnection"; status: ConnectionStatus }
  | { type: "setCell"; itemId: string; columnId: string; value: CellValue }
  | { type: "addItem"; groupId: string; item: BoardItem }
  | { type: "patchItem"; itemId: string; patch: Partial<Pick<BoardItem, "name" | "position">> }
  | { type: "removeItem"; itemId: string }
  | { type: "addGroup"; group: BoardGroupData }
  | { type: "patchGroup"; groupId: string; patch: Partial<Pick<BoardGroupData, "name" | "position">> }
  | { type: "removeGroup"; groupId: string }
  | { type: "addColumn"; column: BoardColumn; labels: BoardLabel[] }
  | { type: "patchColumn"; columnId: string; patch: Partial<Pick<BoardColumn, "title" | "position" | "settings">> }
  | { type: "removeColumn"; columnId: string }
  | { type: "addLabel"; label: BoardLabel }
  | { type: "patchLabel"; labelId: string; patch: Partial<Pick<BoardLabel, "title" | "color" | "points">> }
  | { type: "removeLabel"; labelId: string }
  | { type: "addFunction"; fn: BoardData["functions"][number] }
  | { type: "patchFunction"; functionId: string; patch: { name?: string } }
  | { type: "removeFunction"; functionId: string }
  | { type: "setMember"; member: BoardMemberInfo }
  | { type: "removeMember"; userId: string }
  | { type: "setMemberFunctions"; userId: string; functionIds: string[] }
  | { type: "setArchived"; archivedAt: string | null }
  // Remote-only actions (M5): realtime INSERT and UPDATE payloads look the
  // same, so the channel dispatches insert-or-replace actions. The optimistic
  // paths keep using the add/patch actions above.
  | { type: "upsertItem"; groupId: string; item: Pick<BoardItem, "id" | "name" | "position"> }
  | { type: "upsertGroup"; group: Omit<BoardGroupData, "items"> }
  | { type: "upsertColumn"; column: BoardColumn }
  | { type: "upsertLabel"; label: BoardLabel }
  | { type: "upsertFunction"; fn: BoardData["functions"][number] }
  | { type: "addMemberFunction"; userId: string; functionId: string }
  | { type: "removeMemberFunction"; userId: string; functionId: string };

const byPosition = <T extends { position: string }>(list: T[]): T[] =>
  list.slice().sort((a, b) => comparePositions(a.position, b.position));

function mapItems(
  groups: BoardGroupData[],
  itemId: string,
  map: (item: BoardItem) => BoardItem | null,
): BoardGroupData[] {
  // Same-reference no-op on unknown items: realtime delivers some events
  // unfiltered (DELETE payloads may lack board_id), so foreign ids must not
  // churn renders.
  if (!groups.some((g) => g.items.some((i) => i.id === itemId))) return groups;
  return groups.map((group) => {
    if (!group.items.some((i) => i.id === itemId)) return group;
    const items = group.items
      .map((i) => (i.id === itemId ? map(i) : i))
      .filter((i): i is BoardItem => i !== null);
    return { ...group, items: byPosition(items) };
  });
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "reset":
      return { ...action.data, error: state.error, connection: state.connection };
    case "error":
      return { ...state, error: action.message };
    case "clearError":
      return { ...state, error: null };
    case "setConnection":
      if (state.connection === action.status) return state;
      return { ...state, connection: action.status };
    case "setCell": {
      const groups = mapItems(state.groups, action.itemId, (item) => ({
        ...item,
        cells: { ...item.cells, [action.columnId]: action.value },
      }));
      return groups === state.groups ? state : { ...state, groups };
    }
    case "addItem":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId
            ? { ...g, items: byPosition([...g.items, action.item]) }
            : g,
        ),
      };
    case "patchItem": {
      const groups = mapItems(state.groups, action.itemId, (item) => ({
        ...item,
        ...action.patch,
      }));
      return groups === state.groups ? state : { ...state, groups };
    }
    case "removeItem": {
      const groups = mapItems(state.groups, action.itemId, () => null);
      return groups === state.groups ? state : { ...state, groups };
    }
    case "addGroup":
      return { ...state, groups: byPosition([...state.groups, action.group]) };
    case "patchGroup":
      return {
        ...state,
        groups: byPosition(
          state.groups.map((g) =>
            g.id === action.groupId ? { ...g, ...action.patch } : g,
          ),
        ),
      };
    case "removeGroup":
      return { ...state, groups: state.groups.filter((g) => g.id !== action.groupId) };
    case "addColumn": {
      const labelsById = { ...state.labelsById };
      for (const label of action.labels) labelsById[label.id] = label;
      return {
        ...state,
        columns: byPosition([...state.columns, action.column]),
        labelsById,
      };
    }
    case "patchColumn":
      return {
        ...state,
        columns: byPosition(
          state.columns.map((c) =>
            c.id === action.columnId ? { ...c, ...action.patch } : c,
          ),
        ),
      };
    case "removeColumn":
      return {
        ...state,
        columns: state.columns.filter((c) => c.id !== action.columnId),
      };
    case "addLabel":
      return {
        ...state,
        labelsById: { ...state.labelsById, [action.label.id]: action.label },
      };
    case "patchLabel": {
      const existing = state.labelsById[action.labelId];
      if (!existing) return state;
      return {
        ...state,
        labelsById: {
          ...state.labelsById,
          [action.labelId]: { ...existing, ...action.patch },
        },
      };
    }
    case "removeLabel": {
      // Same-reference no-op on unknown ids: the realtime channel listens to
      // label DELETEs unfiltered (payload lacks board_id), so deletes from
      // other boards land here and must not churn renders.
      if (!(action.labelId in state.labelsById)) return state;
      const labelsById = { ...state.labelsById };
      delete labelsById[action.labelId];
      return { ...state, labelsById };
    }
    case "addFunction":
      return { ...state, functions: byPosition([...state.functions, action.fn]) };
    case "patchFunction":
      return {
        ...state,
        functions: state.functions.map((f) =>
          f.id === action.functionId ? { ...f, ...action.patch } : f,
        ),
      };
    case "removeFunction":
      return {
        ...state,
        functions: state.functions.filter((f) => f.id !== action.functionId),
        members: state.members.map((m) => ({
          ...m,
          functionIds: m.functionIds.filter((id) => id !== action.functionId),
        })),
        userFunctionIds: state.userFunctionIds.filter(
          (id) => id !== action.functionId,
        ),
      };
    case "setMember": {
      const exists = state.members.some((m) => m.userId === action.member.userId);
      return {
        ...state,
        members: exists
          ? state.members.map((m) =>
              m.userId === action.member.userId ? { ...m, ...action.member } : m,
            )
          : [...state.members, action.member],
      };
    }
    case "removeMember":
      return {
        ...state,
        members: state.members.filter((m) => m.userId !== action.userId),
      };
    case "setMemberFunctions":
      return {
        ...state,
        members: state.members.map((m) =>
          m.userId === action.userId ? { ...m, functionIds: action.functionIds } : m,
        ),
        userFunctionIds:
          action.userId === state.myUserId ? action.functionIds : state.userFunctionIds,
      };
    case "setArchived":
      return { ...state, archivedAt: action.archivedAt };
    case "upsertItem": {
      // Events carry item fields but never cells — keep the cells from
      // wherever the item currently lives. Removing from every group before
      // inserting makes cross-group moves and repeated echoes both work.
      let cells: BoardItem["cells"] = {};
      for (const group of state.groups) {
        const existing = group.items.find((i) => i.id === action.item.id);
        if (existing) {
          cells = existing.cells;
          break;
        }
      }
      return {
        ...state,
        groups: state.groups.map((group) => {
          const without = group.items.filter((i) => i.id !== action.item.id);
          if (group.id !== action.groupId) {
            return without.length === group.items.length
              ? group
              : { ...group, items: without };
          }
          return { ...group, items: byPosition([...without, { ...action.item, cells }]) };
          // Unknown target group: the item is dropped silently — the group's
          // own event precedes it in commit order, and the reconnect refresh
          // heals the rare remaining gap.
        }),
      };
    }
    case "upsertGroup": {
      const exists = state.groups.some((g) => g.id === action.group.id);
      return {
        ...state,
        groups: byPosition(
          exists
            ? state.groups.map((g) =>
                g.id === action.group.id ? { ...g, ...action.group } : g,
              )
            : [...state.groups, { ...action.group, items: [] }],
        ),
      };
    }
    case "upsertColumn":
      return {
        ...state,
        columns: byPosition([
          ...state.columns.filter((c) => c.id !== action.column.id),
          action.column,
        ]),
      };
    case "upsertLabel":
      return {
        ...state,
        labelsById: { ...state.labelsById, [action.label.id]: action.label },
      };
    case "upsertFunction":
      return {
        ...state,
        functions: byPosition([
          ...state.functions.filter((f) => f.id !== action.fn.id),
          action.fn,
        ]),
      };
    case "addMemberFunction":
      return {
        ...state,
        // Unknown member: no-op — board_members is not in the realtime
        // publication, so a brand-new member appears on next full fetch.
        members: state.members.map((m) =>
          m.userId === action.userId && !m.functionIds.includes(action.functionId)
            ? { ...m, functionIds: [...m.functionIds, action.functionId] }
            : m,
        ),
        userFunctionIds:
          action.userId === state.myUserId &&
          !state.userFunctionIds.includes(action.functionId)
            ? [...state.userFunctionIds, action.functionId]
            : state.userFunctionIds,
      };
    case "removeMemberFunction":
      return {
        ...state,
        members: state.members.map((m) =>
          m.userId === action.userId
            ? { ...m, functionIds: m.functionIds.filter((id) => id !== action.functionId) }
            : m,
        ),
        userFunctionIds:
          action.userId === state.myUserId
            ? state.userFunctionIds.filter((id) => id !== action.functionId)
            : state.userFunctionIds,
      };
  }
}
