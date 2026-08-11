"use client";

// Client-side board state with optimistic mutations (M4). Every edit is
// applied to local state first, then persisted through the client-callable
// lib mutations; on failure the store shows an error and re-syncs from the
// server (router.refresh() → fresh `initial` prop → render-phase reset).
// RLS is the real gate — can()/readOnly here are UI affordances only.
// The M5 realtime channel will feed the same reducer.

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";

import { can, type BoardCapability } from "@/lib/access/roles";
import type {
  BoardColumn,
  BoardData,
  BoardGroupData,
  BoardItem,
  BoardLabel,
  BoardMemberInfo,
} from "@/lib/boards/queries";
import { archiveBoard, reopenBoard } from "@/lib/boards/archive";
import { isValidValue, type CellValue } from "@/lib/cells/cell-value";
import { upsertCellValue } from "@/lib/cells/mutations";
import * as columnsMutations from "@/lib/columns/mutations";
import * as functionsMutations from "@/lib/functions/mutations";
import * as groupsMutations from "@/lib/groups/mutations";
import * as itemsMutations from "@/lib/items/mutations";
import * as membersMutations from "@/lib/members/mutations";
import {
  comparePositions,
  initialPositions,
  positionBetween,
} from "@/lib/ordering/position";
import { autoEstimateUpdate, ESTIMATE_INPUT_ROLES } from "@/lib/points/auto-estimate";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_STATUS_LABELS } from "@/lib/templates/default-course-template";
import type { BoardRole, ColumnSettings, ColumnType } from "@/lib/types";

interface BoardState extends BoardData {
  error: string | null;
}

type Action =
  | { type: "reset"; data: BoardData }
  | { type: "error"; message: string }
  | { type: "clearError" }
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
  | { type: "setArchived"; archivedAt: string | null };

const byPosition = <T extends { position: string }>(list: T[]): T[] =>
  list.slice().sort((a, b) => comparePositions(a.position, b.position));

function mapItems(
  groups: BoardGroupData[],
  itemId: string,
  map: (item: BoardItem) => BoardItem | null,
): BoardGroupData[] {
  return groups.map((group) => {
    if (!group.items.some((i) => i.id === itemId)) return group;
    const items = group.items
      .map((i) => (i.id === itemId ? map(i) : i))
      .filter((i): i is BoardItem => i !== null);
    return { ...group, items: byPosition(items) };
  });
}

function reducer(state: BoardState, action: Action): BoardState {
  switch (action.type) {
    case "reset":
      return { ...action.data, error: state.error };
    case "error":
      return { ...state, error: action.message };
    case "clearError":
      return { ...state, error: null };
    case "setCell":
      return {
        ...state,
        groups: mapItems(state.groups, action.itemId, (item) => ({
          ...item,
          cells: { ...item.cells, [action.columnId]: action.value },
        })),
      };
    case "addItem":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId
            ? { ...g, items: byPosition([...g.items, action.item]) }
            : g,
        ),
      };
    case "patchItem":
      return {
        ...state,
        groups: mapItems(state.groups, action.itemId, (item) => ({
          ...item,
          ...action.patch,
        })),
      };
    case "removeItem":
      return {
        ...state,
        groups: mapItems(state.groups, action.itemId, () => null),
      };
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
  }
}

export interface BoardStore {
  state: BoardState;
  /** Archived boards render read-only regardless of role (FR5). */
  readOnly: boolean;
  allows: (capability: BoardCapability) => boolean;
  clearError: () => void;

  setCell: (itemId: string, column: BoardColumn, value: CellValue) => void;
  addItem: (groupId: string, name: string) => void;
  renameItem: (itemId: string, name: string) => void;
  moveItem: (itemId: string, direction: -1 | 1) => void;
  deleteItem: (itemId: string) => void;

  addGroup: (name: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  moveGroup: (groupId: string, direction: -1 | 1) => void;
  deleteGroup: (groupId: string) => void;

  addColumn: (type: ColumnType, title: string) => void;
  renameColumn: (columnId: string, title: string) => void;
  moveColumn: (columnId: string, direction: -1 | 1, visibleColumnIds?: string[]) => void;
  deleteColumn: (columnId: string) => void;
  setColumnVisibility: (columnId: string, functionIds: string[]) => void;
  setPointWeight: (columnId: string, weight: number) => void;

  addLabel: (columnId: string, title: string, color: string) => void;
  updateLabel: (
    labelId: string,
    patch: { title?: string; color?: string; points?: number | null },
  ) => void;
  deleteLabel: (labelId: string) => void;

  addFunction: (name: string) => void;
  renameFunction: (functionId: string, name: string) => void;
  deleteFunction: (functionId: string) => void;
  assignFunction: (userId: string, functionId: string) => void;
  unassignFunction: (userId: string, functionId: string) => void;

  addMember: (userId: string, role: BoardRole) => void;
  setMemberRole: (userId: string, role: BoardRole) => void;
  removeMember: (userId: string) => void;

  archive: () => void;
  reopen: () => void;
}

const BoardContext = createContext<BoardStore | null>(null);

export function BoardProvider({
  initial,
  children,
}: {
  initial: BoardData;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, { ...initial, error: null });
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // Render-phase reset (React's "adjusting state during render" pattern):
  // router.refresh() delivers a fresh `initial` after errors/navigation, and
  // the reducer state must follow the server truth.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    dispatch({ type: "reset", data: initial });
  }

  const store = useMemo<BoardStore>(() => {
    const boardId = initial.id;

    return buildStore();

    function buildStore(): BoardStore {
      return {
        state,
        readOnly: state.archivedAt !== null,
        allows: (capability) =>
          state.archivedAt === null && can(state.myRole, capability),
        clearError: () => dispatch({ type: "clearError" }),
        setCell,
        addItem,
        renameItem,
        moveItem,
        deleteItem,
        addGroup,
        renameGroup,
        moveGroup,
        deleteGroup,
        addColumn,
        renameColumn,
        moveColumn,
        deleteColumn,
        setColumnVisibility,
        setPointWeight,
        addLabel,
        updateLabel,
        deleteLabel,
        addFunction,
        renameFunction,
        deleteFunction,
        assignFunction,
        unassignFunction,
        addMember,
        setMemberRole,
        removeMember,
        archive,
        reopen,
      };
    }

    /** Optimistic dispatch + persisted mutation; on failure show + re-sync. */
    function run(optimistic: Action | null, mutate: () => Promise<void>) {
      if (optimistic) dispatch(optimistic);
      void mutate().catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Noe gikk galt ved lagring.";
        dispatch({ type: "error", message });
        router.refresh(); // re-sync local state with the server truth
      });
    }

    /** positionBetween throws on corrupt/duplicate neighbor keys; route that
     *  through the normal error path instead of dying in the event handler. */
    function nextPosition(before: string | null, after: string | null): string | null {
      try {
        return positionBetween(before, after);
      } catch {
        dispatch({
          type: "error",
          message: "Rekkefølgen er i utakt med serveren — visningen lastes på nytt.",
        });
        router.refresh();
        return null;
      }
    }

    function findItem(itemId: string): { group: BoardGroupData; item: BoardItem } | null {
      for (const group of state.groups) {
        const item = group.items.find((i) => i.id === itemId);
        if (item) return { group, item };
      }
      return null;
    }

    function setCell(itemId: string, column: BoardColumn, value: CellValue) {
      if (!can(state.myRole, "editItems") || state.archivedAt !== null) return;
      if (!isValidValue(column.type, value)) return;
      run({ type: "setCell", itemId, columnId: column.id, value }, () =>
        upsertCellValue(supabase, {
          boardId,
          itemId,
          columnId: column.id,
          value,
          userId: state.myUserId,
        }),
      );

      // FR1: content type / question inputs re-derive «Arbeid» unless the
      // user owns the value (manual flag). Clearing the estimate itself
      // (a write without the manual flag) hands it back to the automation.
      const role = column.settings.role;
      const recalculates =
        role !== undefined &&
        (ESTIMATE_INPUT_ROLES.has(role) ||
          (role === "estimate" && value.manual !== true));
      if (!recalculates) return;
      const located = findItem(itemId);
      if (!located) return;
      const nextCells = { ...located.item.cells, [column.id]: value };
      const update = autoEstimateUpdate({
        columns: state.columns,
        labelsById: state.labelsById,
        cells: nextCells,
      });
      if (!update) return;
      run({ type: "setCell", itemId, columnId: update.columnId, value: update.value }, () =>
        upsertCellValue(supabase, {
          boardId,
          itemId,
          columnId: update.columnId,
          value: update.value,
          userId: state.myUserId,
        }),
      );
    }

    function addItem(groupId: string, name: string) {
      if (!can(state.myRole, "editItems") || state.archivedAt !== null) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const group = state.groups.find((g) => g.id === groupId);
      if (!group) return;
      const last = group.items.at(-1)?.position ?? null;
      const item: BoardItem = {
        id: crypto.randomUUID(),
        name: trimmed,
        position: positionBetween(last, null),
        cells: {},
      };
      run({ type: "addItem", groupId, item }, () =>
        itemsMutations.insertItem(supabase, {
          id: item.id,
          boardId,
          groupId,
          name: item.name,
          position: item.position,
          userId: state.myUserId,
        }),
      );
    }

    function renameItem(itemId: string, name: string) {
      if (!can(state.myRole, "editItems") || state.archivedAt !== null) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      run({ type: "patchItem", itemId, patch: { name: trimmed } }, () =>
        itemsMutations.renameItem(supabase, { boardId, itemId, name: trimmed }),
      );
    }

    function moveItem(itemId: string, direction: -1 | 1) {
      if (!can(state.myRole, "editItems") || state.archivedAt !== null) return;
      const located = findItem(itemId);
      if (!located) return;
      const { group } = located;
      const index = group.items.findIndex((i) => i.id === itemId);
      const target = index + direction;
      if (target < 0 || target >= group.items.length) return;
      const neighbors =
        direction === -1
          ? [group.items[target - 1]?.position ?? null, group.items[target].position]
          : [group.items[target].position, group.items[target + 1]?.position ?? null];
      const position = nextPosition(neighbors[0], neighbors[1]);
      if (position === null) return;
      run({ type: "patchItem", itemId, patch: { position } }, () =>
        itemsMutations.moveItem(supabase, { boardId, itemId, position }),
      );
    }

    function deleteItem(itemId: string) {
      if (!can(state.myRole, "editItems") || state.archivedAt !== null) return;
      run({ type: "removeItem", itemId }, () =>
        itemsMutations.softDeleteItem(supabase, { boardId, itemId }),
      );
    }

    function addGroup(name: string) {
      if (!can(state.myRole, "editItems") || state.archivedAt !== null) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const group: BoardGroupData = {
        id: crypto.randomUUID(),
        name: trimmed,
        color: null,
        position: positionBetween(state.groups.at(-1)?.position ?? null, null),
        items: [],
      };
      run({ type: "addGroup", group }, () =>
        groupsMutations.insertGroup(supabase, {
          id: group.id,
          boardId,
          name: group.name,
          position: group.position,
        }),
      );
    }

    function renameGroup(groupId: string, name: string) {
      if (!can(state.myRole, "editItems") || state.archivedAt !== null) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      run({ type: "patchGroup", groupId, patch: { name: trimmed } }, () =>
        groupsMutations.renameGroup(supabase, { boardId, groupId, name: trimmed }),
      );
    }

    function moveGroup(groupId: string, direction: -1 | 1) {
      if (!can(state.myRole, "editItems") || state.archivedAt !== null) return;
      const index = state.groups.findIndex((g) => g.id === groupId);
      if (index === -1) return;
      const target = index + direction;
      if (target < 0 || target >= state.groups.length) return;
      const neighbors =
        direction === -1
          ? [state.groups[target - 1]?.position ?? null, state.groups[target].position]
          : [state.groups[target].position, state.groups[target + 1]?.position ?? null];
      const position = nextPosition(neighbors[0], neighbors[1]);
      if (position === null) return;
      run({ type: "patchGroup", groupId, patch: { position } }, () =>
        groupsMutations.moveGroup(supabase, { boardId, groupId, position }),
      );
    }

    function deleteGroup(groupId: string) {
      if (!can(state.myRole, "editItems") || state.archivedAt !== null) return;
      run({ type: "removeGroup", groupId }, () =>
        groupsMutations.softDeleteGroup(supabase, { boardId, groupId }),
      );
    }

    function addColumn(type: ColumnType, title: string) {
      if (!can(state.myRole, "manageColumns") || state.archivedAt !== null) return;
      const trimmed = title.trim();
      if (!trimmed) return;
      const columnId = crypto.randomUUID();
      // New status columns start with the six standard values (F6).
      const seedLabels = type === "status" ? DEFAULT_STATUS_LABELS : [];
      const labelPositions = initialPositions(seedLabels.length);
      const labels: BoardLabel[] = seedLabels.map((l, i) => ({
        id: crypto.randomUUID(),
        columnId,
        title: l.title,
        color: l.color,
        position: labelPositions[i],
        isDone: l.isDone ?? false,
        isNotApplicable: l.isNotApplicable ?? false,
        points: l.points ?? null,
        progress: l.progress ?? 0,
      }));
      const column: BoardColumn = {
        id: columnId,
        title: trimmed,
        type,
        position: positionBetween(state.columns.at(-1)?.position ?? null, null),
        settings: {},
      };
      run({ type: "addColumn", column, labels }, () =>
        columnsMutations.insertColumn(supabase, {
          id: column.id,
          boardId,
          title: column.title,
          type,
          position: column.position,
          settings: column.settings,
          labels: labels.map((l) => ({ ...l, columnId })),
        }),
      );
    }

    function renameColumn(columnId: string, title: string) {
      if (!can(state.myRole, "manageColumns") || state.archivedAt !== null) return;
      const trimmed = title.trim();
      if (!trimmed) return;
      run({ type: "patchColumn", columnId, patch: { title: trimmed } }, () =>
        columnsMutations.renameColumn(supabase, { boardId, columnId, title: trimmed }),
      );
    }

    function moveColumn(
      columnId: string,
      direction: -1 | 1,
      visibleColumnIds?: string[],
    ) {
      if (!can(state.myRole, "manageColumns") || state.archivedAt !== null) return;
      const full = state.columns;
      const index = full.findIndex((c) => c.id === columnId);
      if (index === -1) return;
      // The header shows a filtered list («mine kolonner»): move relative to
      // the nearest VISIBLE neighbor so the action never looks like a no-op.
      const visible = visibleColumnIds ? new Set(visibleColumnIds) : null;
      let anchor = -1;
      for (let i = index + direction; i >= 0 && i < full.length; i += direction) {
        if (!visible || visible.has(full[i].id)) {
          anchor = i;
          break;
        }
      }
      if (anchor === -1) return;
      const position =
        direction === -1
          ? nextPosition(full[anchor - 1]?.position ?? null, full[anchor].position)
          : nextPosition(full[anchor].position, full[anchor + 1]?.position ?? null);
      if (position === null) return;
      run({ type: "patchColumn", columnId, patch: { position } }, () =>
        columnsMutations.moveColumn(supabase, { boardId, columnId, position }),
      );
    }

    function deleteColumn(columnId: string) {
      if (!can(state.myRole, "manageColumns") || state.archivedAt !== null) return;
      run({ type: "removeColumn", columnId }, () =>
        columnsMutations.softDeleteColumn(supabase, { boardId, columnId }),
      );
    }

    function patchSettings(columnId: string, patch: Partial<ColumnSettings>) {
      const column = state.columns.find((c) => c.id === columnId);
      if (!column) return;
      const settings: ColumnSettings = { ...column.settings, ...patch };
      // Drop cleared keys so "visible to everyone" stays the absent-key form.
      for (const key of Object.keys(settings) as (keyof ColumnSettings)[]) {
        if (settings[key] === undefined) delete settings[key];
      }
      run({ type: "patchColumn", columnId, patch: { settings } }, () =>
        columnsMutations.updateColumnSettings(supabase, { boardId, columnId, settings }),
      );
    }

    function setColumnVisibility(columnId: string, functionIds: string[]) {
      if (!can(state.myRole, "manageColumns") || state.archivedAt !== null) return;
      patchSettings(columnId, {
        visibleToFunctions: functionIds.length > 0 ? functionIds : undefined,
      });
    }

    function setPointWeight(columnId: string, weight: number) {
      if (!can(state.myRole, "manageColumns") || state.archivedAt !== null) return;
      if (!Number.isFinite(weight) || weight < 0) return;
      patchSettings(columnId, { pointWeight: weight });
    }

    function addLabel(columnId: string, title: string, color: string) {
      if (!can(state.myRole, "manageColumns") || state.archivedAt !== null) return;
      const trimmed = title.trim();
      if (!trimmed) return;
      const siblings = Object.values(state.labelsById)
        .filter((l) => l.columnId === columnId)
        .sort((a, b) => comparePositions(a.position, b.position));
      const label: BoardLabel = {
        id: crypto.randomUUID(),
        columnId,
        title: trimmed,
        color,
        position: positionBetween(siblings.at(-1)?.position ?? null, null),
        isDone: false,
        isNotApplicable: false,
        points: null,
        progress: 0,
      };
      run({ type: "addLabel", label }, () =>
        columnsMutations.insertLabel(supabase, { boardId, label: { ...label } }),
      );
    }

    function updateLabel(
      labelId: string,
      patch: { title?: string; color?: string; points?: number | null },
    ) {
      if (!can(state.myRole, "manageColumns") || state.archivedAt !== null) return;
      run({ type: "patchLabel", labelId, patch }, () =>
        columnsMutations.updateLabel(supabase, { boardId, labelId, patch }),
      );
    }

    function deleteLabel(labelId: string) {
      if (!can(state.myRole, "manageColumns") || state.archivedAt !== null) return;
      run({ type: "removeLabel", labelId }, () =>
        columnsMutations.deleteLabel(supabase, { boardId, labelId }),
      );
    }

    function addFunction(name: string) {
      if (!can(state.myRole, "manageMembers") || state.archivedAt !== null) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const fn = {
        id: crypto.randomUUID(),
        name: trimmed,
        position: positionBetween(state.functions.at(-1)?.position ?? null, null),
      };
      run({ type: "addFunction", fn }, () =>
        functionsMutations.insertFunction(supabase, {
          id: fn.id,
          boardId,
          name: fn.name,
          position: fn.position,
        }),
      );
    }

    function renameFunction(functionId: string, name: string) {
      if (!can(state.myRole, "manageMembers") || state.archivedAt !== null) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      run({ type: "patchFunction", functionId, patch: { name: trimmed } }, () =>
        functionsMutations.renameFunction(supabase, {
          boardId,
          functionId,
          name: trimmed,
        }),
      );
    }

    function deleteFunction(functionId: string) {
      if (!can(state.myRole, "manageMembers") || state.archivedAt !== null) return;
      run({ type: "removeFunction", functionId }, () =>
        functionsMutations.softDeleteFunction(supabase, { boardId, functionId }),
      );
      // Strip the id from column visibility so no column ends up restricted
      // to a function that no longer exists (hidden for everyone by default).
      for (const column of state.columns) {
        const restrictedTo = column.settings.visibleToFunctions;
        if (!restrictedTo?.includes(functionId)) continue;
        const remaining = restrictedTo.filter((id) => id !== functionId);
        patchSettings(column.id, {
          visibleToFunctions: remaining.length > 0 ? remaining : undefined,
        });
      }
    }

    function assignFunction(userId: string, functionId: string) {
      if (!can(state.myRole, "manageMembers") || state.archivedAt !== null) return;
      const member = state.members.find((m) => m.userId === userId);
      if (!member || member.functionIds.includes(functionId)) return;
      run(
        {
          type: "setMemberFunctions",
          userId,
          functionIds: [...member.functionIds, functionId],
        },
        () => functionsMutations.assignFunction(supabase, { boardId, userId, functionId }),
      );
    }

    function unassignFunction(userId: string, functionId: string) {
      if (!can(state.myRole, "manageMembers") || state.archivedAt !== null) return;
      const member = state.members.find((m) => m.userId === userId);
      if (!member) return;
      run(
        {
          type: "setMemberFunctions",
          userId,
          functionIds: member.functionIds.filter((id) => id !== functionId),
        },
        () =>
          functionsMutations.unassignFunction(supabase, { boardId, userId, functionId }),
      );
    }

    function addMember(userId: string, role: BoardRole) {
      if (!can(state.myRole, "manageMembers") || state.archivedAt !== null) return;
      if (state.members.some((m) => m.userId === userId)) return;
      run({ type: "setMember", member: { userId, role, functionIds: [] } }, () =>
        membersMutations.addBoardMember(supabase, { boardId, userId, role }),
      );
    }

    function setMemberRole(userId: string, role: BoardRole) {
      if (!can(state.myRole, "manageMembers") || state.archivedAt !== null) return;
      const member = state.members.find((m) => m.userId === userId);
      if (!member) return;
      run({ type: "setMember", member: { ...member, role } }, () =>
        membersMutations.updateBoardMemberRole(supabase, { boardId, userId, role }),
      );
    }

    function removeMember(userId: string) {
      if (!can(state.myRole, "manageMembers") || state.archivedAt !== null) return;
      run({ type: "removeMember", userId }, () =>
        membersMutations.removeBoardMember(supabase, { boardId, userId }),
      );
    }

    function archive() {
      if (!can(state.myRole, "manageBoard") || state.archivedAt !== null) return;
      run({ type: "setArchived", archivedAt: new Date().toISOString() }, () =>
        archiveBoard(supabase, boardId),
      );
    }

    function reopen() {
      // Reopening is deliberately privileged (FR5): site-/workspace-admin only.
      if (!state.canReopen || state.archivedAt === null) return;
      run({ type: "setArchived", archivedAt: null }, () =>
        reopenBoard(supabase, boardId),
      );
    }
  }, [state, supabase, router, initial.id]);

  return <BoardContext.Provider value={store}>{children}</BoardContext.Provider>;
}

export function useBoard(): BoardStore {
  const store = useContext(BoardContext);
  if (!store) throw new Error("useBoard must be used inside a BoardProvider");
  return store;
}
