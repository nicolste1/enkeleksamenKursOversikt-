import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { AppSidebar } from "@/components/nav/AppSidebar";
import { createClient } from "@/lib/supabase/server";
import { getWorkspacesWithCourses } from "@/lib/workspaces/queries";

// Every route in this group is behind auth. Always use getUser() (which
// validates the token with Supabase), never getSession(), for the guard.
// Notion-style shell (M4.5): persistent left sidebar with the course
// navigation; a slim top bar takes over on small screens.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaces = await getWorkspacesWithCourses();

  return (
    <div className="flex h-full min-h-0">
      <AppSidebar workspaces={workspaces} userEmail={user.email ?? ""} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-2 md:hidden">
          <span className="text-sm font-semibold">Enkeleksamen arbeidsflyt</span>
          <LogoutButton />
        </header>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
