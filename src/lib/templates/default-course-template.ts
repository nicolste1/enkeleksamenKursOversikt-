// Default course template (F5 columns + F6 statuses + production functions),
// extended with the FR business rules. Copy-on-create: createBoardFromTemplate
// materializes these as real columns, labels and functions the board then owns.
// Kept as a typed constant (not a DB table) for MVP — template-management UI is
// a week-2 feature.
//
// `visibleToFunctions` here references function `key`s; on board creation the
// keys are resolved to the created function ids and written to columns.settings.
//
// NOTE: the default points (label.points) and step weights (pointWeight) are
// sensible starting values — teams tune them per board. Weights across the nine
// production steps sum to 1.0.

import type { ColumnRole, ColumnType } from "@/lib/types";

export interface TemplateFunction {
  key: string;
  name: string;
}

export interface TemplateLabel {
  title: string;
  color: string;
  isDone?: boolean;
  isNotApplicable?: boolean;
  /** Estimate for a content-type label (FR1); omitted on status labels. */
  points?: number;
}

export interface TemplateColumn {
  title: string;
  type: ColumnType;
  labels?: TemplateLabel[];
  /** Function keys allowed to see this column; omitted = visible to all. */
  visibleToFunctions?: string[];
  role?: ColumnRole;
  /** Share of estimated points earned by completing this step (FR2). */
  pointWeight?: number;
}

// Production functions used to focus each person's view (own palette, not Monday's).
export const DEFAULT_FUNCTIONS: TemplateFunction[] = [
  { key: "manusforfatter", name: "Manusforfatter" },
  { key: "presentasjonslager", name: "Presentasjonslager" },
  { key: "innspiller", name: "Innspiller" },
  { key: "kameraoperator", name: "Kameraoperatør" },
  { key: "redigerer", name: "Redigerer" },
  { key: "opplaster", name: "Opplaster" },
  { key: "kvalitetssjekker", name: "Kvalitetssjekker" },
];

// Standard status values (F6), each with its own color. «Ferdig» counts toward
// earned points; «Ikke behov» removes a step from the denominator (FR2).
export const DEFAULT_STATUS_LABELS: TemplateLabel[] = [
  { title: "Ferdig", color: "#2e7d32", isDone: true },
  { title: "Under arbeid", color: "#f9a825" },
  { title: "Trenger tilbakemelding", color: "#c62828" },
  { title: "Har gitt tilbakemelding", color: "#6a1b9a" },
  { title: "Ikke startet", color: "#90a4ae" },
  { title: "Ikke behov", color: "#546e7a", isNotApplicable: true },
];

// A status production-step column (F5), restricted to the function that owns that
// step so e.g. a Redigerer sees editing steps, not Manus, and carrying its share
// of the earned-points weight (FR2).
function statusStep(
  title: string,
  visibleToFunctions: string[],
  pointWeight: number,
): TemplateColumn {
  return {
    title,
    type: "status",
    labels: DEFAULT_STATUS_LABELS,
    visibleToFunctions,
    role: "step",
    pointWeight,
  };
}

// Note: the «Leksjon» row name is items.name (a pinned first column in the UI),
// not a template column — so the template starts at «Type innhold».
export const DEFAULT_TEMPLATE_COLUMNS: TemplateColumn[] = [
  {
    title: "Type innhold",
    type: "label",
    role: "contentType",
    labels: [
      { title: "Teorivideo", color: "#1565c0", points: 8 },
      { title: "Oppgavevideo", color: "#00838f", points: 5 },
      { title: "Repetisjonsoppgaver", color: "#ad1457", points: 2 },
    ],
  },
  {
    title: "Importert",
    type: "label",
    labels: [
      { title: "Ny", color: "#90a4ae" },
      { title: "Importert", color: "#1565c0" },
    ],
  },
  { title: "Lenke", type: "link" },
  { title: "Ansvarlig", type: "person" },
  // FR10: who edits varies per video, so responsibility is set per row next to «Ansvarlig».
  {
    title: "Redigeringsansvarlig",
    type: "person",
    visibleToFunctions: ["redigerer", "opplaster", "kvalitetssjekker"],
  },
  statusStep("Manus", ["manusforfatter"], 0.15),
  statusStep("Presentasjon", ["presentasjonslager"], 0.15),
  statusStep("Opphavsrett", ["presentasjonslager", "manusforfatter"], 0.05),
  statusStep("Innspilling", ["innspiller"], 0.15),
  statusStep("Kameraopptak", ["kameraoperator"], 0.1),
  statusStep("Klar til redigering", ["redigerer"], 0.05),
  statusStep("Redigering", ["redigerer"], 0.2),
  statusStep("Opplastning", ["opplaster"], 0.05),
  statusStep("Kvalitetssjekk", ["kvalitetssjekker"], 0.1),
  { title: "Beregnet arbeid", type: "number", role: "estimate" },
  { title: "Opparbeidet poeng", type: "number", role: "earned" },
];

export const DEFAULT_COURSE_TEMPLATE = {
  functions: DEFAULT_FUNCTIONS,
  columns: DEFAULT_TEMPLATE_COLUMNS,
} as const;
