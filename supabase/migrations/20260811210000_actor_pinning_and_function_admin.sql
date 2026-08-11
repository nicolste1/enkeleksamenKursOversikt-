-- Two hardenings from the M4 review:
--
-- 1) created_by/updated_by were client-supplied and unpinned: any medlem
--    could attribute edits to a colleague via direct API calls. Triggers pin
--    them to the actual actor. coalesce keeps provided values for SQL-editor/
--    service runs where auth.uid() is null (e.g. the demo seed).
--
-- 2) board_functions/board_member_functions sat in the generic content-table
--    policies (writable by any medlem), while function administration is an
--    admin task in the app's capability model (src/lib/access/roles.ts).
--    Tighten writes to board-admins so database and UI agree.

create or replace function private.pin_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_by = coalesce(auth.uid(), new.created_by);
  return new;
end;
$$;

create or replace function private.pin_updated_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by = coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

create trigger boards_pin_created_by
  before insert on public.boards
  for each row execute function private.pin_created_by();

create trigger items_pin_created_by
  before insert on public.items
  for each row execute function private.pin_created_by();

create trigger cell_values_pin_updated_by
  before insert or update on public.cell_values
  for each row execute function private.pin_updated_by();

-- Function administration: board-admin only (was: any medlem via the
-- content-table policy loop). Same archive lock as before.
drop policy "board_functions_mutate" on public.board_functions;
create policy "board_functions_mutate" on public.board_functions
  for all to authenticated
  using (
    private.board_access(board_id) = 'admin'
    and not private.board_archived(board_id)
  )
  with check (
    private.board_access(board_id) = 'admin'
    and not private.board_archived(board_id)
  );

drop policy "board_member_functions_mutate" on public.board_member_functions;
create policy "board_member_functions_mutate" on public.board_member_functions
  for all to authenticated
  using (
    private.board_access(board_id) = 'admin'
    and not private.board_archived(board_id)
  )
  with check (
    private.board_access(board_id) = 'admin'
    and not private.board_archived(board_id)
  );
