import { describe, expect, it } from "vitest";

import { eventToAction } from "@/lib/realtime/board-channel";

const itemRow = {
  id: "item-1",
  board_id: "board-1",
  group_id: "group-1",
  name: "Video 1",
  position: "m",
  deleted_at: null,
  created_at: "2026-08-11T10:00:00Z",
  created_by: "me",
  updated_at: "2026-08-11T10:00:00Z",
};

const groupRow = {
  id: "group-1",
  board_id: "board-1",
  chapter_id: null,
  name: "Delkapittel 1",
  color: null,
  position: "m",
  deleted_at: null,
};

const columnRow = {
  id: "col-1",
  board_id: "board-1",
  title: "Status",
  type: "status",
  position: "m",
  settings: { pointWeight: 2 },
  deleted_at: null,
};

const labelRow = {
  id: "label-1",
  board_id: "board-1",
  column_id: "col-1",
  title: "Ferdig",
  color: "#00c875",
  position: "m",
  is_done: true,
  is_not_applicable: false,
  points: 5,
  progress: 1,
};

const functionRow = {
  id: "fn-1",
  board_id: "board-1",
  name: "Manus",
  position: "m",
  deleted_at: null,
};

describe("eventToAction", () => {
  describe("items", () => {
    it("maps INSERT and UPDATE to upsertItem", () => {
      for (const eventType of ["INSERT", "UPDATE"] as const) {
        expect(eventToAction("board-1", "items", eventType, itemRow, {})).toEqual({
          type: "upsertItem",
          groupId: "group-1",
          item: { id: "item-1", name: "Video 1", position: "m" },
        });
      }
    });

    it("maps a soft-deleting UPDATE to removeItem", () => {
      const row = { ...itemRow, deleted_at: "2026-08-11T11:00:00Z" };
      expect(eventToAction("board-1", "items", "UPDATE", row, {})).toEqual({
        type: "removeItem",
        itemId: "item-1",
      });
    });

    it("ignores hard DELETE", () => {
      expect(eventToAction("board-1", "items", "DELETE", {}, { id: "item-1" })).toBeNull();
    });
  });

  describe("groups, columns and board_functions (soft-delete tables)", () => {
    it("maps live rows to upserts with camelCase fields", () => {
      expect(eventToAction("board-1", "groups", "INSERT", groupRow, {})).toEqual({
        type: "upsertGroup",
        group: { id: "group-1", name: "Delkapittel 1", color: null, position: "m" },
      });
      expect(eventToAction("board-1", "columns", "UPDATE", columnRow, {})).toEqual({
        type: "upsertColumn",
        column: {
          id: "col-1",
          title: "Status",
          type: "status",
          position: "m",
          settings: { pointWeight: 2 },
        },
      });
      expect(eventToAction("board-1", "board_functions", "INSERT", functionRow, {})).toEqual({
        type: "upsertFunction",
        fn: { id: "fn-1", name: "Manus", position: "m" },
      });
    });

    it("maps soft-deleted rows to removes and hard DELETEs to null", () => {
      const deletedAt = "2026-08-11T11:00:00Z";
      expect(
        eventToAction("board-1", "groups", "UPDATE", { ...groupRow, deleted_at: deletedAt }, {}),
      ).toEqual({ type: "removeGroup", groupId: "group-1" });
      expect(
        eventToAction("board-1", "columns", "UPDATE", { ...columnRow, deleted_at: deletedAt }, {}),
      ).toEqual({ type: "removeColumn", columnId: "col-1" });
      expect(
        eventToAction("board-1",
          "board_functions",
          "UPDATE",
          { ...functionRow, deleted_at: deletedAt },
          {},
        ),
      ).toEqual({ type: "removeFunction", functionId: "fn-1" });
      expect(eventToAction("board-1", "groups", "DELETE", {}, { id: "group-1" })).toBeNull();
      expect(eventToAction("board-1", "columns", "DELETE", {}, { id: "col-1" })).toBeNull();
      expect(eventToAction("board-1", "board_functions", "DELETE", {}, { id: "fn-1" })).toBeNull();
    });

    it("maps null column settings to an empty object", () => {
      const action = eventToAction("board-1", "columns", "INSERT", { ...columnRow, settings: null }, {});
      expect(action).toEqual(
        expect.objectContaining({
          column: expect.objectContaining({ settings: {} }),
        }),
      );
    });
  });

  describe("column_labels (hard-delete table)", () => {
    it("maps INSERT and UPDATE to upsertLabel with all fields", () => {
      expect(eventToAction("board-1", "column_labels", "INSERT", labelRow, {})).toEqual({
        type: "upsertLabel",
        label: {
          id: "label-1",
          columnId: "col-1",
          title: "Ferdig",
          color: "#00c875",
          position: "m",
          isDone: true,
          isNotApplicable: false,
          points: 5,
          progress: 1,
        },
      });
    });

    it("maps DELETE with an id-only old record to removeLabel", () => {
      expect(eventToAction("board-1", "column_labels", "DELETE", {}, { id: "label-1" })).toEqual({
        type: "removeLabel",
        labelId: "label-1",
      });
    });
  });

  describe("cell_values", () => {
    const cellRow = {
      board_id: "board-1",
      item_id: "item-1",
      column_id: "col-1",
      value: { labelId: "label-1" },
      updated_at: "2026-08-11T10:00:00Z",
      updated_by: "me",
    };

    it("maps INSERT and UPDATE to setCell", () => {
      expect(eventToAction("board-1", "cell_values", "UPDATE", cellRow, {})).toEqual({
        type: "setCell",
        itemId: "item-1",
        columnId: "col-1",
        value: { labelId: "label-1" },
      });
    });

    it("maps a null value to an empty cell", () => {
      expect(
        eventToAction("board-1", "cell_values", "INSERT", { ...cellRow, value: null }, {}),
      ).toEqual({ type: "setCell", itemId: "item-1", columnId: "col-1", value: {} });
    });

    it("maps DELETE (PK-only old record, default replica identity) to an empty cell", () => {
      expect(
        eventToAction("board-1", "cell_values", "DELETE", {}, {
          item_id: "item-1",
          column_id: "col-1",
        }),
      ).toEqual({
        type: "setCell",
        itemId: "item-1",
        columnId: "col-1",
        value: {},
      });
    });
  });

  describe("board_member_functions", () => {
    const row = { board_id: "board-1", user_id: "me", function_id: "fn-1" };

    it("maps INSERT to addMemberFunction and DELETE to removeMemberFunction", () => {
      expect(eventToAction("board-1", "board_member_functions", "INSERT", row, {})).toEqual({
        type: "addMemberFunction",
        userId: "me",
        functionId: "fn-1",
      });
      expect(eventToAction("board-1", "board_member_functions", "DELETE", {}, row)).toEqual({
        type: "removeMemberFunction",
        userId: "me",
        functionId: "fn-1",
      });
    });

    it("ignores UPDATE (pure PK table)", () => {
      expect(eventToAction("board-1", "board_member_functions", "UPDATE", row, row)).toBeNull();
    });
  });

  it("ignores unknown tables", () => {
    expect(eventToAction("board-1", "boards", "UPDATE", { id: "board-1" }, {})).toBeNull();
    expect(eventToAction("board-1", "chapters", "INSERT", { id: "chap-1" }, {})).toBeNull();
    expect(eventToAction("board-1", "board_members", "INSERT", { user_id: "me" }, {})).toBeNull();
  });

  it("ignores events that carry a different board_id", () => {
    // DELETE events bypass RLS and the server-side filter — this guard is
    // the real board scoping for them.
    expect(
      eventToAction("board-1", "items", "UPDATE", { ...itemRow, board_id: "board-2" }, {}),
    ).toBeNull();
    expect(
      eventToAction("board-1", "board_member_functions", "DELETE", {}, {
        board_id: "board-2",
        user_id: "me",
        function_id: "fn-1",
      }),
    ).toBeNull();
  });

  it("ignores malformed or empty payloads", () => {
    expect(eventToAction("board-1", "items", "INSERT", {}, {})).toBeNull();
    expect(eventToAction("board-1", "cell_values", "UPDATE", { value: {} }, {})).toBeNull();
    expect(eventToAction("board-1", "column_labels", "DELETE", {}, {})).toBeNull();
    expect(
      eventToAction("board-1", "board_member_functions", "INSERT", { user_id: "me" }, {}),
    ).toBeNull();
  });

  it("maps an INSERT that already carries deleted_at to a remove", () => {
    const row = { ...itemRow, deleted_at: "2026-08-11T11:00:00Z" };
    expect(eventToAction("board-1", "items", "INSERT", row, {})).toEqual({
      type: "removeItem",
      itemId: "item-1",
    });
  });
});
