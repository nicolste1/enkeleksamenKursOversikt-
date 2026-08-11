import { describe, expect, it } from "vitest";

import { autoEstimateUpdate } from "@/lib/points/auto-estimate";

// Column setup mirroring the template roles.
const COLUMNS = [
  { id: "type", settings: { role: "contentType" as const } },
  { id: "count", settings: { role: "questionCount" as const } },
  {
    id: "rate",
    settings: { role: "questionRate" as const, defaultPointsPerQuestion: 0.5 },
  },
  { id: "estimate", settings: { role: "estimate" as const } },
];

const LABELS = {
  teori: { points: 10 },
  rep: { points: null }, // Repetisjonsoppgaver: derived, no fixed rate
  matematikk: { points: 1 },
};

describe("autoEstimateUpdate", () => {
  it("derives the estimate from a fixed-rate content type", () => {
    const update = autoEstimateUpdate({
      columns: COLUMNS,
      labelsById: LABELS,
      cells: { type: { labelId: "teori" } },
    });
    expect(update).toEqual({ columnId: "estimate", value: { number: 10 } });
  });

  it("derives question count × rate when the type has no fixed rate", () => {
    const update = autoEstimateUpdate({
      columns: COLUMNS,
      labelsById: LABELS,
      cells: {
        type: { labelId: "rep" },
        count: { number: 8 },
        rate: { labelId: "matematikk" },
      },
    });
    expect(update).toEqual({ columnId: "estimate", value: { number: 8 } });
  });

  it("uses the column's default rate when no Oppgavetype label is set", () => {
    const update = autoEstimateUpdate({
      columns: COLUMNS,
      labelsById: LABELS,
      cells: { type: { labelId: "rep" }, count: { number: 12 } },
    });
    expect(update).toEqual({ columnId: "estimate", value: { number: 6 } });
  });

  it("backs off when the user has manually overridden the estimate (FR1)", () => {
    const update = autoEstimateUpdate({
      columns: COLUMNS,
      labelsById: LABELS,
      cells: {
        type: { labelId: "teori" },
        estimate: { number: 42, manual: true },
      },
    });
    expect(update).toBeNull();
  });

  it("returns null when the estimate is already in sync", () => {
    const update = autoEstimateUpdate({
      columns: COLUMNS,
      labelsById: LABELS,
      cells: { type: { labelId: "teori" }, estimate: { number: 10 } },
    });
    expect(update).toBeNull();
  });

  it("clears the estimate when every input is removed", () => {
    const update = autoEstimateUpdate({
      columns: COLUMNS,
      labelsById: LABELS,
      cells: { type: { labelId: null }, estimate: { number: 10 } },
    });
    expect(update).toEqual({ columnId: "estimate", value: { number: null } });
  });

  it("does nothing without an estimate column", () => {
    const update = autoEstimateUpdate({
      columns: COLUMNS.filter((c) => c.settings.role !== "estimate"),
      labelsById: LABELS,
      cells: { type: { labelId: "teori" } },
    });
    expect(update).toBeNull();
  });
});
