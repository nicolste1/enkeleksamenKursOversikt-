-- Pending workspace invitations: grant access to someone who has not signed in
-- yet. workspace_members.user_id requires a profiles row, which only exists
-- after the first login (on_auth_user_created), so an invite is keyed on email
-- instead and redeemed by that same trigger.

-- ---------------------------------------------------------------------------
-- workspace_invites: one pending grant per (email, workspace).
-- Rows are deleted the moment they are redeemed, so «pending» is exactly what
-- the table contains. Emails are stored lowercased — the check constraint keeps
-- the primary key from splitting on casing.
-- Not added to the realtime publication; no replica identity change.
-- ---------------------------------------------------------------------------
create table public.workspace_invites (
  email        text not null
    check (email = lower(email))
    -- Same rule as enforce_company_domain (N4), applied at invite time: an
    -- invite for another domain could never redeem, so it would otherwise sit
    -- here as a dead row that looks like granted access.
    check (split_part(email, '@', 2) = 'enkeleksamen.no'),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  role         public.workspace_role not null default 'medlem',
  invited_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  -- An invite is an authorization keyed on a REUSABLE identifier: if an address
  -- is ever reassigned, an old row would silently grant the new holder a role.
  -- Expiry makes a forgotten invite fail closed.
  expires_at   timestamptz not null default now() + interval '30 days',
  primary key (email, workspace_id)
);

create index workspace_invites_workspace_idx on public.workspace_invites (workspace_id);

-- RLS in the same migration: no open window. Same gate as workspace_members —
-- an invite is a membership in waiting, so it must not be readable or writable
-- by anyone who could not create the membership directly. (Invitee emails are
-- otherwise visible to every signed-in user.)
alter table public.workspace_invites enable row level security;

-- Redundant with the mutate policy's `using` below, and kept deliberately: an
-- explicit select policy is what an RLS audit reads first.
create policy "workspace_invites_select" on public.workspace_invites
  for select to authenticated
  using ((select private.is_site_admin()) or private.workspace_role(workspace_id) = 'admin');

create policy "workspace_invites_mutate" on public.workspace_invites
  for all to authenticated
  using ((select private.is_site_admin()) or private.workspace_role(workspace_id) = 'admin')
  with check ((select private.is_site_admin()) or private.workspace_role(workspace_id) = 'admin');

-- ---------------------------------------------------------------------------
-- Redeem on signup. Replaces the original handle_new_user (initial schema):
-- same profile insert, plus any invites waiting on that email. Runs as the
-- existing after-insert trigger on auth.users, security definer, so it writes
-- past RLS — the invite row is the authorization, granted earlier by someone
-- who passed workspace_invites_mutate.
-- The before-insert domain trigger has already rejected non-company emails and
-- null emails by the time this runs.
--
-- Two guards, both load-bearing:
--
-- 1. GOOGLE ONLY. An invite is a bearer grant keyed on an email address, and
--    creating an auth.users row with a chosen email is self-service: the anon
--    key is public, so /auth/v1/signup with email+password would pass
--    enforce_company_domain (right domain) and redeem someone else's admin
--    invite. The trigger also fires on INSERT, before any confirmation, so
--    e-mail confirmations would not help. Gating on the provider means only a
--    real Google SSO account can redeem. Disable the e-mail/password provider
--    in the hosted project's Auth settings as well — this is the second layer,
--    same as N4 pairs the domain trigger with the "Internal" consent screen.
--    Fails closed: if the provider is anything else the invite is left intact,
--    still pending, rather than consumed. That also covers the case where a
--    future GoTrue version populates raw_app_meta_data after the INSERT rather
--    than as part of it — the invite survives, and re-running the ops script
--    grants membership directly (the profile exists by then).
--
-- 2. NON-FATAL. This trigger is on auth.users, where an exception aborts the
--    whole signup. The profile insert is load-bearing and must keep that
--    behaviour; redemption is a convenience, so a failure there must not lock
--    everyone out of the app. Hence the inner exception block.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  if new.raw_app_meta_data ->> 'provider' = 'google' then
    begin
      insert into public.workspace_members (workspace_id, user_id, role)
      select i.workspace_id, new.id, i.role
        from public.workspace_invites i
       where i.email = lower(new.email)
         and i.expires_at > now()
      on conflict (workspace_id, user_id) do nothing;

      -- Consumed. Expired rows for the same address go too; they are dead.
      delete from public.workspace_invites where email = lower(new.email);
    exception when others then
      raise warning 'Kunne ikke løse inn invitasjon for %: %', new.email, sqlerrm;
    end;
  end if;

  return new;
end;
$$;
