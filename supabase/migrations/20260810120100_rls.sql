-- Row Level Security: helper functions + policies. This is the project's #1
-- risk area (data must not leak between teams/courses), so access is centralized
-- in three SECURITY DEFINER helpers and every table reuses the same shapes.

-- ---------------------------------------------------------------------------
-- Helper functions in the private schema (NOT exposed via PostgREST).
-- SECURITY DEFINER so they bypass RLS on the tables they read (avoids policy
-- recursion); STABLE so the planner can cache within a statement.
-- ---------------------------------------------------------------------------
create or replace function private.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_site_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function private.workspace_role(ws_id uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = ''
as $$
  select wm.role
  from public.workspace_members wm
  where wm.workspace_id = ws_id
    and wm.user_id = auth.uid();
$$;

-- Effective board role, in precedence order:
--   1. site admin                         -> 'admin'
--   2. workspace-admin of the board's ws  -> 'admin'
--   3. explicit board membership          -> its role
--   4. otherwise                          -> null (no access)
create or replace function private.board_access(b_id uuid)
returns public.board_role
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.is_site_admin() then 'admin'::public.board_role
    when (
      select wm.role
      from public.workspace_members wm
      join public.boards b on b.workspace_id = wm.workspace_id
      where b.id = b_id and wm.user_id = auth.uid()
    ) = 'admin' then 'admin'::public.board_role
    else (
      select bm.role
      from public.board_members bm
      where bm.board_id = b_id and bm.user_id = auth.uid()
    )
  end;
$$;

-- True when a board is archived (FR5): content becomes read-only in the DB.
create or replace function private.board_archived(b_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.boards b
    where b.id = b_id and b.archived_at is not null
  );
$$;

-- Callers (anon/authenticated) need schema usage + execute so policies that
-- call these functions evaluate (returning 0 rows) instead of erroring.
grant usage on schema private to anon, authenticated;
grant execute on function private.is_site_admin()          to anon, authenticated;
grant execute on function private.workspace_role(uuid)     to anon, authenticated;
grant execute on function private.board_access(uuid)       to anon, authenticated;
grant execute on function private.board_archived(uuid)     to anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles: everyone signed in can read (needed for person columns/avatars);
-- a user may edit only their own row, and only safe columns. Column-level
-- grants prevent self-escalation via is_site_admin.
-- ---------------------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------
create policy "workspaces_select" on public.workspaces
  for select to authenticated
  using ((select private.is_site_admin()) or private.workspace_role(id) is not null);
create policy "workspaces_insert" on public.workspaces
  for insert to authenticated
  with check ((select private.is_site_admin()));
create policy "workspaces_update" on public.workspaces
  for update to authenticated
  using ((select private.is_site_admin()) or private.workspace_role(id) = 'admin')
  with check ((select private.is_site_admin()) or private.workspace_role(id) = 'admin');
create policy "workspaces_delete" on public.workspaces
  for delete to authenticated
  using ((select private.is_site_admin()) or private.workspace_role(id) = 'admin');

create policy "workspace_members_select" on public.workspace_members
  for select to authenticated
  using ((select private.is_site_admin()) or private.workspace_role(workspace_id) is not null);
create policy "workspace_members_mutate" on public.workspace_members
  for all to authenticated
  using ((select private.is_site_admin()) or private.workspace_role(workspace_id) = 'admin')
  with check ((select private.is_site_admin()) or private.workspace_role(workspace_id) = 'admin');

-- ---------------------------------------------------------------------------
-- boards
-- ---------------------------------------------------------------------------
create policy "boards_select" on public.boards
  for select to authenticated
  using (private.board_access(id) is not null);
-- FR4: any workspace member may create a course.
create policy "boards_insert" on public.boards
  for insert to authenticated
  with check ((select private.is_site_admin()) or private.workspace_role(workspace_id) is not null);

-- Since board_access ignores boards.created_by, a plain member who inserts a board
-- would get board_access = null the instant the INSERT commits and lose their own
-- course. This trigger grants the creator board-admin atomically, closing that gap
-- regardless of how the board is created (it's the DB-level guarantee behind
-- createBoardFromTemplate). auth.uid() is the actual actor; created_by is a fallback
-- for non-interactive inserts. Workspace/site admins already have access via role.
create or replace function private.handle_new_board()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  creator uuid := coalesce(auth.uid(), new.created_by);
begin
  if creator is not null then
    insert into public.board_members (board_id, user_id, role)
    values (new.id, creator, 'admin')
    on conflict (board_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_board_created
  after insert on public.boards
  for each row execute function private.handle_new_board();

-- FR5: board-admins may edit and archive an ACTIVE board. The USING clause
-- excludes already-archived boards, so a board-admin cannot edit or reopen an
-- archived one — reopening (clearing archived_at) needs the privileged policy below.
create policy "boards_update_admin" on public.boards
  for update to authenticated
  using (private.board_access(id) = 'admin' and archived_at is null)
  with check (private.board_access(id) = 'admin');

-- Site- and workspace-admins may update any board, including reopening an archived one.
create policy "boards_update_privileged" on public.boards
  for update to authenticated
  using ((select private.is_site_admin()) or private.workspace_role(workspace_id) = 'admin')
  with check ((select private.is_site_admin()) or private.workspace_role(workspace_id) = 'admin');

create policy "boards_delete" on public.boards
  for delete to authenticated
  using (private.board_access(id) = 'admin');

create policy "board_members_select" on public.board_members
  for select to authenticated
  using (private.board_access(board_id) is not null);
create policy "board_members_mutate" on public.board_members
  for all to authenticated
  using (private.board_access(board_id) = 'admin')
  with check (private.board_access(board_id) = 'admin');

-- ---------------------------------------------------------------------------
-- Content tables: read for anyone with board access; write for admin+medlem
-- (F3/F7 — members create and edit tasks and columns; leser is read-only).
-- Identical shape reused for every board-scoped content table.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'chapters', 'groups', 'columns', 'column_labels',
    'items', 'cell_values', 'board_functions', 'board_member_functions'
  ]
  loop
    execute format($f$
      create policy %1$I on public.%2$I
        for select to authenticated
        using (private.board_access(board_id) is not null);
    $f$, t || '_select', t);

    -- FR5: content is read-only while the board is archived. The archive check is
    -- in both USING and WITH CHECK so no INSERT/UPDATE/DELETE lands on an archived board.
    execute format($f$
      create policy %1$I on public.%2$I
        for all to authenticated
        using (
          private.board_access(board_id) in ('admin','medlem')
          and not private.board_archived(board_id)
        )
        with check (
          private.board_access(board_id) in ('admin','medlem')
          and not private.board_archived(board_id)
        );
    $f$, t || '_mutate', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Domain restriction (N4): reject sign-ups outside the company Workspace.
-- Second layer behind the Google OAuth consent screen set to "Internal".
-- ---------------------------------------------------------------------------
create or replace function private.enforce_company_domain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null
     or lower(split_part(new.email, '@', 2)) <> 'enkeleksamen.no' then
    raise exception 'Kun @enkeleksamen.no-kontoer har tilgang (fikk %).', new.email
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger enforce_company_domain_before_insert
  before insert on auth.users
  for each row execute function private.enforce_company_domain();
