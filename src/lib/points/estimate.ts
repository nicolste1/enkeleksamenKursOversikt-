// Estimated work for a video ("Beregnet arbeid") derives from the points set on
// its content-type label (FR1). This is only the starting value written into the
// cell; it stays manually overridable, so this function is used at create time
// and when the content type changes without a manual override — not on every read.

export interface ContentTypeLabel {
  /** Points configured on a «Type innhold» label; null/absent means unset. */
  points?: number | null;
}

/** Estimated points for the given content-type label (0 when unset). */
export function estimatedPoints(
  contentTypeLabel: ContentTypeLabel | null | undefined,
): number {
  return contentTypeLabel?.points ?? 0;
}
