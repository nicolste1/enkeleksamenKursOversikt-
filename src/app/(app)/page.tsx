import Link from "next/link";

import { NewCourseDialog } from "@/components/board/NewCourseDialog";
import { ProgressBar } from "@/components/board/ProgressBar";
import {
  colorFor,
  readableTint,
  softBackground,
} from "@/components/board/cells/label-colors";
import {
  getWorkspacesWithCourses,
  type CourseSummary,
} from "@/lib/workspaces/queries";

const pointsFormat = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 });

function CourseCard({ course }: { course: CourseSummary }) {
  const color = colorFor(course.name);
  const { videoCount, estimatedPoints, earnedPoints, fraction } = course.progress;

  return (
    <Link
      href={`/boards/${course.id}`}
      className="block rounded-lg border p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-2.5">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold"
          style={{ backgroundColor: softBackground(color), color: readableTint(color) }}
        >
          {course.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="truncate text-sm font-medium">{course.name}</span>
      </div>
      <div className="mt-3">
        <ProgressBar fraction={fraction} color={color} className="w-full" />
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        {estimatedPoints > 0 ? (
          <>
            {videoCount} videoer · {pointsFormat.format(earnedPoints)} av{" "}
            {pointsFormat.format(estimatedPoints)} poeng ·{" "}
            {Math.round(fraction * 100)} %
          </>
        ) : (
          <>{videoCount} videoer · ingen poengdata ennå</>
        )}
      </p>
    </Link>
  );
}

// Course overview per workspace. «Nytt kurs» is available to every workspace
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
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <h1 className="text-2xl font-semibold">Kursoversikt</h1>

      {workspaces.length === 0 && (
        <p className="text-muted-foreground mt-4 text-sm">
          Du er ikke medlem av noen workspace ennå. Be en administrator legge deg til.
        </p>
      )}

      {workspaces.map((ws) => (
        <section key={ws.id} className="mt-8">
          <div className="flex items-center justify-between gap-3 border-b pb-1.5">
            <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {ws.name}
            </h2>
            <NewCourseDialog workspaceId={ws.id} />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {ws.courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
            {ws.courses.length === 0 && (
              <p className="text-muted-foreground py-1.5 text-sm">
                Ingen aktive kurs ennå.
              </p>
            )}
          </div>

          {ws.isAdmin && ws.archivedCourses.length > 0 && (
            <div className="mt-2">
              {showArchived ? (
                <>
                  <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span className="font-medium tracking-wide uppercase">
                      Arkiverte kurs
                    </span>
                    <Link href="/" className="hover:text-foreground underline">
                      Skjul arkiverte
                    </Link>
                  </div>
                  <ul className="-mx-2 mt-1">
                    {ws.archivedCourses.map((course) => (
                      <li key={course.id}>
                        <Link
                          href={`/boards/${course.id}`}
                          className="hover:bg-muted text-muted-foreground block rounded-md px-2 py-1.5 text-sm"
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
                  className="text-muted-foreground hover:text-foreground text-xs underline"
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
