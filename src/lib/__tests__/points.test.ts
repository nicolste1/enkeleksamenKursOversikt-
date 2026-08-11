import { describe, expect, it } from "vitest";

import { earnedPoints, type LabelsById, type StepColumn } from "@/lib/points/earned";
import { estimatedPoints } from "@/lib/points/estimate";
import {
  DEFAULT_STATUS_LABELS,
  DEFAULT_TEMPLATE_COLUMNS,
} from "@/lib/templates/default-course-template";

// Label ids by earned share (FR2): Ferdig=1, Har gitt tilbakemelding=0.75,
// Trenger tilbakemelding=0.5, Under arbeid=0.25, Ikke startet=0, Ikke behov=1.
const LABELS: LabelsById = {
  done: { progress: 1 },
  feedbackGiven: { progress: 0.75 },
  needsFeedback: { progress: 0.5 },
  inProgress: { progress: 0.25 },
  notStarted: { progress: 0 },
  notApplicable: { progress: 1 },
};

const step = (id: string, pointWeight?: number): StepColumn => ({
  id,
  settings: pointWeight === undefined ? {} : { pointWeight },
});

const cells = (entries: Record<string, string>) =>
  Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, { labelId: v }]));

describe("estimatedPoints", () => {
  it("uses the content-type label's fixed points when set (FR1)", () => {
    expect(estimatedPoints({ contentTypeLabel: { points: 10 } })).toBe(10);
    expect(estimatedPoints({ contentTypeLabel: { points: 5 } })).toBe(5);
  });

  it("derives question count × rate when the content type has no fixed points", () => {
    // Repetisjonsoppgaver: Matematikk = 1.0/question, otherwise 0.5/question.
    expect(
      estimatedPoints({
        contentTypeLabel: {},
        questionCount: 8,
        questionRateLabel: { points: 1 },
      }),
    ).toBe(8);
    expect(
      estimatedPoints({ questionCount: 12, defaultPointsPerQuestion: 0.5 }),
    ).toBe(6);
  });

  it("falls back to the built-in rate when nothing is configured", () => {
    expect(estimatedPoints({ questionCount: 4 })).toBe(2);
  });

  it("lets fixed content-type points win over question count", () => {
    expect(
      estimatedPoints({ contentTypeLabel: { points: 10 }, questionCount: 50 }),
    ).toBe(10);
  });

  it("returns 0 when nothing applies", () => {
    expect(estimatedPoints({})).toBe(0);
    expect(estimatedPoints({ contentTypeLabel: null, questionCount: null })).toBe(0);
    expect(estimatedPoints({ contentTypeLabel: { points: null } })).toBe(0);
    expect(estimatedPoints({ questionCount: 0 })).toBe(0);
  });

  it("never returns a negative estimate from misconfigured rates", () => {
    expect(estimatedPoints({ contentTypeLabel: { points: -5 } })).toBe(0);
    expect(
      estimatedPoints({ questionCount: 4, questionRateLabel: { points: -1 } }),
    ).toBe(0);
  });
});

describe("earnedPoints", () => {
  const steps = [step("a", 0.5), step("b", 0.3), step("c", 0.2)];

  it("is 1 when every step is done", () => {
    expect(
      earnedPoints(steps, cells({ a: "done", b: "done", c: "done" }), LABELS),
    ).toBe(1);
  });

  it("is 0 when nothing is started", () => {
    expect(
      earnedPoints(steps, cells({ a: "notStarted", b: "notStarted", c: "notStarted" }), LABELS),
    ).toBe(0);
    expect(earnedPoints(steps, {}, LABELS)).toBe(0);
  });

  it("grants the full share for «Ikke behov» — no rescaling (FR2)", () => {
    // b is «Ikke behov»: its 0.3 is granted, so only c's 0.2 is missing.
    expect(
      earnedPoints(steps, cells({ a: "done", b: "notApplicable", c: "notStarted" }), LABELS),
    ).toBe(0.8);
    // Everything «Ikke behov» ⇒ the video is complete.
    expect(
      earnedPoints(
        steps,
        cells({ a: "notApplicable", b: "notApplicable", c: "notApplicable" }),
        LABELS,
      ),
    ).toBe(1);
  });

  it("gives partial credit per status label", () => {
    // a in progress (25 % of 0.5), b needs feedback (50 % of 0.3), c feedback given (75 % of 0.2).
    expect(
      earnedPoints(
        steps,
        cells({ a: "inProgress", b: "needsFeedback", c: "feedbackGiven" }),
        LABELS,
      ),
    ).toBe(0.425);
  });

  it("counts an unknown or missing label as 0 progress", () => {
    expect(earnedPoints(steps, cells({ a: "done", b: "ghost" }), LABELS)).toBe(0.5);
    expect(earnedPoints(steps, { a: { labelId: null } }, LABELS)).toBe(0);
  });

  it("ignores steps without a positive weight (e.g. «Opphavsrett»)", () => {
    const withZero = [...steps, step("d", 0), step("e")];
    // d done on a zero-weight step earns nothing and does not dilute the rest.
    expect(
      earnedPoints(
        withZero,
        cells({ a: "done", b: "done", c: "done", d: "done" }),
        LABELS,
      ),
    ).toBe(1);
    // Only the zero-weight step done ⇒ 0 (the Monday export's «Egenkontroll» row).
    expect(earnedPoints(withZero, cells({ d: "done" }), LABELS)).toBe(0);
  });

  it("ignores non-finite weights and clamps progress above 1", () => {
    const bad = [step("a", NaN), step("b", 0.5)];
    expect(earnedPoints(bad, cells({ a: "done", b: "done" }), LABELS)).toBe(1);
    const eager: LabelsById = { over: { progress: 2 } };
    expect(earnedPoints([step("a", 1)], cells({ a: "over" }), eager)).toBe(1);
  });

  it("normalizes weights that do not sum to 1", () => {
    const raw = [step("a", 2), step("b", 3)];
    expect(earnedPoints(raw, cells({ a: "done", b: "notStarted" }), LABELS)).toBe(0.4);
  });

  it("returns 0 (never NaN) when no step carries weight", () => {
    expect(earnedPoints([step("a", 0), step("b")], cells({ a: "done" }), LABELS)).toBe(0);
  });

  it("rounds away floating-point noise", () => {
    const weights = [step("a", 0.1), step("b", 0.2), step("c", 0.7)];
    expect(
      earnedPoints(weights, cells({ a: "done", b: "done", c: "notStarted" }), LABELS),
    ).toBe(0.3);
  });
});

// Ground truth from the team's Monday export («18. NTNU - Matematikk 2C -
// Diskret matematikk - H»): template weights + label shares must reproduce the
// exported «Fullført arbeid» numbers exactly.
describe("earnedPoints × default template (Monday parity)", () => {
  const steps: StepColumn[] = DEFAULT_TEMPLATE_COLUMNS.filter(
    (c) => c.role === "step",
  ).map((c) => ({ id: c.title, settings: { pointWeight: c.pointWeight } }));

  const labels: LabelsById = Object.fromEntries(
    DEFAULT_STATUS_LABELS.map((l) => [l.title, { progress: l.progress ?? 0 }]),
  );

  const statuses = (byTitle: Record<string, string>) => cells(byTitle);

  it("reproduces «Mengder og elementer»: everything done except Kvalitetssjekk ⇒ 9.5/10", () => {
    const fraction = earnedPoints(
      steps,
      statuses({
        Manus: "Ferdig",
        Presentasjon: "Ferdig",
        Opphavsrett: "Ferdig",
        Innspilling: "Ferdig",
        Kameraopptak: "Ferdig",
        Redigering: "Ferdig",
        Opplastning: "Ferdig",
        Kvalitetssjekk: "Ikke startet",
      }),
      labels,
    );
    expect(fraction * 10).toBeCloseTo(9.5, 10);
  });

  it("reproduces «Regulære språk samlet»: feedback given on Presentasjon ⇒ 2.5125/3", () => {
    const fraction = earnedPoints(
      steps,
      statuses({
        Manus: "Ferdig",
        Presentasjon: "Har gitt tilbakemelding",
        Opphavsrett: "Ferdig",
        Innspilling: "Ikke behov",
        Kameraopptak: "Ikke behov",
        Redigering: "Ikke behov",
        Opplastning: "Ikke startet",
        Kvalitetssjekk: "Ikke startet",
      }),
      labels,
    );
    expect(fraction * 3).toBeCloseTo(2.5125, 10);
  });

  it("reproduces «RSA med små primtall»: Redigering under arbeid ⇒ 8.625/10", () => {
    const fraction = earnedPoints(
      steps,
      statuses({
        Manus: "Ferdig",
        Presentasjon: "Ferdig",
        Opphavsrett: "Ferdig",
        Innspilling: "Ferdig",
        Kameraopptak: "Ikke behov",
        Redigering: "Under arbeid",
        Opplastning: "Ikke startet",
        Kvalitetssjekk: "Ikke startet",
      }),
      labels,
    );
    expect(fraction * 10).toBeCloseTo(8.625, 10);
  });

  it("reproduces «Egenkontroll før eksamen»: only zero-weight Opphavsrett done ⇒ 0/5", () => {
    const fraction = earnedPoints(
      steps,
      statuses({ Opphavsrett: "Ferdig" }),
      labels,
    );
    expect(fraction).toBe(0);
  });
});
