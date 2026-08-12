"use client";

// The board table (M4: editable). Column focus: visibleColumns() filters by
// the signed-in user's production functions, with a personal «Vis alle
// kolonner» toggle — a UI declutter, never an access boundary (RLS handles
// access). Collapse state and the toggle persist per board in localStorage.

import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { AddColumnMenu } from "@/components/board/AddColumnMenu";
import type { PointsContext } from "@/components/board/board-points";
import { useBoard } from "@/components/board/board-store";
import { BoardGroup } from "@/components/board/BoardGroup";
import { ColumnHeaderMenu } from "@/components/board/ColumnHeaderMenu";
import {
  EMPTY_VIEW_STATE,
  FilterToolbar,
  type BoardViewState,
} from "@/components/board/FilterToolbar";
import { PersonGroupSection } from "@/components/board/PersonGroupSection";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { visibleColumns } from "@/lib/access/column-visibility";
import {
  applyFilterToGroups,
  groupItemsByPerson,
} from "@/lib/filters/board-view";
import type { FilterContext } from "@/lib/filters/evaluate";
import {
  EMPTY_FILTER,
  hasConditions,
  isValidFilterDefinition,
} from "@/lib/filters/filter-model";
import type { SavedView } from "@/lib/views/queries";

// Stable fallback references (useLocalStorage relies on constant fallbacks).
const NO_COLLAPSED: Record<string, boolean> = {};
const NO_VIEWS: SavedView[] = [];

function AddGroupButton() {
  const { addGroup } = useBoard();
  const [name, setName] = useState("");

  return (
    <form
      className="flex items-center gap-1.5 px-1 py-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        addGroup(name);
        setName("");
      }}
    >
      <PlusIcon className="text-muted-foreground size-3.5" />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nytt delkapittel …"
        className="placeholder:text-muted-foreground/70 w-64 bg-transparent py-0.5 text-sm outline-none"
      />
    </form>
  );
}

export function BoardTable({ savedViews = NO_VIEWS }: { savedViews?: SavedView[] }) {
  const store = useBoard();
  const { state } = store;

  const [showAll, setShowAll] = useLocalStorage(
    `board:${state.id}:showAllColumns`,
    false,
  );
  const [collapsed, setCollapsed] = useLocalStorage(
    `board:${state.id}:collapsedGroups`,
    NO_COLLAPSED,
  );
  const [storedView, setViewState] = useLocalStorage(
    `board:${state.id}:view`,
    EMPTY_VIEW_STATE,
  );
  // useLocalStorage only guards typeof — validate the untrusted definition
  // properly so a stale/corrupt stored filter cannot crash the evaluator.
  const viewState: BoardViewState = isValidFilterDefinition(storedView.definition)
    ? storedView
    : { ...storedView, definition: EMPTY_FILTER, activeViewId: null };

  const toggleGroup = (groupId: string) =>
    setCollapsed({ ...collapsed, [groupId]: !collapsed[groupId] });

  const hasFunctions = state.userFunctionIds.length > 0;
  // Without functions there is nothing to focus on — show everything.
  const effectiveShowAll = showAll || !hasFunctions;
  const columns = visibleColumns(state.columns, state.userFunctionIds, effectiveShowAll);

  const pointsContext: PointsContext = {
    stepColumns: state.columns
      .filter((c) => c.settings.role === "step")
      .map((c) => ({ id: c.id, settings: c.settings })),
    labelProgressById: Object.fromEntries(
      Object.values(state.labelsById).map((l) => [l.id, { progress: l.progress }]),
    ),
    estimateColumnId:
      state.columns.find((c) => c.settings.role === "estimate")?.id ?? null,
  };

  const canManageColumns = store.allows("manageColumns");

  // Filtering and person grouping are render-time derivations over reducer
  // state — realtime events re-derive automatically. Rollups downstream
  // (BoardGroup/PersonGroupSection) compute from what they receive, so they
  // reflect the filtered rows without further wiring.
  const filterContext: FilterContext = {
    columnTypeById: Object.fromEntries(state.columns.map((c) => [c.id, c.type])),
  };
  const filterActive = hasConditions(viewState.definition);
  const filteredGroups = applyFilterToGroups(
    state.groups,
    viewState.definition,
    filterContext,
  );
  const personColumn =
    state.columns.find((c) => c.settings.role === "responsible") ??
    state.columns.find((c) => c.type === "person") ??
    null;
  const personBuckets =
    viewState.groupByPerson && personColumn
      ? groupItemsByPerson(filteredGroups, personColumn.id, state.peopleById)
      : null;
  // Adding rows while a filter hides them (or into synthesized person
  // buckets) reads as «raden forsvant» — hide the add affordances instead.
  const structureEditable = !filterActive && personBuckets === null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {state.error && (
        <div className="bg-destructive/10 text-destructive flex items-center justify-between rounded-lg px-3 py-2 text-sm">
          <span>{state.error} — visningen er oppdatert fra serveren.</span>
          <Button variant="ghost" size="xs" onClick={store.clearError}>
            Lukk
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <FilterToolbar
          viewState={viewState}
          setViewState={setViewState}
          savedViews={savedViews}
          canGroupByPerson={personColumn !== null}
        />
        {hasFunctions && (
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={() => setShowAll(!showAll)}>
              {effectiveShowAll ? "Vis mine kolonner" : "Vis alle kolonner"}
            </Button>
            <span className="text-muted-foreground text-xs">
              {columns.length} av {state.columns.length} kolonner
            </span>
          </div>
        )}
      </div>

      {/* Fills the remaining viewport height (flex-1) instead of a fixed max
          height, so the lesson list runs all the way to the bottom edge. */}
      <div className="min-h-0 flex-1 overflow-auto rounded-t-lg border border-b-0">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="text-left">
              <th className="bg-background sticky top-0 left-0 z-30 border-r border-b px-2 py-1.5 text-xs font-medium">
                Leksjon
              </th>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className="bg-background text-muted-foreground sticky top-0 z-20 border-b px-2 py-1.5 text-xs font-medium whitespace-nowrap"
                >
                  {canManageColumns ? (
                    <ColumnHeaderMenu
                      column={column}
                      visibleColumnIds={columns.map((c) => c.id)}
                    />
                  ) : (
                    column.title
                  )}
                </th>
              ))}
              {canManageColumns && (
                <th className="bg-background sticky top-0 z-20 w-8 border-b px-2 py-1.5">
                  <AddColumnMenu />
                </th>
              )}
            </tr>
          </thead>
          {personBuckets !== null
            ? personBuckets.map((bucket) => (
                <PersonGroupSection
                  key={bucket.userId ?? "unassigned"}
                  bucket={bucket}
                  columns={columns}
                  colSpan={columns.length + (canManageColumns ? 2 : 1)}
                  pointsContext={pointsContext}
                />
              ))
            : filteredGroups.map((group) => (
                <BoardGroup
                  key={group.id}
                  group={group}
                  columns={columns}
                  colSpan={columns.length + (canManageColumns ? 2 : 1)}
                  pointsContext={pointsContext}
                  collapsed={collapsed[group.id] ?? false}
                  onToggle={() => toggleGroup(group.id)}
                  hideAddItem={!structureEditable}
                />
              ))}
        </table>
        {state.groups.length === 0 && (
          <p className="text-muted-foreground px-4 py-6 text-sm">
            Kurset har ingen delkapitler ennå.
          </p>
        )}
        {state.groups.length > 0 &&
          (personBuckets !== null
            ? personBuckets.length === 0
            : filteredGroups.length === 0) && (
            <p className="text-muted-foreground px-4 py-6 text-sm">
              {filterActive
                ? "Ingen leksjoner matcher filteret."
                : "Ingen leksjoner å gruppere."}
            </p>
          )}
        {structureEditable && store.allows("editItems") && <AddGroupButton />}
      </div>
    </div>
  );
}
