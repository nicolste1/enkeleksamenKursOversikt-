import { describe, expect, it } from "vitest";

import {
  DEFAULT_COURSE_TEMPLATE,
  DEFAULT_FUNCTIONS,
  DEFAULT_STATUS_LABELS,
  DEFAULT_TEMPLATE_COLUMNS,
} from "@/lib/templates/default-course-template";

// The standard columns, in order, excluding «Leksjon» (which is items.name).
// Extends F5 with «Redigeringsansvarlig» (FR10).
const EXPECTED_TITLES = [
  "Type innhold",
  "Importert",
  "Lenke",
  "Ansvarlig",
  "Redigeringsansvarlig",
  "Manus",
  "Presentasjon",
  "Opphavsrett",
  "Innspilling",
  "Kameraopptak",
  "Klar til redigering",
  "Redigering",
  "Opplastning",
  "Kvalitetssjekk",
  "Beregnet arbeid",
  "Opparbeidet poeng",
];

const byTitle = (title: string) =>
  DEFAULT_TEMPLATE_COLUMNS.find((c) => c.title === title);

describe("default course template", () => {
  it("contains exactly the expected columns in order", () => {
    expect(DEFAULT_TEMPLATE_COLUMNS.map((c) => c.title)).toEqual(EXPECTED_TITLES);
  });

  it("gives every production step the six F6 status labels", () => {
    const statusColumns = DEFAULT_TEMPLATE_COLUMNS.filter((c) => c.type === "status");
    expect(statusColumns).toHaveLength(9);
    for (const column of statusColumns) {
      expect(column.labels).toBe(DEFAULT_STATUS_LABELS);
    }
    expect(DEFAULT_STATUS_LABELS).toHaveLength(6);
  });

  it("marks exactly one status label done (Ferdig) and one not-applicable (Ikke behov)", () => {
    const done = DEFAULT_STATUS_LABELS.filter((l) => l.isDone);
    const na = DEFAULT_STATUS_LABELS.filter((l) => l.isNotApplicable);
    expect(done.map((l) => l.title)).toEqual(["Ferdig"]);
    expect(na.map((l) => l.title)).toEqual(["Ikke behov"]);
  });

  it("models «Importert» as a Ny/Importert label column, not a checkbox", () => {
    const importert = byTitle("Importert");
    expect(importert?.type).toBe("label");
    expect(importert?.labels?.map((l) => l.title)).toEqual(["Ny", "Importert"]);
  });

  it("uses valid hex colors everywhere", () => {
    const hex = /^#[0-9a-f]{6}$/i;
    for (const column of DEFAULT_TEMPLATE_COLUMNS) {
      for (const label of column.labels ?? []) {
        expect(label.color).toMatch(hex);
      }
    }
  });

  it("only references known function keys in visibleToFunctions", () => {
    const known = new Set(DEFAULT_FUNCTIONS.map((f) => f.key));
    for (const column of DEFAULT_TEMPLATE_COLUMNS) {
      for (const key of column.visibleToFunctions ?? []) {
        expect(known).toContain(key);
      }
    }
  });

  it("hides Manus from a Redigerer but shows the editing steps", () => {
    expect(byTitle("Manus")?.visibleToFunctions).toContain("manusforfatter");
    expect(byTitle("Manus")?.visibleToFunctions).not.toContain("redigerer");
    expect(byTitle("Redigering")?.visibleToFunctions).toContain("redigerer");
  });

  it("shows Redigeringsansvarlig to the editing-side functions (FR10)", () => {
    expect(byTitle("Redigeringsansvarlig")?.type).toBe("person");
    expect(byTitle("Redigeringsansvarlig")?.visibleToFunctions).toEqual([
      "redigerer",
      "opplaster",
      "kvalitetssjekker",
    ]);
  });

  it("tags the points-model columns with roles (FR1–FR2)", () => {
    expect(byTitle("Type innhold")?.role).toBe("contentType");
    expect(byTitle("Beregnet arbeid")?.role).toBe("estimate");
    expect(byTitle("Opparbeidet poeng")?.role).toBe("earned");
    for (const column of DEFAULT_TEMPLATE_COLUMNS.filter((c) => c.type === "status")) {
      expect(column.role).toBe("step");
    }
  });

  it("sets points on every content-type label (FR1)", () => {
    const labels = byTitle("Type innhold")?.labels ?? [];
    expect(labels).toHaveLength(3);
    for (const label of labels) {
      expect(typeof label.points).toBe("number");
    }
  });

  it("gives every step a weight, summing to 1 across the nine steps (FR2)", () => {
    const steps = DEFAULT_TEMPLATE_COLUMNS.filter((c) => c.role === "step");
    for (const step of steps) {
      expect(typeof step.pointWeight).toBe("number");
    }
    const sum = steps.reduce((acc, s) => acc + (s.pointWeight ?? 0), 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("exposes functions and columns via the aggregate constant", () => {
    expect(DEFAULT_COURSE_TEMPLATE.functions).toBe(DEFAULT_FUNCTIONS);
    expect(DEFAULT_COURSE_TEMPLATE.columns).toBe(DEFAULT_TEMPLATE_COLUMNS);
  });
});
