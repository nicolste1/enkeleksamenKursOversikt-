// Estimated work for a video ("Arbeid") derives from its content type (FR1):
// a content-type label with a fixed rate (Teorivideo 10, Artikkel 5, …) wins;
// otherwise — «Repetisjonsoppgaver», whose label carries no points — the
// estimate is question count × rate per question, where the rate comes from
// the «Oppgavetype» label (Matematikk = 1.0) or the column's configured
// default (0.5). This is only the starting value written into the cell; it
// stays manually overridable, so it is used at create time and when the
// inputs change without a manual override — not on every read.

/** Rate per question when neither an «Oppgavetype» label nor a configured
 *  column default applies. Mirrors the team's Monday setup. */
export const FALLBACK_POINTS_PER_QUESTION = 0.5;

export interface PointsLabel {
  /** Points configured on the label; null/absent means unset. */
  points?: number | null;
}

export interface EstimateInput {
  /** The video's «Type innhold» label, if any. */
  contentTypeLabel?: PointsLabel | null;
  /** The video's «Antall spørsmål» cell value, if any. */
  questionCount?: number | null;
  /** The video's «Oppgavetype» label, whose points are the rate per question. */
  questionRateLabel?: PointsLabel | null;
  /** Rate per question when no questionRateLabel is set (columns.settings). */
  defaultPointsPerQuestion?: number | null;
}

/** Estimated points for a video (0 when nothing applies; never negative). */
export function estimatedPoints(input: EstimateInput): number {
  const typePoints = input.contentTypeLabel?.points;
  if (typePoints != null && Number.isFinite(typePoints)) {
    return Math.max(0, typePoints);
  }

  const count = input.questionCount;
  if (count != null && Number.isFinite(count) && count > 0) {
    const rate =
      input.questionRateLabel?.points ??
      input.defaultPointsPerQuestion ??
      FALLBACK_POINTS_PER_QUESTION;
    if (Number.isFinite(rate)) return Math.max(0, count * rate);
  }
  return 0;
}
