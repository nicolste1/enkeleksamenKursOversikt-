"use client";

// Board filter toolbar (F13): the filter popover, «Grupper etter person»,
// saved views and reset. View state (definition + grouping + active view) is
// owned by BoardTable in localStorage — this component only renders and
// updates it. Filtering is a view concern, so it works on archived boards too.

import { FilterIcon, UsersIcon } from "lucide-react";

import { useBoard } from "@/components/board/board-store";
import { FilterBuilder } from "@/components/board/FilterBuilder";
import { SavedViewsMenu } from "@/components/board/SavedViewsMenu";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BoardPerson } from "@/lib/boards/queries";
import {
  EMPTY_FILTER,
  hasConditions,
  type FilterDefinition,
} from "@/lib/filters/filter-model";
import type { SavedView } from "@/lib/views/queries";

export interface BoardViewState {
  definition: FilterDefinition;
  groupByPerson: boolean;
  /** The saved view the definition came from; null once it is edited. */
  activeViewId: string | null;
}

export const EMPTY_VIEW_STATE: BoardViewState = {
  definition: EMPTY_FILTER,
  groupByPerson: false,
  activeViewId: null,
};

function countConditions(definition: FilterDefinition): number {
  return definition.rules.reduce(
    (sum, rule) => sum + (rule.kind === "condition" ? 1 : rule.conditions.length),
    0,
  );
}

export function FilterToolbar({
  viewState,
  setViewState,
  savedViews,
  canGroupByPerson,
}: {
  viewState: BoardViewState;
  setViewState: (next: BoardViewState) => void;
  savedViews: SavedView[];
  /** False when the board has no person column to bucket on. */
  canGroupByPerson: boolean;
}) {
  const { state } = useBoard();

  const people = state.workspaceMemberIds
    .map((id) => state.peopleById[id])
    .filter((p): p is BoardPerson => Boolean(p))
    .sort((a, b) => (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email, "nb"));

  const active = hasConditions(viewState.definition);
  const conditionCount = countConditions(viewState.definition);

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger
          render={
            <Button size="sm" variant={active ? "secondary" : "outline"} aria-label="Filter" />
          }
        >
          <FilterIcon className="size-3.5" />
          Filter
          {conditionCount > 0 && (
            <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 text-xs tabular-nums">
              {conditionCount}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto max-w-[90vw] p-3" align="start">
          <FilterBuilder
            definition={viewState.definition}
            onChange={(definition) =>
              // Editing detaches the filter from its saved view.
              setViewState({ ...viewState, definition, activeViewId: null })
            }
            columns={state.columns}
            labelsById={state.labelsById}
            people={people}
          />
        </PopoverContent>
      </Popover>

      {canGroupByPerson && (
        <Button
          size="sm"
          variant={viewState.groupByPerson ? "secondary" : "outline"}
          onClick={() =>
            setViewState({ ...viewState, groupByPerson: !viewState.groupByPerson })
          }
        >
          <UsersIcon className="size-3.5" />
          Grupper etter person
        </Button>
      )}

      <SavedViewsMenu
        savedViews={savedViews}
        activeViewId={viewState.activeViewId}
        definition={viewState.definition}
        onApply={(view) =>
          setViewState({ ...viewState, definition: view.definition, activeViewId: view.id })
        }
        onDeleted={(viewId) => {
          if (viewState.activeViewId === viewId) {
            setViewState({ ...viewState, activeViewId: null });
          }
        }}
      />

      {(active || viewState.groupByPerson) && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setViewState(EMPTY_VIEW_STATE)}
        >
          Nullstill
        </Button>
      )}
    </div>
  );
}
