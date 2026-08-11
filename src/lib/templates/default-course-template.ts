// Default course template (F5 columns + F6 statuses + production functions),
// aligned with the team's real Monday usage (weights, labels and extra columns
// reverse-engineered from their board export) and the FR business rules.
// Copy-on-create: createBoardFromTemplate materializes these as real columns,
// labels and functions the board then owns. Kept as a typed constant (not a DB
// table) for MVP — template-management UI is a week-2 feature.
//
// `visibleToFunctions` here references function `key`s; on board creation the
// keys are resolved to the created function ids and written to columns.settings.
//
// NOTE: the default rates (label.points) and step weights (pointWeight) are the
// team's proven values — still tunable per board. Weights across the production
// steps sum to 1.0; «Opphavsrett» is tracked but carries no weight, and «Klar
// til redigering» is a plain Ja/Nei signal outside the points model (FR9).

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
  /** Share of a step's weight earned by this label (FR2); status labels only. */
  progress?: number;
  /** Points: fixed estimate on «Type innhold», rate per question on «Oppgavetype» (FR1). */
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
  /** questionRate columns: rate per question when no label is set (FR1). */
  defaultPointsPerQuestion?: number;
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

// Standard status values (F6), each with its own color and earned share (FR2).
// «Ikke behov» grants the full share — the step costs nothing extra, so the
// video can still reach 100 % (no denominator rescaling).
export const DEFAULT_STATUS_LABELS: TemplateLabel[] = [
  { title: "Ferdig", color: "#2e7d32", isDone: true, progress: 1 },
  { title: "Under arbeid", color: "#f9a825", progress: 0.25 },
  { title: "Trenger tilbakemelding", color: "#c62828", progress: 0.5 },
  { title: "Har gitt tilbakemelding", color: "#6a1b9a", progress: 0.75 },
  { title: "Ikke startet", color: "#90a4ae", progress: 0 },
  { title: "Ikke behov", color: "#546e7a", isNotApplicable: true, progress: 1 },
];

// A status production-step column (F5), restricted to the function that owns
// that step so e.g. a Redigerer sees editing steps, not Manus, and carrying its
// share of the earned-points weight (FR2).
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
      { title: "Teorivideo", color: "#1565c0", points: 10 },
      { title: "Oppgavevideo", color: "#00838f", points: 10 },
      { title: "Kombivideo", color: "#5e35b1", points: 10 },
      // No fixed points: the estimate derives from «Antall spørsmål» × rate (FR1).
      { title: "Repetisjonsoppgaver", color: "#ad1457" },
      { title: "Artikkel", color: "#6d4c41", points: 5 },
    ],
  },
  {
    title: "Importert",
    type: "label",
    labels: [
      { title: "Ny", color: "#90a4ae" },
      { title: "Noe gjenbruk", color: "#f9a825" },
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
  statusStep("Manus", ["manusforfatter"], 0.4),
  statusStep("Presentasjon", ["presentasjonslager"], 0.25),
  // Tracked for its own sake, but earns nothing — the team's proven setup.
  statusStep("Opphavsrett", ["presentasjonslager", "manusforfatter"], 0),
  statusStep("Innspilling", ["innspiller"], 0.15),
  statusStep("Kameraopptak", ["kameraoperator"], 0.05),
  // FR9: a deliberate manual Ja/Nei signal, outside the points model — set by
  // the recording side, read by the editing side.
  {
    title: "Klar til redigering",
    type: "label",
    visibleToFunctions: ["innspiller", "kameraoperator", "redigerer"],
    labels: [
      { title: "Ja", color: "#2e7d32" },
      { title: "Nei", color: "#90a4ae" },
      { title: "Ikke behov", color: "#546e7a" },
    ],
  },
  statusStep("Redigering", ["redigerer"], 0.05),
  statusStep("Opplastning", ["opplaster"], 0.05),
  statusStep("Kvalitetssjekk", ["kvalitetssjekker"], 0.05),
  { title: "Antall spørsmål", type: "number", role: "questionCount" },
  {
    title: "Oppgavetype",
    type: "label",
    role: "questionRate",
    defaultPointsPerQuestion: 0.5,
    labels: [{ title: "Matematikk", color: "#1565c0", points: 1 }],
  },
  { title: "Arbeid", type: "number", role: "estimate" },
  { title: "Fullført arbeid", type: "number", role: "earned" },
  {
    title: "Innholdskategori",
    type: "label",
    labels: [
      { title: "Leksjon", color: "#1565c0" },
      { title: "Introduksjonsvideo", color: "#00838f" },
      { title: "Eksamensanalyse", color: "#ad1457" },
      { title: "Annet", color: "#90a4ae" },
    ],
  },
];

export const DEFAULT_COURSE_TEMPLATE = {
  functions: DEFAULT_FUNCTIONS,
  columns: DEFAULT_TEMPLATE_COLUMNS,
} as const;
