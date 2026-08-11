// Earned progress for a video ("Fullført arbeid", FR2 — matches the team's real
// Monday usage, reverse-engineered from their board export). Each status label
// carries a `progress` share (Ferdig=1, Har gitt tilbakemelding=0.75, Trenger
// tilbakemelding=0.5, Under arbeid=0.25, Ikke startet=0, Ikke behov=1 — the
// share is GRANTED, there is no denominator rescaling). Computed on read, never
// stored — a stored value would drift the moment a weight or rate is retuned.
// Returns a fraction (0–1) that the display layer multiplies by the video's
// estimated points.

import type { ColumnSettings } from "@/lib/types";

export interface StepColumn {
  id: string;
  settings?: ColumnSettings | null; // reads settings.pointWeight
}

export interface StepLabel {
  /** Share of the step's weight earned by this label (column_labels.progress). */
  progress: number;
}

/** The status label chosen per step column for one video. A missing entry or null
 *  labelId means the step has no status yet (weight counted, nothing earned). */
export type StepCellValues = Readonly<
  Record<string, { labelId?: string | null } | null | undefined>
>;
export type LabelsById = Readonly<Record<string, StepLabel | undefined>>;

const round = (n: number): number => Math.round(n * 1e4) / 1e4;

/**
 * Fraction of a video's work completed (0–1): Σ(weight × label progress),
 * normalized by Σ(weight) so boards whose weights don't sum to 1 still land in
 * 0–1 (identical to the raw sum when they do). Steps with weight 0 — e.g.
 * «Opphavsrett» in the default template — are tracked but never counted.
 * Returns 0 (never NaN) when no weighted step exists.
 */
export function earnedPoints(
  stepColumns: readonly StepColumn[],
  cellValues: StepCellValues,
  labels: LabelsById,
): number {
  let totalWeight = 0;
  let earned = 0;
  for (const column of stepColumns) {
    const weight = column.settings?.pointWeight ?? 0;
    // Ignore unweighted, negative or non-finite weights so the result is never NaN.
    if (!Number.isFinite(weight) || weight <= 0) continue;
    totalWeight += weight;
    const labelId = cellValues[column.id]?.labelId ?? null;
    const progress = (labelId ? labels[labelId]?.progress : undefined) ?? 0;
    if (!Number.isFinite(progress) || progress <= 0) continue;
    earned += weight * Math.min(progress, 1);
  }
  if (totalWeight === 0) return 0;
  return round(earned / totalWeight);
}
