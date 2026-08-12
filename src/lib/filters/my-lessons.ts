// «Mine leksjoner» pre-filter (F13/FR9): Redigeringsansvarlig = me AND «Klar
// til redigering» = «Ja» — the editing work queue keys on who EDITS the
// lesson, not the general «Ansvarlig» (decided 2026-08-12). Label ids are
// board-local, so the definition is built per board from resolved ids — the
// evaluation itself is the exact same matchesFilter as the board filter
// (that sharing is the point of the model).

import type {
  FilterCondition,
  FilterDefinition,
  FilterGroup,
} from "@/lib/filters/filter-model";

export function buildMyLessonsDefinition(params: {
  /** The person column that must equal me («Redigeringsansvarlig»). */
  personColumnId: string;
  /** null when the board has no «Klar til redigering» column — the board
   *  opted out of the signal, so only the responsible condition applies. */
  readyColumnId: string | null;
  /** Ids of the labels meaning «Ja» (title-matched per board; several ids
   *  are possible if labels were duplicated). Empty = skip the condition. */
  jaLabelIds: string[];
  myUserId: string;
}): FilterDefinition {
  const rules: (FilterCondition | FilterGroup)[] = [
    {
      kind: "condition",
      columnId: params.personColumnId,
      operator: "is",
      value: params.myUserId,
    },
  ];
  if (params.readyColumnId !== null && params.jaLabelIds.length > 0) {
    rules.push({
      kind: "group",
      combinator: "or",
      conditions: params.jaLabelIds.map((labelId) => ({
        kind: "condition",
        columnId: params.readyColumnId as string,
        operator: "is",
        value: labelId,
      })),
    });
  }
  return { combinator: "and", rules };
}

/** The per-board «Ja»-label resolution: case-insensitive title match. Known
 *  limitation (decided 2026-08-12): a renamed Ja-label drops the course out
 *  of the pre-filter — the column itself is rename-proof via role. */
export function isJaLabelTitle(title: string): boolean {
  return title.trim().toLowerCase() === "ja";
}
