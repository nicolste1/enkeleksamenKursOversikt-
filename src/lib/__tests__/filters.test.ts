// Filter model tests (F13): operator semantics per column type, empty-value
// handling, And/Or combination, one-level groups, parse guard, and the board
// view derivations (filtering groups, person bucketing, «fill empty» helper).

import { describe, expect, it } from "vitest";

import type { BoardGroupData, BoardPerson } from "@/lib/boards/queries";
import {
  applyFilterToGroups,
  groupItemsByPerson,
  itemsMissingPersonValue,
} from "@/lib/filters/board-view";
import { cellComparable, matchesFilter, type FilterContext } from "@/lib/filters/evaluate";
import { buildMyLessonsDefinition, isJaLabelTitle } from "@/lib/filters/my-lessons";
import {
  EMPTY_FILTER,
  hasConditions,
  isValidFilterDefinition,
  type FilterCondition,
  type FilterDefinition,
  type FilterGroup,
} from "@/lib/filters/filter-model";

const CONTEXT: FilterContext = {
  columnTypeById: {
    status: "status",
    ready: "label",
    person: "person",
    due: "date",
    notes: "text",
    count: "number",
    url: "link",
  },
};

const condition = (
  columnId: string,
  operator: "is" | "isNot",
  value: string | number | null,
): FilterCondition => ({ kind: "condition", columnId, operator, value });

const single = (rule: FilterCondition | FilterGroup): FilterDefinition => ({
  combinator: "and",
  rules: [rule],
});

describe("cellComparable", () => {
  it("normalizes each column type to its comparable primitive", () => {
    expect(cellComparable("status", { labelId: "l1" })).toBe("l1");
    expect(cellComparable("label", { labelId: null })).toBeNull();
    expect(cellComparable("person", { userId: "u1" })).toBe("u1");
    expect(cellComparable("date", { date: "2026-08-12" })).toBe("2026-08-12");
    expect(cellComparable("number", { number: 3 })).toBe(3);
    expect(cellComparable("link", { url: "https://a.no", label: "A" })).toBe(
      "https://a.no",
    );
  });

  it("treats missing cells, empty text and empty url as null", () => {
    expect(cellComparable("text", undefined)).toBeNull();
    expect(cellComparable("text", { text: "" })).toBeNull();
    expect(cellComparable("link", { url: "", label: "" })).toBeNull();
    expect(cellComparable(undefined, { text: "x" })).toBeNull();
  });
});

describe("matchesFilter — operators", () => {
  it("«is X» matches the equal labelId and rejects others and empty cells", () => {
    const def = single(condition("status", "is", "l1"));
    expect(matchesFilter(def, { status: { labelId: "l1" } }, CONTEXT)).toBe(true);
    expect(matchesFilter(def, { status: { labelId: "l2" } }, CONTEXT)).toBe(false);
    expect(matchesFilter(def, { status: { labelId: null } }, CONTEXT)).toBe(false);
    expect(matchesFilter(def, {}, CONTEXT)).toBe(false);
  });

  it("«isNot X» matches different values AND empty cells (Notion semantics)", () => {
    const def = single(condition("status", "isNot", "l1"));
    expect(matchesFilter(def, { status: { labelId: "l2" } }, CONTEXT)).toBe(true);
    expect(matchesFilter(def, {}, CONTEXT)).toBe(true);
    expect(matchesFilter(def, { status: { labelId: "l1" } }, CONTEXT)).toBe(false);
  });

  it("«is (tom)» matches unset cells however they are represented", () => {
    const def = single(condition("notes", "is", null));
    expect(matchesFilter(def, {}, CONTEXT)).toBe(true);
    expect(matchesFilter(def, { notes: { text: "" } }, CONTEXT)).toBe(true);
    expect(matchesFilter(def, { notes: { text: "hei" } }, CONTEXT)).toBe(false);
  });

  it("«isNot (tom)» matches any set value", () => {
    const def = single(condition("person", "isNot", null));
    expect(matchesFilter(def, { person: { userId: "u1" } }, CONTEXT)).toBe(true);
    expect(matchesFilter(def, { person: { userId: null } }, CONTEXT)).toBe(false);
  });

  it("compares person by userId, number strictly and date by ISO string", () => {
    expect(
      matchesFilter(single(condition("person", "is", "u1")), { person: { userId: "u1" } }, CONTEXT),
    ).toBe(true);
    expect(
      matchesFilter(single(condition("count", "is", 3)), { count: { number: 3 } }, CONTEXT),
    ).toBe(true);
    expect(
      matchesFilter(single(condition("count", "is", 3)), { count: { number: 3.5 } }, CONTEXT),
    ).toBe(false);
    expect(
      matchesFilter(
        single(condition("due", "is", "2026-08-12")),
        { due: { date: "2026-08-12" } },
        CONTEXT,
      ),
    ).toBe(true);
  });

  it("treats an unknown columnId as an empty cell for both operators", () => {
    const cells = { status: { labelId: "l1" } };
    expect(matchesFilter(single(condition("gone", "is", "x")), cells, CONTEXT)).toBe(false);
    expect(matchesFilter(single(condition("gone", "isNot", "x")), cells, CONTEXT)).toBe(true);
    expect(matchesFilter(single(condition("gone", "is", null)), cells, CONTEXT)).toBe(true);
  });
});

describe("matchesFilter — combination", () => {
  const a = condition("status", "is", "l1");
  const b = condition("person", "is", "u1");
  const c = condition("count", "is", 3);

  it("combines top-level rules with and/or", () => {
    const both = { status: { labelId: "l1" }, person: { userId: "u1" } };
    const onlyA = { status: { labelId: "l1" }, person: { userId: "u2" } };
    expect(matchesFilter({ combinator: "and", rules: [a, b] }, both, CONTEXT)).toBe(true);
    expect(matchesFilter({ combinator: "and", rules: [a, b] }, onlyA, CONTEXT)).toBe(false);
    expect(matchesFilter({ combinator: "or", rules: [a, b] }, onlyA, CONTEXT)).toBe(true);
    expect(matchesFilter({ combinator: "or", rules: [a, b] }, {}, CONTEXT)).toBe(false);
  });

  it("evaluates «A and (B or C)» against a truth table", () => {
    const def: FilterDefinition = {
      combinator: "and",
      rules: [a, { kind: "group", combinator: "or", conditions: [b, c] }],
    };
    const row = (status: string, userId: string, count: number) => ({
      status: { labelId: status },
      person: { userId },
      count: { number: count },
    });
    expect(matchesFilter(def, row("l1", "u1", 0), CONTEXT)).toBe(true); // A ∧ B
    expect(matchesFilter(def, row("l1", "u2", 3), CONTEXT)).toBe(true); // A ∧ C
    expect(matchesFilter(def, row("l1", "u2", 0), CONTEXT)).toBe(false); // A alone
    expect(matchesFilter(def, row("l2", "u1", 3), CONTEXT)).toBe(false); // B ∧ C uten A
  });

  it("evaluates «A or (B and C)»", () => {
    const def: FilterDefinition = {
      combinator: "or",
      rules: [a, { kind: "group", combinator: "and", conditions: [b, c] }],
    };
    expect(
      matchesFilter(def, { person: { userId: "u1" }, count: { number: 3 } }, CONTEXT),
    ).toBe(true);
    expect(matchesFilter(def, { person: { userId: "u1" } }, CONTEXT)).toBe(false);
    expect(matchesFilter(def, { status: { labelId: "l1" } }, CONTEXT)).toBe(true);
  });

  it("matches everything on an empty definition and ignores empty groups", () => {
    expect(matchesFilter(EMPTY_FILTER, {}, CONTEXT)).toBe(true);
    const withEmptyGroup: FilterDefinition = {
      combinator: "or",
      rules: [{ kind: "group", combinator: "and", conditions: [] }],
    };
    // An empty group has no opinion — it must not make `or` match everything
    // nor `and` match nothing; with no other rules the filter is inactive.
    expect(matchesFilter(withEmptyGroup, {}, CONTEXT)).toBe(true);
    const orWithRealRule: FilterDefinition = {
      combinator: "or",
      rules: [
        { kind: "group", combinator: "and", conditions: [] },
        condition("status", "is", "l1"),
      ],
    };
    expect(matchesFilter(orWithRealRule, {}, CONTEXT)).toBe(false);
  });
});

describe("isValidFilterDefinition", () => {
  it("accepts a JSON round-tripped definition", () => {
    const def: FilterDefinition = {
      combinator: "or",
      rules: [
        condition("a", "is", null),
        { kind: "group", combinator: "and", conditions: [condition("b", "isNot", 2)] },
      ],
    };
    expect(isValidFilterDefinition(JSON.parse(JSON.stringify(def)))).toBe(true);
    expect(isValidFilterDefinition(JSON.parse(JSON.stringify(EMPTY_FILTER)))).toBe(true);
  });

  it("rejects malformed input", () => {
    expect(isValidFilterDefinition(null)).toBe(false);
    expect(isValidFilterDefinition([])).toBe(false);
    expect(isValidFilterDefinition({ combinator: "and" })).toBe(false);
    expect(isValidFilterDefinition({ combinator: "nand", rules: [] })).toBe(false);
    expect(
      isValidFilterDefinition({
        combinator: "and",
        rules: [{ kind: "condition", columnId: "a", operator: "equals", value: "x" }],
      }),
    ).toBe(false);
    expect(
      isValidFilterDefinition({
        combinator: "and",
        rules: [{ kind: "condition", columnId: "a", operator: "is", value: { x: 1 } }],
      }),
    ).toBe(false);
  });

  it("rejects a group nested inside a group", () => {
    expect(
      isValidFilterDefinition({
        combinator: "and",
        rules: [
          {
            kind: "group",
            combinator: "or",
            conditions: [{ kind: "group", combinator: "and", conditions: [] }],
          },
        ],
      }),
    ).toBe(false);
  });

  it("hasConditions is false for empty definitions and empty groups", () => {
    expect(hasConditions(EMPTY_FILTER)).toBe(false);
    expect(
      hasConditions({
        combinator: "and",
        rules: [{ kind: "group", combinator: "or", conditions: [] }],
      }),
    ).toBe(false);
    expect(hasConditions(single(condition("a", "is", "x")))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Board view derivations
// ---------------------------------------------------------------------------

const item = (id: string, cells: BoardGroupData["items"][number]["cells"]) => ({
  id,
  name: `Leksjon ${id}`,
  position: id,
  cells,
});

const GROUPS: BoardGroupData[] = [
  {
    id: "g1",
    name: "Kapittel 1",
    color: null,
    position: "a",
    items: [
      item("i1", { status: { labelId: "l1" }, person: { userId: "u1" } }),
      item("i2", { status: { labelId: "l2" }, person: { userId: "u2" } }),
    ],
  },
  {
    id: "g2",
    name: "Kapittel 2",
    color: null,
    position: "b",
    items: [
      item("i3", { status: { labelId: "l2" }, person: { userId: null } }),
      item("i4", { status: { labelId: "l1" }, person: {} }),
    ],
  },
];

describe("applyFilterToGroups", () => {
  it("returns the same reference when the filter has no conditions", () => {
    expect(applyFilterToGroups(GROUPS, EMPTY_FILTER, CONTEXT)).toBe(GROUPS);
  });

  it("filters items per group and drops groups left empty", () => {
    const def = single(condition("person", "is", "u1"));
    const result = applyFilterToGroups(GROUPS, def, CONTEXT);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g1");
    expect(result[0].items.map((i) => i.id)).toEqual(["i1"]);
  });

  it("keeps every matching group", () => {
    const def = single(condition("status", "is", "l1"));
    const result = applyFilterToGroups(GROUPS, def, CONTEXT);
    expect(result.map((g) => g.items.map((i) => i.id))).toEqual([["i1"], ["i4"]]);
  });
});

describe("groupItemsByPerson", () => {
  const PEOPLE: Record<string, BoardPerson> = {
    u1: { id: "u1", fullName: "Åse Berg", email: "aase@x.no", avatarUrl: null },
    u2: { id: "u2", fullName: "Anna Dahl", email: "anna@x.no", avatarUrl: null },
  };

  it("buckets by person, sorts by name (nb-NO) and puts unassigned last", () => {
    const buckets = groupItemsByPerson(GROUPS, "person", PEOPLE);
    // Anna before Åse (æøå sorts after a–z in nb-NO); null bucket last with
    // both the explicit-null and the missing-key rows.
    expect(buckets.map((b) => b.userId)).toEqual(["u2", "u1", null]);
    expect(buckets[2].items.map((i) => i.id)).toEqual(["i3", "i4"]);
  });

  it("returns no null bucket when every row has a person", () => {
    const buckets = groupItemsByPerson([GROUPS[0]], "person", PEOPLE);
    expect(buckets.map((b) => b.userId)).toEqual(["u2", "u1"]);
  });
});

describe("buildMyLessonsDefinition", () => {
  const CTX: FilterContext = {
    columnTypeById: { resp: "person", klar: "label" },
  };

  it("matches only rows where responsible = me AND ready = Ja", () => {
    const def = buildMyLessonsDefinition({
      personColumnId: "resp",
      readyColumnId: "klar",
      jaLabelIds: ["ja1"],
      myUserId: "me",
    });
    const row = (userId: string | null, labelId: string | null) => ({
      resp: { userId },
      klar: { labelId },
    });
    expect(matchesFilter(def, row("me", "ja1"), CTX)).toBe(true);
    expect(matchesFilter(def, row("me", "nei1"), CTX)).toBe(false);
    expect(matchesFilter(def, row("me", null), CTX)).toBe(false);
    expect(matchesFilter(def, row("other", "ja1"), CTX)).toBe(false);
  });

  it("accepts any of several Ja-label ids (or-group)", () => {
    const def = buildMyLessonsDefinition({
      personColumnId: "resp",
      readyColumnId: "klar",
      jaLabelIds: ["ja1", "ja2"],
      myUserId: "me",
    });
    expect(
      matchesFilter(def, { resp: { userId: "me" }, klar: { labelId: "ja2" } }, CTX),
    ).toBe(true);
  });

  it("falls back to responsible-only when the board has no ready column", () => {
    const def = buildMyLessonsDefinition({
      personColumnId: "resp",
      readyColumnId: null,
      jaLabelIds: [],
      myUserId: "me",
    });
    expect(matchesFilter(def, { resp: { userId: "me" } }, CTX)).toBe(true);
    expect(matchesFilter(def, { resp: { userId: "other" } }, CTX)).toBe(false);
  });

  it("matches «ja» case-insensitively with whitespace, nothing else", () => {
    expect(isJaLabelTitle("Ja")).toBe(true);
    expect(isJaLabelTitle(" JA ")).toBe(true);
    expect(isJaLabelTitle("Nei")).toBe(false);
    expect(isJaLabelTitle("Jaha")).toBe(false);
  });
});

describe("itemsMissingPersonValue", () => {
  it("lists rows with a null or missing person cell", () => {
    expect(itemsMissingPersonValue(GROUPS, "person")).toEqual(["i3", "i4"]);
  });

  it("is empty when all rows are assigned", () => {
    expect(itemsMissingPersonValue([GROUPS[0]], "person")).toEqual([]);
  });
});
