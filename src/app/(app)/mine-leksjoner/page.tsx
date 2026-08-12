import Link from "next/link";

import { itemPoints } from "@/components/board/board-points";
import { CellDisplay } from "@/components/board/CellDisplay";
import { getMyLessons } from "@/lib/my-lessons/queries";

// «Mine leksjoner» (F13/FR9): the editor's cross-course work queue — every
// lesson where Redigeringsansvarlig = me and «Klar til redigering» = «Ja».
// Read-only in v1 (editing happens on the board, where realtime and
// recalculation already live); Server Component, no realtime by design.
export default async function MyLessonsPage() {
  const sections = await getMyLessons();
  const lessonCount = sections.reduce((sum, s) => sum + s.rows.length, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
      <div>
        <h1 className="text-xl font-semibold">Mine leksjoner</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {lessonCount === 0
            ? "Leksjoner du er redigeringsansvarlig for og som er klare til redigering."
            : `${lessonCount} ${lessonCount === 1 ? "leksjon" : "leksjoner"} i ${sections.length} kurs — redigeringsansvarlig: deg, klar til redigering: Ja.`}
        </p>
      </div>

      {sections.length === 0 && (
        <div className="bg-muted/40 rounded-lg border px-4 py-6">
          <p className="text-sm">
            Ingen leksjoner venter på deg — du står ikke som redigeringsansvarlig
            for noen leksjoner som er klare til redigering. 🎉
          </p>
        </div>
      )}

      {sections.map((section) => (
        <section key={section.boardId} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold">{section.boardName}</h2>
            <Link
              href={`/boards/${section.boardId}`}
              className="text-muted-foreground hover:text-foreground shrink-0 text-sm underline underline-offset-2"
            >
              Åpne kurset →
            </Link>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr className="text-left">
                  <th className="bg-background text-muted-foreground border-b px-2 py-1.5 text-xs font-medium">
                    Leksjon
                  </th>
                  <th className="bg-background text-muted-foreground border-b px-2 py-1.5 text-xs font-medium">
                    Delkapittel
                  </th>
                  {section.columns.map((column) => (
                    <th
                      key={column.id}
                      className="bg-background text-muted-foreground border-b px-2 py-1.5 text-xs font-medium whitespace-nowrap"
                    >
                      {column.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map(({ item, groupName }) => {
                  const points = itemPoints(item, section.pointsContext);
                  return (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-2 py-1.5 font-medium whitespace-nowrap">
                        {item.name}
                      </td>
                      <td className="text-muted-foreground px-2 py-1.5 whitespace-nowrap">
                        {groupName}
                      </td>
                      {section.columns.map((column) => (
                        <td key={column.id} className="px-2 py-1.5 whitespace-nowrap">
                          <CellDisplay
                            column={column}
                            value={item.cells[column.id]}
                            labelsById={section.labelsById}
                            peopleById={section.peopleById}
                            computedEarned={points?.earned ?? null}
                            earnedFraction={points?.fraction ?? null}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
