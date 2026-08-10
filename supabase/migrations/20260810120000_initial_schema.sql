-- Initial schema: workspaces, boards, course structure, dynamic columns, cells,
-- and production functions (column visibility). Identifiers are English; all
-- user-facing strings (labels, statuses) are Norwegian and come from seed/app data.

-- ---------------------------------------------------------------------------
-- Schemas & enums
-- ---------------------------------------------------------------------------
create schema if not exists private;

create type public.workspace_role as enum ('admin', 'medlem');
create type public.board_role     as enum ('admin', 'medlem', 'leser');
create type public.column_type    as enum (
  'status', 'person', 'date', 'text', 'number', 'link', 'label'
);

-- Shared trigger: keep updated_at fresh on UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (mirror of auth.users; clients cannot read auth.users directly)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  full_name     text,
  avatar_url    text,
  is_site_admin boolean not null default false,   -- set manually by ops in MVP
  created_at    timestamptz not null default now()
);

-- Provision a profile row whenever a new auth user is created.
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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------
create table public.workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         public.workspace_role not null default 'medlem',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index on public.workspace_members (user_id);

-- ---------------------------------------------------------------------------
-- boards (= courses)
-- ---------------------------------------------------------------------------
create table public.boards (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null,
  position     text not null,               -- fractional index
  created_by   uuid references public.profiles (id),
  created_at   timestamptz not null default now(),
  archived_at  timestamptz,                 -- archived: still read + counted in reports (FR5)
  deleted_at   timestamptz                  -- soft delete: hidden from reports (N6)
);
create index on public.boards (workspace_id);

create table public.board_members (
  board_id   uuid not null references public.boards (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.board_role not null default 'medlem',
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);
create index on public.board_members (user_id);

-- ---------------------------------------------------------------------------
-- Course structure: chapters -> groups (subchapters) -> items (videos)
-- Every content table denormalizes board_id so RLS and realtime key on one
-- column, and composite FKs guarantee the denormalized board_id cannot lie.
-- ---------------------------------------------------------------------------
create table public.chapters (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards (id) on delete cascade,
  name       text not null,
  position   text not null,
  deleted_at timestamptz,
  unique (id, board_id)
);
create index on public.chapters (board_id, position);

create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards (id) on delete cascade,
  chapter_id uuid,                          -- nullable: MVP may render groups flat
  name       text not null,
  color      text,
  position   text not null,
  deleted_at timestamptz,
  unique (id, board_id),
  foreign key (chapter_id, board_id)
    references public.chapters (id, board_id) on delete cascade
);
create index on public.groups (board_id, position);

create table public.columns (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards (id) on delete cascade,
  title      text not null,                 -- Norwegian display name
  type       public.column_type not null,
  position   text not null,
  settings   jsonb not null default '{}'::jsonb,  -- e.g. { "visibleToFunctions": [uuid] }
  deleted_at timestamptz,
  unique (id, board_id)
);
create index on public.columns (board_id, position);

create table public.column_labels (       -- values for status/label columns (F6)
  id        uuid primary key default gen_random_uuid(),
  column_id uuid not null,
  board_id  uuid not null,
  title             text not null,          -- «Ferdig», «Under arbeid», …
  color             text not null,          -- hex, e.g. '#2e7d32'
  position          text not null,
  is_done           boolean not null default false, -- counts toward earned points (FR2)
  is_not_applicable boolean not null default false, -- «Ikke behov»: step dropped from the denominator (FR2)
  points            numeric,                -- estimate for a content-type label (FR1); null elsewhere
  unique (id, board_id),
  foreign key (column_id, board_id)
    references public.columns (id, board_id) on delete cascade
);
create index on public.column_labels (column_id, position);

create table public.items (                -- rows = videos/lessons
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards (id) on delete cascade,
  group_id   uuid not null,
  name       text not null,                 -- the «Leksjon» column, pinned in UI
  position   text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, board_id),
  foreign key (group_id, board_id)
    references public.groups (id, board_id) on delete cascade
);
create index on public.items (board_id);
create index on public.items (group_id, position);
create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

create table public.cell_values (
  item_id    uuid not null,
  column_id  uuid not null,
  board_id   uuid not null,                 -- denormalized for RLS + realtime filter
  value      jsonb not null,
  updated_at timestamptz not null default now(),  -- last-write-wins anchor (N3)
  updated_by uuid references public.profiles (id),
  primary key (item_id, column_id),
  foreign key (item_id, board_id)
    references public.items (id, board_id) on delete cascade,
  foreign key (column_id, board_id)
    references public.columns (id, board_id) on delete cascade
);
create index on public.cell_values (board_id);
create index on public.cell_values (column_id);
create trigger cell_values_set_updated_at
  before update on public.cell_values
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Production functions (per-function column visibility — UI focus, not security)
-- ---------------------------------------------------------------------------
create table public.board_functions (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards (id) on delete cascade,
  name       text not null,                 -- «Manusforfatter», «Redigerer», …
  position   text not null,
  deleted_at timestamptz,
  unique (id, board_id)
);
create index on public.board_functions (board_id, position);

create table public.board_member_functions (
  board_id    uuid not null references public.boards (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  function_id uuid not null,
  primary key (board_id, user_id, function_id),
  foreign key (function_id, board_id)
    references public.board_functions (id, board_id) on delete cascade,
  -- Only actual board members can be assigned a function; drop assignments
  -- automatically when membership is revoked.
  foreign key (board_id, user_id)
    references public.board_members (board_id, user_id) on delete cascade
);
create index on public.board_member_functions (user_id);

-- ---------------------------------------------------------------------------
-- Enable RLS on every table now; policies are defined in the next migration.
-- RLS-on with no policy denies all access, so there is no open window.
-- ---------------------------------------------------------------------------
alter table public.profiles               enable row level security;
alter table public.workspaces             enable row level security;
alter table public.workspace_members      enable row level security;
alter table public.boards                 enable row level security;
alter table public.board_members          enable row level security;
alter table public.chapters               enable row level security;
alter table public.groups                 enable row level security;
alter table public.columns                enable row level security;
alter table public.column_labels          enable row level security;
alter table public.items                  enable row level security;
alter table public.cell_values            enable row level security;
alter table public.board_functions        enable row level security;
alter table public.board_member_functions enable row level security;
