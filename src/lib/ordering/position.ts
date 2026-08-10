// Ordering for boards, groups, columns, items and labels. Fractional indexing
// means a move is a single-row update (one realtime event, no renumbering that
// would collide under concurrent edits — N3). Thin wrapper over the well-tested
// `fractional-indexing` package so callers never import it directly.

import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

/** A position that sorts strictly between `before` and `after`.
 *  Pass null for an open end (start or end of the list). */
export function positionBetween(
  before: string | null,
  after: string | null,
): string {
  return generateKeyBetween(before, after);
}

/** `count` positions in ascending order for seeding a fresh list. */
export function initialPositions(count: number): string[] {
  if (count <= 0) return [];
  return generateNKeysBetween(null, null, count);
}
