-- M6 (F13): saved filter views + semantic roles for «Ansvarlig»,
-- «Redigeringsansvarlig» and «Klar til redigering» so cross-course features
-- survive column renames (F7).

-- ---------------------------------------------------------------------------
-- saved_views: a named filter definition, personal to one user.
-- board_id null = cross-course. The definition stores board-local ids
-- (columnId/labelId), so a board view is only meaningful on the board it was
-- created for — enforced by usage, not schema.
-- Not added to the realtime publication; no replica identity change.
-- ---------------------------------------------------------------------------
create table public.saved_views (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  board_id   uuid references public.boards (id) on delete cascade,
  name       text not null,
  definition jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_views_user_board_idx on public.saved_views (user_id, board_id);

create trigger saved_views_set_updated_at
  before update on public.saved_views
  for each row execute function public.set_updated_at();

-- RLS in the same migration: no open window. Personal data — own rows only
-- (same shape as profiles_update_own). Deliberately NOT gated on board
-- access/archive: a view is user metadata and grants no data access (reads
-- still go through the content tables' RLS). with check pins user_id to the
-- caller, so views cannot be created or reassigned on someone else's behalf.
alter table public.saved_views enable row level security;

create policy "saved_views_select" on public.saved_views
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "saved_views_mutate" on public.saved_views
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Backfill column roles on existing boards. Keyed on exact title + type so
-- «Ansvarlig» never matches «Redigeringsansvarlig»; renamed columns (F7) are
-- simply skipped — new boards get roles from the template, and existing
-- renamed columns can be re-tagged later. Never overwrites an existing role.
-- ---------------------------------------------------------------------------
update public.columns
  set settings = settings || jsonb_build_object('role', 'responsible')
  where title = 'Ansvarlig' and type = 'person'
    and deleted_at is null and settings->>'role' is null;

update public.columns
  set settings = settings || jsonb_build_object('role', 'readyForEdit')
  where title = 'Klar til redigering' and type = 'label'
    and deleted_at is null and settings->>'role' is null;

update public.columns
  set settings = settings || jsonb_build_object('role', 'editResponsible')
  where title = 'Redigeringsansvarlig' and type = 'person'
    and deleted_at is null and settings->>'role' is null;
