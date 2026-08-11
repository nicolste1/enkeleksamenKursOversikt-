// Course-list data for the home page: every workspace the signed-in user can
// see, with its active and archived courses. All database access lives here
// (never in components); RLS is the real gate — these queries only shape data.

import { comparePositions } from "@/lib/ordering/position";
import { createClient } from "@/lib/supabase/server";

export interface CourseSummary {
  id: string;
  name: string;
  archivedAt: string | null;
}

export interface WorkspaceWithCourses {
  id: string;
  name: string;
  /** Site admin or workspace admin — may see archived courses (FR5). */
  isAdmin: boolean;
  courses: CourseSummary[];
  archivedCourses: CourseSummary[];
}

export async function getWorkspacesWithCourses(): Promise<WorkspaceWithCourses[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [profileRes, workspacesRes, membershipsRes, boardsRes] = await Promise.all([
    supabase.from("profiles").select("is_site_admin").eq("id", user.id).maybeSingle(),
    supabase.from("workspaces").select("id, name").order("name"),
    supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id),
    supabase
      .from("boards")
      .select("id, workspace_id, name, archived_at, position")
      .is("deleted_at", null),
  ]);
  const firstError =
    profileRes.error ?? workspacesRes.error ?? membershipsRes.error ?? boardsRes.error;
  if (firstError) throw new Error(`Kunne ikke hente kurslisten: ${firstError.message}`);

  const isSiteAdmin = profileRes.data?.is_site_admin ?? false;
  const roleByWorkspace = new Map(
    (membershipsRes.data ?? []).map((m) => [m.workspace_id, m.role]),
  );

  // Sort in code: fractional-index keys need byte-order comparison, which
  // `order by position` only gives under C collation.
  const sortedBoards = (boardsRes.data ?? [])
    .slice()
    .sort((a, b) => comparePositions(a.position, b.position));

  return (workspacesRes.data ?? []).map((ws) => {
    const boards = sortedBoards.filter((b) => b.workspace_id === ws.id);
    const toSummary = (b: (typeof boards)[number]): CourseSummary => ({
      id: b.id,
      name: b.name,
      archivedAt: b.archived_at,
    });
    const role = roleByWorkspace.get(ws.id) ?? null;
    return {
      id: ws.id,
      name: ws.name,
      isAdmin: isSiteAdmin || role === "admin",
      courses: boards.filter((b) => b.archived_at === null).map(toSummary),
      archivedCourses: boards.filter((b) => b.archived_at !== null).map(toSummary),
    };
  });
}
