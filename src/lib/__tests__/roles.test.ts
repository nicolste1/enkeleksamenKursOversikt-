import { describe, expect, it } from "vitest";

import { can, effectiveBoardRole } from "@/lib/access/roles";
import type { BoardRole, WorkspaceRole } from "@/lib/types";

describe("effectiveBoardRole", () => {
  it("site admin always resolves to admin, regardless of other roles", () => {
    expect(effectiveBoardRole(true, null, null)).toBe("admin");
    expect(effectiveBoardRole(true, "medlem", "leser")).toBe("admin");
  });

  it("workspace admin resolves to admin even without board membership", () => {
    expect(effectiveBoardRole(false, "admin", null)).toBe("admin");
  });

  it("falls back to the explicit board role", () => {
    const cases: [WorkspaceRole | null, BoardRole | null, BoardRole | null][] = [
      [null, "admin", "admin"],
      [null, "medlem", "medlem"],
      [null, "leser", "leser"],
      ["medlem", "leser", "leser"],
      [null, null, null],
      ["medlem", null, null],
    ];
    for (const [ws, board, expected] of cases) {
      expect(effectiveBoardRole(false, ws, board)).toBe(expected);
    }
  });
});

describe("can", () => {
  it("no role can do nothing", () => {
    expect(can(null, "viewBoard")).toBe(false);
  });

  it("leser may only view", () => {
    expect(can("leser", "viewBoard")).toBe(true);
    expect(can("leser", "editItems")).toBe(false);
    expect(can("leser", "manageColumns")).toBe(false);
  });

  it("medlem edits items and columns but not members or board settings", () => {
    expect(can("medlem", "editItems")).toBe(true);
    expect(can("medlem", "manageColumns")).toBe(true);
    expect(can("medlem", "manageMembers")).toBe(false);
    expect(can("medlem", "manageBoard")).toBe(false);
  });

  it("admin can do everything", () => {
    for (const action of [
      "viewBoard",
      "editItems",
      "manageColumns",
      "manageMembers",
      "manageBoard",
    ] as const) {
      expect(can("admin", action)).toBe(true);
    }
  });
});
