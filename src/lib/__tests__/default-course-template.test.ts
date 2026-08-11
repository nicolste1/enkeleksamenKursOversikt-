import { describe, expect, it } from "vitest";

import {
  DEFAULT_COURSE_TEMPLATE,
  DEFAULT_FUNCTIONS,
  DEFAULT_STATUS_LABELS,
  DEFAULT_TEMPLATE_COLUMNS,
} from "@/lib/templates/default-course-template";

// The standard columns, in order, excluding «Leksjon» (which is items.name).
// Mirrors the team's Monday board, extended with «Redigeringsansvarlig» (FR10).
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
  "Antall spørsmål",
  "Oppgavetype",
  "Arbeid",
  "Fullført arbeid",
  "Innholdskategori",
];

const byTitle = (title: string) =>
  DEFAULT_TEMPLATE_COLUMNS.find((c) => c.title === title);

describe("default course template", () => {
  it("contains exactly the expected columns in order", () => {
    expect(DEFAULT_TEMPLATE_COLUMNS.map((c) => c.title)).toEqual(EXPECTED_TITLES);
  });

  it("gives every production step the six F6 status labels", () => {
    const statusColumns = DEFAULT_TEMPLATE_COLUMNS.filter((c) => c.type === "status");
    expect(statusColumns).toHaveLength(8);
    for (const column of statusColumns) {
      expect(column.labels).toBe(DEFAULT_STATUS_LABELS);
    }
    expect(DEFAULT_STATUS_LABELS).toHaveLength(6);
  });

  it("gives every status label its Monday earned share (FR2)", () => {
    const shares = Object.fromEntries(
      DEFAULT_STATUS_LABELS.map((l) => [l.title, l.progress]),
    );
    expect(shares).toEqual({
      Ferdig: 1,
      "Under arbeid": 0.25,
      "Trenger tilbakemelding": 0.5,
      "Har gitt tilbakemelding": 0.75,
      "Ikke startet": 0,
      "Ikke behov": 1,
    });
  });

  it("marks exactly one status label done (Ferdig) and one not-applicable (Ikke behov)", () => {
    const done = DEFAULT_STATUS_LABELS.filter((l) => l.isDone);
    const na = DEFAULT_STATUS_LABELS.filter((l) => l.isNotApplicable);
    expect(done.map((l) => l.title)).toEqual(["Ferdig"]);
    expect(na.map((l) => l.title)).toEqual(["Ikke behov"]);
  });

  it("models «Importert» as a label column with Ny/Noe gjenbruk/Importert (FR11)", () => {
    const importert = byTitle("Importert");
    expect(importert?.type).toBe("label");
    expect(importert?.labels?.map((l) => l.title)).toEqual([
      "Ny",
      "Noe gjenbruk",
      "Importert",
    ]);
  });

  it("models «Klar til redigering» as a Ja/Nei signal outside the points model (FR9)", () => {
    const ktr = byTitle("Klar til redigering");
    expect(ktr?.type).toBe("label");
    expect(ktr?.role).toBeUndefined();
    expect(ktr?.pointWeight).toBeUndefined();
    expect(ktr?.labels?.map((l) => l.title)).toEqual(["Ja", "Nei", "Ikke behov"]);
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
    expect(byTitle("Antall spørsmål")?.role).toBe("questionCount");
    expect(byTitle("Oppgavetype")?.role).toBe("questionRate");
    expect(byTitle("Arbeid")?.role).toBe("estimate");
    expect(byTitle("Fullført arbeid")?.role).toBe("earned");
    for (const column of DEFAULT_TEMPLATE_COLUMNS.filter((c) => c.type === "status")) {
      expect(column.role).toBe("step");
    }
  });

  it("sets fixed points on every content type except Repetisjonsoppgaver (FR1)", () => {
    const labels = byTitle("Type innhold")?.labels ?? [];
    expect(labels.map((l) => l.title)).toEqual([
      "Teorivideo",
      "Oppgavevideo",
      "Kombivideo",
      "Repetisjonsoppgaver",
      "Artikkel",
    ]);
    for (const label of labels) {
      if (label.title === "Repetisjonsoppgaver") {
        expect(label.points).toBeUndefined();
      } else {
        expect(typeof label.points).toBe("number");
      }
    }
  });

  it("configures the per-question rate on «Oppgavetype» (FR1)", () => {
    const oppgavetype = byTitle("Oppgavetype");
    expect(oppgavetype?.defaultPointsPerQuestion).toBe(0.5);
    expect(oppgavetype?.labels?.map((l) => [l.title, l.points])).toEqual([
      ["Matematikk", 1],
    ]);
  });

  it("uses the team's step weights, summing to 1, with Opphavsrett unweighted (FR2)", () => {
    const steps = DEFAULT_TEMPLATE_COLUMNS.filter((c) => c.role === "step");
    const weights = Object.fromEntries(steps.map((s) => [s.title, s.pointWeight]));
    expect(weights).toEqual({
      Manus: 0.4,
      Presentasjon: 0.25,
      Opphavsrett: 0,
      Innspilling: 0.15,
      Kameraopptak: 0.05,
      Redigering: 0.05,
      Opplastning: 0.05,
      Kvalitetssjekk: 0.05,
    });
    const sum = steps.reduce((acc, s) => acc + (s.pointWeight ?? 0), 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("exposes functions and columns via the aggregate constant", () => {
    expect(DEFAULT_COURSE_TEMPLATE.functions).toBe(DEFAULT_FUNCTIONS);
    expect(DEFAULT_COURSE_TEMPLATE.columns).toBe(DEFAULT_TEMPLATE_COLUMNS);
  });
});
