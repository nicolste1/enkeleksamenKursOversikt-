import { describe, expect, it } from "vitest";

import type {
  BoardData,
  BoardGroupData,
  BoardItem,
  BoardLabel,
} from "@/lib/boards/queries";
import { boardReducer, type BoardState } from "@/lib/boards/reducer";

function makeLabel(id: string, overrides: Partial<BoardLabel> = {}): BoardLabel {
  return {
    id,
    columnId: "col-1",
    title: `Label ${id}`,
    color: "#888888",
    position: "m",
    isDone: false,
    isNotApplicable: false,
    points: null,
    progress: 0,
    ...overrides,
  };
}

function makeItem(id: string, position: string, overrides: Partial<BoardItem> = {}): BoardItem {
  return { id, name: `Item ${id}`, position, cells: {}, ...overrides };
}

function makeGroup(id: string, position: string, items: BoardItem[] = []): BoardGroupData {
  return { id, name: `Group ${id}`, color: null, position, items };
}

function makeData(overrides: Partial<BoardData> = {}): BoardData {
  return {
    id: "board-1",
    workspaceId: "ws-1",
    name: "Testkurs",
    archivedAt: null,
    columns: [
      { id: "col-1", title: "Status", type: "status", position: "a", settings: {} },
    ],
    labelsById: { "label-1": makeLabel("label-1") },
    groups: [
      makeGroup("group-1", "a", [makeItem("item-1", "a"), makeItem("item-2", "b")]),
      makeGroup("group-2", "b", [makeItem("item-3", "a")]),
    ],
    peopleById: {},
    functions: [
      { id: "fn-1", name: "Manus", position: "a" },
      { id: "fn-2", name: "Klipp", position: "b" },
    ],
    members: [
      { userId: "me", role: "medlem", functionIds: ["fn-1"] },
      { userId: "other", role: "medlem", functionIds: ["fn-1", "fn-2"] },
    ],
    workspaceMemberIds: ["me", "other"],
    myUserId: "me",
    myRole: "medlem",
    canReopen: false,
    userFunctionIds: ["fn-1"],
    ...overrides,
  };
}

function makeState(overrides: Partial<BoardState> = {}): BoardState {
  return { ...makeData(), error: null, connection: "live", ...overrides };
}

function findItem(state: BoardState, itemId: string) {
  for (const group of state.groups) {
    const item = group.items.find((i) => i.id === itemId);
    if (item) return { group, item };
  }
  return null;
}

describe("boardReducer", () => {
  describe("reset", () => {
    it("replaces board data but preserves error and connection", () => {
      const state = makeState({ error: "Nettverksfeil", connection: "offline" });
      const fresh = makeData({ name: "Nytt navn" });
      const next = boardReducer(state, { type: "reset", data: fresh });
      expect(next.name).toBe("Nytt navn");
      expect(next.error).toBe("Nettverksfeil");
      expect(next.connection).toBe("offline");
    });
  });

  describe("setConnection", () => {
    it("updates only the connection field", () => {
      const state = makeState();
      const next = boardReducer(state, { type: "setConnection", status: "offline" });
      expect(next.connection).toBe("offline");
      expect(next.groups).toBe(state.groups);
      expect(next.error).toBe(state.error);
    });

    it("returns the SAME state reference when the status is unchanged", () => {
      // supabase-js retries failing joins repeatedly; repeated offline ticks
      // must not re-render the board.
      const state = makeState({ connection: "offline" });
      expect(boardReducer(state, { type: "setConnection", status: "offline" })).toBe(state);
    });
  });

  describe("setCell", () => {
    it("writes the value on the right item and column", () => {
      const state = makeState();
      const next = boardReducer(state, {
        type: "setCell",
        itemId: "item-1",
        columnId: "col-1",
        value: { labelId: "label-1" },
      });
      expect(findItem(next, "item-1")?.item.cells["col-1"]).toEqual({
        labelId: "label-1",
      });
      expect(findItem(next, "item-2")?.item.cells["col-1"]).toBeUndefined();
    });

    it("returns the SAME state reference for an unknown item id", () => {
      // Foreign realtime events (unfiltered DELETE listeners) must not churn
      // renders.
      const state = makeState();
      const next = boardReducer(state, {
        type: "setCell",
        itemId: "missing",
        columnId: "col-1",
        value: { labelId: "label-1" },
      });
      expect(next).toBe(state);
    });

    it("is idempotent — applying the same event twice gives the same result", () => {
      const state = makeState();
      const action = {
        type: "setCell",
        itemId: "item-1",
        columnId: "col-1",
        value: { labelId: "label-1" },
      } as const;
      const once = boardReducer(state, action);
      const twice = boardReducer(once, action);
      expect(twice.groups).toEqual(once.groups);
    });
  });

  describe("remove actions", () => {
    it("removeItem is idempotent", () => {
      const state = makeState();
      const once = boardReducer(state, { type: "removeItem", itemId: "item-1" });
      const twice = boardReducer(once, { type: "removeItem", itemId: "item-1" });
      expect(findItem(once, "item-1")).toBeNull();
      expect(twice.groups).toEqual(once.groups);
    });

    it("removeGroup and removeColumn are idempotent", () => {
      const state = makeState();
      const g1 = boardReducer(state, { type: "removeGroup", groupId: "group-1" });
      const g2 = boardReducer(g1, { type: "removeGroup", groupId: "group-1" });
      expect(g2.groups).toEqual(g1.groups);
      const c1 = boardReducer(state, { type: "removeColumn", columnId: "col-1" });
      const c2 = boardReducer(c1, { type: "removeColumn", columnId: "col-1" });
      expect(c2.columns).toEqual(c1.columns);
    });

    it("removeLabel returns the SAME state reference for an unknown id", () => {
      // The realtime channel listens to label DELETEs without a board filter,
      // so deletes from other boards must not produce a new state object.
      const state = makeState();
      const next = boardReducer(state, { type: "removeLabel", labelId: "foreign" });
      expect(next).toBe(state);
    });

    it("removeLabel removes a known label", () => {
      const state = makeState();
      const next = boardReducer(state, { type: "removeLabel", labelId: "label-1" });
      expect(next.labelsById["label-1"]).toBeUndefined();
    });

    it("removeFunction cascades out of member functionIds and userFunctionIds", () => {
      const state = makeState();
      const next = boardReducer(state, { type: "removeFunction", functionId: "fn-1" });
      expect(next.functions.map((f) => f.id)).toEqual(["fn-2"]);
      expect(next.members.find((m) => m.userId === "other")?.functionIds).toEqual([
        "fn-2",
      ]);
      expect(next.userFunctionIds).toEqual([]);
    });
  });

  describe("upsertItem", () => {
    it("adds a new item position-sorted in the target group", () => {
      const state = makeState();
      const next = boardReducer(state, {
        type: "upsertItem",
        groupId: "group-1",
        item: { id: "item-new", name: "Ny video", position: "aa" },
      });
      expect(next.groups[0].items.map((i) => i.id)).toEqual([
        "item-1",
        "item-new",
        "item-2",
      ]);
      expect(findItem(next, "item-new")?.item.cells).toEqual({});
    });

    it("updates name and position while preserving cells", () => {
      const state = makeState();
      const withCell = boardReducer(state, {
        type: "setCell",
        itemId: "item-1",
        columnId: "col-1",
        value: { labelId: "label-1" },
      });
      const next = boardReducer(withCell, {
        type: "upsertItem",
        groupId: "group-1",
        item: { id: "item-1", name: "Nytt navn", position: "c" },
      });
      const item = findItem(next, "item-1")?.item;
      expect(item?.name).toBe("Nytt navn");
      expect(item?.cells["col-1"]).toEqual({ labelId: "label-1" });
      expect(next.groups[0].items.map((i) => i.id)).toEqual(["item-2", "item-1"]);
    });

    it("moves an item between groups, preserving cells", () => {
      const state = makeState();
      const withCell = boardReducer(state, {
        type: "setCell",
        itemId: "item-1",
        columnId: "col-1",
        value: { labelId: "label-1" },
      });
      const next = boardReducer(withCell, {
        type: "upsertItem",
        groupId: "group-2",
        item: { id: "item-1", name: "Item item-1", position: "z" },
      });
      expect(next.groups[0].items.map((i) => i.id)).toEqual(["item-2"]);
      expect(next.groups[1].items.map((i) => i.id)).toEqual(["item-3", "item-1"]);
      expect(findItem(next, "item-1")?.item.cells["col-1"]).toEqual({
        labelId: "label-1",
      });
    });

    it("is idempotent", () => {
      const state = makeState();
      const action = {
        type: "upsertItem",
        groupId: "group-2",
        item: { id: "item-1", name: "Flyttet", position: "z" },
      } as const;
      const once = boardReducer(state, action);
      const twice = boardReducer(once, action);
      expect(twice.groups).toEqual(once.groups);
    });

    it("drops the item silently when the target group is unknown", () => {
      const state = makeState();
      const next = boardReducer(state, {
        type: "upsertItem",
        groupId: "missing-group",
        item: { id: "item-1", name: "Item item-1", position: "a" },
      });
      expect(findItem(next, "item-1")).toBeNull();
      expect(next.groups).toHaveLength(2);
    });
  });

  describe("upsertGroup", () => {
    it("adds a new group with empty items, position-sorted", () => {
      const state = makeState();
      const next = boardReducer(state, {
        type: "upsertGroup",
        group: { id: "group-new", name: "Ny gruppe", color: null, position: "aa" },
      });
      expect(next.groups.map((g) => g.id)).toEqual(["group-1", "group-new", "group-2"]);
      expect(next.groups[1].items).toEqual([]);
    });

    it("updates an existing group while keeping its items", () => {
      const state = makeState();
      const next = boardReducer(state, {
        type: "upsertGroup",
        group: { id: "group-1", name: "Omdøpt", color: "#ff0000", position: "a" },
      });
      expect(next.groups[0].name).toBe("Omdøpt");
      expect(next.groups[0].color).toBe("#ff0000");
      expect(next.groups[0].items.map((i) => i.id)).toEqual(["item-1", "item-2"]);
    });
  });

  describe("upsertColumn / upsertLabel / upsertFunction", () => {
    it("upsertColumn adds new and replaces existing, position-sorted", () => {
      const state = makeState();
      const added = boardReducer(state, {
        type: "upsertColumn",
        column: { id: "col-2", title: "Ansvarlig", type: "person", position: "0", settings: {} },
      });
      expect(added.columns.map((c) => c.id)).toEqual(["col-2", "col-1"]);
      const replaced = boardReducer(added, {
        type: "upsertColumn",
        column: { id: "col-2", title: "Omdøpt", type: "person", position: "z", settings: {} },
      });
      expect(replaced.columns.map((c) => c.id)).toEqual(["col-1", "col-2"]);
      expect(replaced.columns[1].title).toBe("Omdøpt");
    });

    it("upsertLabel adds and fully replaces a label", () => {
      const state = makeState();
      const label = makeLabel("label-1", { title: "Ferdig", isDone: true, progress: 1 });
      const next = boardReducer(state, { type: "upsertLabel", label });
      expect(next.labelsById["label-1"]).toEqual(label);
      const added = boardReducer(next, {
        type: "upsertLabel",
        label: makeLabel("label-2"),
      });
      expect(Object.keys(added.labelsById)).toHaveLength(2);
    });

    it("upsertFunction adds new and replaces existing, position-sorted", () => {
      const state = makeState();
      const next = boardReducer(state, {
        type: "upsertFunction",
        fn: { id: "fn-1", name: "Manus 2.0", position: "z" },
      });
      expect(next.functions.map((f) => f.id)).toEqual(["fn-2", "fn-1"]);
      expect(next.functions[1].name).toBe("Manus 2.0");
    });
  });

  describe("addMemberFunction / removeMemberFunction", () => {
    it("adds a function to the member and to userFunctionIds for me", () => {
      const state = makeState();
      const next = boardReducer(state, {
        type: "addMemberFunction",
        userId: "me",
        functionId: "fn-2",
      });
      expect(next.members.find((m) => m.userId === "me")?.functionIds).toEqual([
        "fn-1",
        "fn-2",
      ]);
      expect(next.userFunctionIds).toEqual(["fn-1", "fn-2"]);
    });

    it("is idempotent and leaves userFunctionIds alone for other users", () => {
      const state = makeState();
      const action = {
        type: "addMemberFunction",
        userId: "other",
        functionId: "fn-1",
      } as const;
      const next = boardReducer(state, action);
      expect(next.members.find((m) => m.userId === "other")?.functionIds).toEqual([
        "fn-1",
        "fn-2",
      ]);
      expect(next.userFunctionIds).toBe(state.userFunctionIds);
    });

    it("no-ops for an unknown member", () => {
      const state = makeState();
      const next = boardReducer(state, {
        type: "addMemberFunction",
        userId: "stranger",
        functionId: "fn-1",
      });
      expect(next.members).toEqual(state.members);
    });

    it("removeMemberFunction strips the function, idempotently", () => {
      const state = makeState();
      const once = boardReducer(state, {
        type: "removeMemberFunction",
        userId: "me",
        functionId: "fn-1",
      });
      expect(once.members.find((m) => m.userId === "me")?.functionIds).toEqual([]);
      expect(once.userFunctionIds).toEqual([]);
      const twice = boardReducer(once, {
        type: "removeMemberFunction",
        userId: "me",
        functionId: "fn-1",
      });
      expect(twice.members).toEqual(once.members);
    });
  });

  describe("patch actions on unknown ids", () => {
    it("patchItem, patchGroup, patchColumn and patchLabel leave state semantically unchanged", () => {
      const state = makeState();
      expect(
        boardReducer(state, { type: "patchItem", itemId: "missing", patch: { name: "x" } })
          .groups,
      ).toEqual(state.groups);
      expect(
        boardReducer(state, { type: "patchGroup", groupId: "missing", patch: { name: "x" } })
          .groups,
      ).toEqual(state.groups);
      expect(
        boardReducer(state, {
          type: "patchColumn",
          columnId: "missing",
          patch: { title: "x" },
        }).columns,
      ).toEqual(state.columns);
      expect(
        boardReducer(state, { type: "patchLabel", labelId: "missing", patch: { title: "x" } }),
      ).toBe(state);
    });
  });
});
