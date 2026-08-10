import { describe, expect, it } from "vitest";

import { earnedPoints, type LabelsById, type StepColumn } from "@/lib/points/earned";
import { estimatedPoints } from "@/lib/points/estimate";

// Label ids: done / normal (not started) / not applicable.
const LABELS: LabelsById = {
  d: { isDone: true, isNotApplicable: false },
  n: { isDone: false, isNotApplicable: false },
  x: { isDone: false, isNotApplicable: true },
};

const step = (id: string, pointWeight?: number): StepColumn => ({
  id,
  settings: pointWeight === undefined ? {} : { pointWeight },
});

const cells = (entries: Record<string, string>) =>
  Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, { labelId: v }]));

describe("estimatedPoints", () => {
  it("returns the label points, or 0 when unset", () => {
    expect(estimatedPoints({ points: 8 })).toBe(8);
    expect(estimatedPoints({ points: null })).toBe(0);
    expect(estimatedPoints(null)).toBe(0);
    expect(estimatedPoints(undefined)).toBe(0);
  });
});

describe("earnedPoints", () => {
  const steps = [step("a", 0.5), step("b", 0.3), step("c", 0.2)];

  it("is 1 when every step is done", () => {
    expect(earnedPoints(steps, cells({ a: "d", b: "d", c: "d" }), LABELS)).toBe(1);
  });

  it("is 0 when nothing is done", () => {
    expect(earnedPoints(steps, cells({ a: "n", b: "n", c: "n" }), LABELS)).toBe(0);
    expect(earnedPoints(steps, {}, LABELS)).toBe(0);
  });

  it("is 0 (not NaN) when every step is «Ikke behov»", () => {
    const result = earnedPoints(steps, cells({ a: "x", b: "x", c: "x" }), LABELS);
    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });

  it("drops «Ikke behov» steps from the denominator and scales the rest up", () => {
    // b is N/A -> denominator = 0.5 + 0.2 = 0.7; a done -> 0.5 / 0.7.
    expect(earnedPoints(steps, cells({ a: "d", b: "x", c: "n" }), LABELS)).toBeCloseTo(
      0.7143,
      4,
    );
  });

  it("reaches 1 when all remaining (non-N/A) steps are done", () => {
    expect(earnedPoints(steps, cells({ a: "d", b: "x", c: "d" }), LABELS)).toBe(1);
  });

  it("ignores steps without a pointWeight", () => {
    const withUnweighted = [...steps, step("d")]; // d has no weight
    expect(earnedPoints(withUnweighted, cells({ a: "d", b: "d", c: "d", d: "n" }), LABELS)).toBe(
      1,
    );
  });

  it("ignores non-finite weights instead of returning NaN", () => {
    const bad = [step("a", NaN), step("b", 0.5)];
    const result = earnedPoints(bad, cells({ a: "d", b: "d" }), LABELS);
    expect(result).toBe(1);
    expect(Number.isNaN(result)).toBe(false);
  });

  it("normalizes weights that do not sum to 1", () => {
    const raw = [step("a", 2), step("b", 3)];
    expect(earnedPoints(raw, cells({ a: "d", b: "n" }), LABELS)).toBe(0.4);
  });

  it("rounds away floating-point noise", () => {
    const weights = [step("a", 0.1), step("b", 0.2), step("c", 0.7)];
    // 0.1 + 0.2 done over denominator 1 -> exactly 0.3, not 0.30000000000000004.
    expect(earnedPoints(weights, cells({ a: "d", b: "d", c: "n" }), LABELS)).toBe(0.3);
  });
});
