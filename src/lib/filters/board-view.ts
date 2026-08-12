// Board view derivations (F13): apply a filter to a board's groups and
// re-bucket rows by person for «Grupper etter person». Pure render-time
// helpers — they never touch the reducer, so realtime updates re-derive
// automatically. Imports from boards/queries are TYPE-ONLY (queries.ts pulls
// next/headers, which cannot load under vitest — same rule as the reducer).

import type { BoardGroupData, BoardItem, BoardPerson } from "@/lib/boards/queries";
import { hasConditions, type FilterDefinition } from "@/lib/filters/filter-model";
import { matchesFilter, type FilterContext } from "@/lib/filters/evaluate";

/**
 * Filter each group's items; groups left with zero matching rows are dropped
 * (less noise while filtering). Returns the input array unchanged (same
 * reference) when the definition has no conditions, so an inactive filter
 * causes no re-renders.
 */
export function applyFilterToGroups(
  groups: BoardGroupData[],
  definition: FilterDefinition,
  context: FilterContext,
): BoardGroupData[] {
  if (!hasConditions(definition)) return groups;
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        matchesFilter(definition, item.cells, context),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export interface PersonBucket {
  /** null = «Uten ansvarlig», rendered last. */
  userId: string | null;
  items: BoardItem[];
}

function personDisplayName(person: BoardPerson | undefined): string {
  return person?.fullName ?? person?.email ?? "";
}

/**
 * Flatten (already filtered) groups and re-bucket rows on a person column.
 * Buckets are ordered by display name (nb-NO collation), the null bucket last.
 * Items keep board order (group position, then item position) inside a bucket.
 */
export function groupItemsByPerson(
  groups: BoardGroupData[],
  personColumnId: string,
  peopleById: Readonly<Record<string, BoardPerson>>,
): PersonBucket[] {
  const byUser = new Map<string | null, BoardItem[]>();
  for (const group of groups) {
    for (const item of group.items) {
      const raw = item.cells[personColumnId]?.userId;
      const userId = typeof raw === "string" ? raw : null;
      const bucket = byUser.get(userId);
      if (bucket) {
        bucket.push(item);
      } else {
        byUser.set(userId, [item]);
      }
    }
  }

  const collator = new Intl.Collator("nb-NO");
  const named = [...byUser.entries()]
    .filter((entry): entry is [string, BoardItem[]] => entry[0] !== null)
    .sort((a, b) =>
      collator.compare(
        personDisplayName(peopleById[a[0]]),
        personDisplayName(peopleById[b[0]]),
      ),
    );

  const buckets: PersonBucket[] = named.map(([userId, items]) => ({ userId, items }));
  const unassigned = byUser.get(null);
  if (unassigned) buckets.push({ userId: null, items: unassigned });
  return buckets;
}

/**
 * Item ids whose person cell is unset ({userId: null} or missing) — the rows
 * «Sett redigerer for kurset» fills without overwriting per-row choices (FR10).
 */
export function itemsMissingPersonValue(
  groups: BoardGroupData[],
  personColumnId: string,
): string[] {
  const ids: string[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      const raw = item.cells[personColumnId]?.userId;
      if (typeof raw !== "string") ids.push(item.id);
    }
  }
  return ids;
}
