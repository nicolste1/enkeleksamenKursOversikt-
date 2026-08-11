"use client";

// Read-only board table. Column focus: visibleColumns() filters by the
// signed-in user's production functions, with a personal «Vis alle kolonner»
// toggle — a UI declutter, never an access boundary (RLS handles access).
// Collapse state and the toggle persist per board in localStorage.

import { BoardGroup } from "@/components/board/BoardGroup";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { visibleColumns } from "@/lib/access/column-visibility";
import type { BoardData } from "@/lib/boards/queries";
import type { StepColumn, LabelsById } from "@/lib/points/earned";

export interface PointsContext {
  stepColumns: StepColumn[];
  labelProgressById: LabelsById;
  estimateColumnId: string | null;
}

// Stable fallback references (useLocalStorage relies on constant fallbacks).
const NO_COLLAPSED: Record<string, boolean> = {};

export function BoardTable({ board }: { board: BoardData }) {
  const [showAll, setShowAll] = useLocalStorage(
    `board:${board.id}:showAllColumns`,
    false,
  );
  const [collapsed, setCollapsed] = useLocalStorage(
    `board:${board.id}:collapsedGroups`,
    NO_COLLAPSED,
  );

  const toggleShowAll = () => setShowAll(!showAll);
  const toggleGroup = (groupId: string) =>
    setCollapsed({ ...collapsed, [groupId]: !collapsed[groupId] });

  const hasFunctions = board.userFunctionIds.length > 0;
  // Without functions there is nothing to focus on — show everything.
  const effectiveShowAll = showAll || !hasFunctions;
  const columns = visibleColumns(board.columns, board.userFunctionIds, effectiveShowAll);

  const pointsContext: PointsContext = {
    stepColumns: board.columns
      .filter((c) => c.settings.role === "step")
      .map((c) => ({ id: c.id, settings: c.settings })),
    labelProgressById: Object.fromEntries(
      Object.values(board.labelsById).map((l) => [l.id, { progress: l.progress }]),
    ),
    estimateColumnId:
      board.columns.find((c) => c.settings.role === "estimate")?.id ?? null,
  };

  return (
    <div className="flex flex-col gap-3">
      {hasFunctions && (
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={toggleShowAll}>
            {effectiveShowAll ? "Vis mine kolonner" : "Vis alle kolonner"}
          </Button>
          <span className="text-muted-foreground text-xs">
            {columns.length} av {board.columns.length} kolonner
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="bg-muted/50 sticky left-0 z-10 border-b px-3 py-2 font-medium">
                Leksjon
              </th>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className="text-muted-foreground border-b px-3 py-2 font-medium whitespace-nowrap"
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          {board.groups.map((group) => (
            <BoardGroup
              key={group.id}
              group={group}
              columns={columns}
              labelsById={board.labelsById}
              peopleById={board.peopleById}
              pointsContext={pointsContext}
              collapsed={collapsed[group.id] ?? false}
              onToggle={() => toggleGroup(group.id)}
            />
          ))}
        </table>
        {board.groups.length === 0 && (
          <p className="text-muted-foreground px-4 py-6 text-sm">
            Kurset har ingen delkapitler ennå. Struktur og videoer kan legges til når
            redigering kommer i neste milepæl.
          </p>
        )}
      </div>
    </div>
  );
}
