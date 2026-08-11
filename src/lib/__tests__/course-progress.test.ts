import { describe, expect, it } from "vitest";

import { courseProgress } from "@/lib/points/course-progress";

const COLUMNS = [
  { id: "manus", settings: { role: "step" as const, pointWeight: 0.5 } },
  { id: "kvalitet", settings: { role: "step" as const, pointWeight: 0.5 } },
  { id: "arbeid", settings: { role: "estimate" as const } },
  { id: "lenke", settings: {} },
];

const LABELS = [
  { id: "done", progress: 1 },
  { id: "half", progress: 0.5 },
  { id: "none", progress: 0 },
];

describe("courseProgress", () => {
  it("sums earned and estimated points across videos", () => {
    const result = courseProgress({
      columns: COLUMNS,
      labels: LABELS,
      itemIds: ["a", "b"],
      cells: [
        { itemId: "a", columnId: "arbeid", value: { number: 10 } },
        { itemId: "a", columnId: "manus", value: { labelId: "done" } },
        { itemId: "a", columnId: "kvalitet", value: { labelId: "done" } },
        { itemId: "b", columnId: "arbeid", value: { number: 10 } },
        { itemId: "b", columnId: "manus", value: { labelId: "half" } },
      ],
    });
    // a: 10/10 done; b: 0.5 × 0.5 weight = 0.25 → 2.5 of 10.
    expect(result.estimatedPoints).toBe(20);
    expect(result.earnedPoints).toBeCloseTo(12.5, 10);
    expect(result.fraction).toBeCloseTo(0.625, 10);
    expect(result.videoCount).toBe(2);
  });

  it("ignores cells belonging to deleted items", () => {
    const result = courseProgress({
      columns: COLUMNS,
      labels: LABELS,
      itemIds: ["a"],
      cells: [
        { itemId: "a", columnId: "arbeid", value: { number: 5 } },
        { itemId: "deleted", columnId: "arbeid", value: { number: 100 } },
        { itemId: "deleted", columnId: "manus", value: { labelId: "done" } },
      ],
    });
    expect(result.estimatedPoints).toBe(5);
    expect(result.videoCount).toBe(1);
  });

  it("skips videos without an estimate and never returns NaN", () => {
    const result = courseProgress({
      columns: COLUMNS,
      labels: LABELS,
      itemIds: ["a", "b"],
      cells: [{ itemId: "a", columnId: "manus", value: { labelId: "done" } }],
    });
    expect(result.estimatedPoints).toBe(0);
    expect(result.earnedPoints).toBe(0);
    expect(result.fraction).toBe(0);
    expect(result.videoCount).toBe(2);
  });

  it("handles boards without points columns (custom boards)", () => {
    const result = courseProgress({
      columns: [{ id: "x", settings: {} }],
      labels: [],
      itemIds: ["a"],
      cells: [],
    });
    expect(result).toEqual({
      videoCount: 1,
      estimatedPoints: 0,
      earnedPoints: 0,
      fraction: 0,
    });
  });
});
