"use client";

// Notion-style left sidebar (M4.5): workspaces with their courses always one
// click away, «Nytt kurs» per workspace (FR4), signed-in user + logout at the
// bottom. Hidden on small screens (the mobile top bar takes over).

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { NewCourseDialog } from "@/components/board/NewCourseDialog";
import type { WorkspaceWithCourses } from "@/lib/workspaces/queries";

export function AppSidebar({
  workspaces,
  userEmail,
}: {
  workspaces: WorkspaceWithCourses[];
  userEmail: string;
}) {
  const pathname = usePathname();

  const linkClass = (active: boolean) =>
    `block truncate rounded-md px-2 py-1 text-sm transition-colors ${
      active
        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    }`;

  return (
    <aside className="bg-sidebar border-sidebar-border sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r md:flex">
      <div className="px-4 pt-4 pb-2">
        <Link href="/" className="text-sidebar-accent-foreground text-sm font-semibold">
          Enkeleksamen arbeidsflyt
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <Link href="/" className={linkClass(pathname === "/")}>
          Hjem
        </Link>
        <Link
          href="/mine-leksjoner"
          className={linkClass(pathname === "/mine-leksjoner")}
        >
          Mine leksjoner
        </Link>

        {workspaces.map((ws) => (
          <div key={ws.id} className="mt-4">
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                {ws.name}
              </span>
              <NewCourseDialog workspaceId={ws.id} compact />
            </div>
            {ws.courses.map((course) => (
              <Link
                key={course.id}
                href={`/boards/${course.id}`}
                className={linkClass(pathname === `/boards/${course.id}`)}
              >
                {course.name}
              </Link>
            ))}
            {ws.courses.length === 0 && (
              <p className="text-muted-foreground px-2 py-1 text-sm">Ingen kurs ennå</p>
            )}
            {ws.isAdmin && ws.archivedCourses.length > 0 && (
              <Link
                href="/?arkiverte=1"
                className="text-muted-foreground hover:text-sidebar-accent-foreground block px-2 py-1 text-xs"
              >
                Arkiverte kurs ({ws.archivedCourses.length})
              </Link>
            )}
          </div>
        ))}
      </nav>

      <div className="border-sidebar-border flex items-center justify-between gap-2 border-t px-3 py-2.5">
        <span className="text-muted-foreground truncate text-xs">{userEmail}</span>
        <LogoutButton />
      </div>
    </aside>
  );
}
