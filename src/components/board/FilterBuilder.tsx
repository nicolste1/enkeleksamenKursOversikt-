"use client";

// Filter builder (F13): rows of column → operator («er»/«er ikke») → value,
// combined with one shared and/or combinator, plus one level of groups
// («+ Ny gruppe»). Pure controlled component — owns no state, just maps the
// FilterDefinition to inputs. Value inputs switch on column type; the empty
// choice «(tom)» is value null (see evaluate.ts for the semantics).

import { XIcon } from "lucide-react";

import type { BoardColumn, BoardLabel, BoardPerson } from "@/lib/boards/queries";
import { comparePositions } from "@/lib/ordering/position";
import type {
  FilterCombinator,
  FilterCondition,
  FilterDefinition,
  FilterGroup,
} from "@/lib/filters/filter-model";

const selectClass =
  "border-input bg-background h-7 rounded-md border px-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
const inputClass =
  "border-input bg-background h-7 w-32 rounded-md border px-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/** Columns you can filter on: everything except the computed «Fullført
 *  arbeid» (role: earned) — its value is derived, never stored in a cell. */
export function filterableColumns(columns: BoardColumn[]): BoardColumn[] {
  return columns.filter((c) => c.settings.role !== "earned");
}

export function newCondition(columns: BoardColumn[]): FilterCondition | null {
  const first = filterableColumns(columns)[0];
  if (!first) return null;
  return { kind: "condition", columnId: first.id, operator: "is", value: null };
}

function CombinatorSelect({
  value,
  onChange,
}: {
  value: FilterCombinator;
  onChange: (next: FilterCombinator) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as FilterCombinator)}
      aria-label="Kombinasjon"
      className={selectClass}
    >
      <option value="and">og</option>
      <option value="or">eller</option>
    </select>
  );
}

function ValueInput({
  column,
  condition,
  labelsById,
  people,
  onChange,
}: {
  column: BoardColumn | undefined;
  condition: FilterCondition;
  labelsById: Record<string, BoardLabel>;
  people: BoardPerson[];
  onChange: (value: string | number | null) => void;
}) {
  if (!column) {
    return <span className="text-muted-foreground text-sm">Slettet kolonne</span>;
  }
  switch (column.type) {
    case "status":
    case "label": {
      const labels = Object.values(labelsById)
        .filter((l) => l.columnId === column.id)
        .sort((a, b) => comparePositions(a.position, b.position));
      return (
        <select
          value={typeof condition.value === "string" ? condition.value : ""}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
          aria-label="Verdi"
          className={selectClass}
        >
          <option value="">(tom)</option>
          {labels.map((label) => (
            <option key={label.id} value={label.id}>
              {label.title}
            </option>
          ))}
        </select>
      );
    }
    case "person":
      return (
        <select
          value={typeof condition.value === "string" ? condition.value : ""}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
          aria-label="Verdi"
          className={selectClass}
        >
          <option value="">(tom)</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.fullName ?? person.email}
            </option>
          ))}
        </select>
      );
    case "date":
      return (
        <input
          type="date"
          value={typeof condition.value === "string" ? condition.value : ""}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
          aria-label="Verdi"
          className={inputClass}
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={typeof condition.value === "number" ? condition.value : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : e.target.valueAsNumber)
          }
          placeholder="(tom)"
          aria-label="Verdi"
          className={inputClass}
        />
      );
    case "text":
    case "link":
      return (
        <input
          type="text"
          value={typeof condition.value === "string" ? condition.value : ""}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
          placeholder="(tom)"
          aria-label="Verdi"
          className={inputClass}
        />
      );
  }
}

function ConditionRow({
  condition,
  columns,
  labelsById,
  people,
  onChange,
  onRemove,
}: {
  condition: FilterCondition;
  columns: BoardColumn[];
  labelsById: Record<string, BoardLabel>;
  people: BoardPerson[];
  onChange: (next: FilterCondition) => void;
  onRemove: () => void;
}) {
  const column = columns.find((c) => c.id === condition.columnId);
  return (
    <div className="flex items-center gap-1.5">
      <select
        value={condition.columnId}
        onChange={(e) =>
          // A new column means a new value domain — reset to «(tom)».
          onChange({ ...condition, columnId: e.target.value, value: null })
        }
        aria-label="Kolonne"
        className={selectClass}
      >
        {!column && <option value={condition.columnId}>Slettet kolonne</option>}
        {filterableColumns(columns).map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      <select
        value={condition.operator}
        onChange={(e) =>
          onChange({ ...condition, operator: e.target.value as "is" | "isNot" })
        }
        aria-label="Operator"
        className={selectClass}
      >
        <option value="is">er</option>
        <option value="isNot">er ikke</option>
      </select>
      <ValueInput
        column={column}
        condition={condition}
        labelsById={labelsById}
        people={people}
        onChange={(value) => onChange({ ...condition, value })}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Fjern filter"
        className="text-muted-foreground hover:text-foreground rounded p-1"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
}

export function FilterBuilder({
  definition,
  onChange,
  columns,
  labelsById,
  people,
}: {
  definition: FilterDefinition;
  onChange: (next: FilterDefinition) => void;
  columns: BoardColumn[];
  labelsById: Record<string, BoardLabel>;
  /** Person-column value candidates (workspace members), pre-sorted. */
  people: BoardPerson[];
}) {
  const setRule = (index: number, rule: FilterCondition | FilterGroup) =>
    onChange({
      ...definition,
      rules: definition.rules.map((r, i) => (i === index ? rule : r)),
    });
  const removeRule = (index: number) =>
    onChange({
      ...definition,
      rules: definition.rules.filter((_, i) => i !== index),
    });

  const addCondition = () => {
    const condition = newCondition(columns);
    if (condition) onChange({ ...definition, rules: [...definition.rules, condition] });
  };
  const addGroup = () => {
    const condition = newCondition(columns);
    if (!condition) return;
    onChange({
      ...definition,
      rules: [
        ...definition.rules,
        { kind: "group", combinator: "and", conditions: [condition] },
      ],
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {definition.rules.map((rule, index) => (
        <div key={index} className="flex items-start gap-1.5">
          <span className="flex h-7 w-14 shrink-0 items-center">
            {index === 0 ? (
              <span className="text-muted-foreground px-1.5 text-sm">Der</span>
            ) : (
              // One shared combinator for the whole level (Notion-style):
              // changing it on any row changes them all.
              <CombinatorSelect
                value={definition.combinator}
                onChange={(combinator) => onChange({ ...definition, combinator })}
              />
            )}
          </span>
          {rule.kind === "condition" ? (
            <ConditionRow
              condition={rule}
              columns={columns}
              labelsById={labelsById}
              people={people}
              onChange={(next) => setRule(index, next)}
              onRemove={() => removeRule(index)}
            />
          ) : (
            <div className="border-border flex flex-col gap-1.5 rounded-md border p-2">
              {rule.conditions.map((condition, ci) => (
                <div key={ci} className="flex items-start gap-1.5">
                  <span className="flex h-7 w-14 shrink-0 items-center">
                    {ci === 0 ? (
                      <span className="text-muted-foreground px-1.5 text-sm">Der</span>
                    ) : (
                      <CombinatorSelect
                        value={rule.combinator}
                        onChange={(combinator) => setRule(index, { ...rule, combinator })}
                      />
                    )}
                  </span>
                  <ConditionRow
                    condition={condition}
                    columns={columns}
                    labelsById={labelsById}
                    people={people}
                    onChange={(next) =>
                      setRule(index, {
                        ...rule,
                        conditions: rule.conditions.map((c, i) => (i === ci ? next : c)),
                      })
                    }
                    onRemove={() => {
                      const remaining = rule.conditions.filter((_, i) => i !== ci);
                      if (remaining.length === 0) removeRule(index);
                      else setRule(index, { ...rule, conditions: remaining });
                    }}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const condition = newCondition(columns);
                  if (condition)
                    setRule(index, { ...rule, conditions: [...rule.conditions, condition] });
                }}
                className="text-muted-foreground hover:text-foreground self-start px-1.5 py-0.5 text-sm"
              >
                + Legg til filter
              </button>
            </div>
          )}
        </div>
      ))}
      {definition.rules.length === 0 && (
        <p className="text-muted-foreground text-sm">Ingen filtre.</p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={addCondition}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          + Legg til filter
        </button>
        <button
          type="button"
          onClick={addGroup}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          + Ny gruppe
        </button>
      </div>
    </div>
  );
}
