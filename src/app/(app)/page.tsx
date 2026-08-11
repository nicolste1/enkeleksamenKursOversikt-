import Link from "next/link";

import { NewCourseDialog } from "@/components/board/NewCourseDialog";
import { getWorkspacesWithCourses } from "@/lib/workspaces/queries";

// Course list per workspace. «Nytt kurs» is available to every workspace
// member (FR4); archived courses are hidden behind a toggle for admins (FR5).
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ arkiverte?: string }>;
}) {
  const { arkiverte } = await searchParams;
  const showArchived = arkiverte === "1";
  const workspaces = await getWorkspacesWithCourses();

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Kursoversikt</h1>

      {workspaces.length === 0 && (
        <p className="text-muted-foreground mt-4 text-sm">
          Du er ikke medlem av noen workspace ennå. Be en administrator legge deg til.
        </p>
      )}

      {workspaces.map((ws) => (
        <section key={ws.id} className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium">{ws.name}</h2>
            <NewCourseDialog workspaceId={ws.id} />
          </div>

          <ul className="mt-3 divide-y rounded-lg border">
            {ws.courses.map((course) => (
              <li key={course.id}>
                <Link
                  href={`/boards/${course.id}`}
                  className="hover:bg-muted/50 block px-4 py-3 text-sm"
                >
                  {course.name}
                </Link>
              </li>
            ))}
            {ws.courses.length === 0 && (
              <li className="text-muted-foreground px-4 py-3 text-sm">
                Ingen aktive kurs ennå.
              </li>
            )}
          </ul>

          {ws.isAdmin && ws.archivedCourses.length > 0 && (
            <div className="mt-3">
              {showArchived ? (
                <>
                  <div className="text-muted-foreground flex items-center justify-between text-xs font-medium tracking-wide uppercase">
                    <span>Arkiverte kurs</span>
                    <Link href="/" className="hover:text-foreground underline">
                      Skjul arkiverte
                    </Link>
                  </div>
                  <ul className="mt-2 divide-y rounded-lg border border-dashed">
                    {ws.archivedCourses.map((course) => (
                      <li key={course.id}>
                        <Link
                          href={`/boards/${course.id}`}
                          className="hover:bg-muted/50 text-muted-foreground block px-4 py-3 text-sm"
                        >
                          {course.name}
                          <span className="bg-muted ml-2 rounded px-1.5 py-0.5 text-xs">
                            Arkivert
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <Link
                  href="/?arkiverte=1"
                  className="text-muted-foreground hover:text-foreground text-sm underline"
                >
                  Vis arkiverte kurs ({ws.archivedCourses.length})
                </Link>
              )}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
