// Earned progress for a video ("Opparbeidet poeng", FR2). Computed on read, never
// stored — a stored value would drift the moment a weight or rate is retuned, and
// would force the same rule to live in both TS and SQL. Returns a fraction (0–1)
// that the display layer multiplies by the video's estimated points.

import type { ColumnSettings } from "@/lib/types";

export interface StepColumn {
  id: string;
  settings?: ColumnSettings | null; // reads settings.pointWeight
}

export interface StepLabel {
  isDone: boolean;
  isNotApplicable: boolean;
}

/** The status label chosen per step column for one video. A missing entry or null
 *  labelId means the step has no status yet (in the denominator, not done). */
export type StepCellValues = Readonly<
  Record<string, { labelId?: string | null } | null | undefined>
>;
export type LabelsById = Readonly<Record<string, StepLabel | undefined>>;

const round = (n: number): number => Math.round(n * 1e4) / 1e4;

/**
 * Fraction of a video's work completed (0–1). A step counts as done when its
 * status label is is_done; steps on an is_not_applicable label («Ikke behov»)
 * drop out of the denominator so the remaining weights scale up. Unweighted
 * steps are ignored. Returns 0 (never NaN) when no applicable weighted step
 * remains — e.g. every step is «Ikke behov».
 */
export function earnedPoints(
  stepColumns: readonly StepColumn[],
  cellValues: StepCellValues,
  labels: LabelsById,
): number {
  let applicable = 0;
  let done = 0;
  for (const column of stepColumns) {
    const weight = column.settings?.pointWeight ?? 0;
    // Ignore unweighted, negative or non-finite weights so the result is never NaN.
    if (!Number.isFinite(weight) || weight <= 0) continue;
    const labelId = cellValues[column.id]?.labelId ?? null;
    const label = labelId ? labels[labelId] : undefined;
    if (label?.isNotApplicable) continue; // out of the denominator
    applicable += weight;
    if (label?.isDone) done += weight;
  }
  if (applicable === 0) return 0;
  return round(done / applicable);
}
