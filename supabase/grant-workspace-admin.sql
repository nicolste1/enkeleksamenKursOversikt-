-- Grant a user workspace-admin. Run manually in the Supabase SQL editor —
-- this is data, not schema, so it does NOT belong in migrations/ (it would
-- otherwise be replayed into every environment).
--
-- Works whether or not the user has signed in yet:
--   * profile exists  -> workspace_members row now
--   * no profile yet  -> workspace_invites row, redeemed automatically by
--                        private.handle_new_user() at first login
--                        (migration 20260812120000_workspace_invites.sql).
--
-- Idempotent: re-running is safe, and an existing 'medlem' is upgraded to 'admin'.

do $$
declare
  target_email constant text                  := lower('mathias.nesheim@enkeleksamen.no');
  target_role  constant public.workspace_role := 'admin';
  target_id    uuid;
  affected     integer;
begin
  select p.id
    into target_id
    from public.profiles p
   where lower(p.email) = target_email;

  -- Every workspace. Restrict with `where w.name = '...'` if that is ever wrong
  -- (both branches below).
  if target_id is not null then
    insert into public.workspace_members (workspace_id, user_id, role)
    select w.id, target_id, target_role
      from public.workspaces w
    on conflict (workspace_id, user_id) do update set role = excluded.role;

    get diagnostics affected = row_count;
    raise notice '% er nå %-medlem i % workspace(s).', target_email, target_role, affected;
  else
    -- invited_by via a profiles lookup, not auth.uid() directly: in the SQL
    -- editor there is no JWT so it is null anyway, and a claim without a
    -- matching profile row would blow up the FK and abort the whole block.
    insert into public.workspace_invites (email, workspace_id, role, invited_by)
    select target_email, w.id, target_role,
           (select p.id from public.profiles p where p.id = auth.uid())
      from public.workspaces w
    on conflict (email, workspace_id) do update
      set role = excluded.role, expires_at = excluded.expires_at;

    get diagnostics affected = row_count;
    raise notice
      'Ingen profil for % ennå — invitasjon lagret for % workspace(s). Tilgangen aktiveres automatisk ved første innlogging.',
      target_email, affected;
  end if;
end;
$$;

-- Verify. RAISE NOTICE above is not surfaced by the Supabase SQL editor, so
-- THIS is the feedback channel. NB: the email is repeated here — change it in
-- all three places or the script grants to one user and verifies another.
--   0 rader          = ingenting ble gitt (ikke suksess!)
--   'aktiv'          = tilgangen virker nå
--   'venter'         = løses inn ved første Google-innlogging. Står den fortsatt
--                      som 'venter' ETTER at brukeren har logget inn, kjør
--                      skriptet på nytt — profilen finnes nå, så den treffer
--                      medlemskaps-grenen.
select w.name as workspace, p.email, wm.role::text, 'aktiv' as status
  from public.workspace_members wm
  join public.workspaces w on w.id = wm.workspace_id
  join public.profiles   p on p.id = wm.user_id
 where lower(p.email) = lower('mathias.nesheim@enkeleksamen.no')
union all
select w.name, i.email, i.role::text,
       'venter (utløper ' || to_char(i.expires_at, 'DD.MM.YYYY') || ')'
  from public.workspace_invites i
  join public.workspaces w on w.id = i.workspace_id
 where i.email = lower('mathias.nesheim@enkeleksamen.no');
