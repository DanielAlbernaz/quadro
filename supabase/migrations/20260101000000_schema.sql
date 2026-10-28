
create type public.member_role as enum ('owner','member');
create type public.task_tipo as enum ('bug','melhoria','feature');
create type public.task_prioridade as enum ('baixa','media','alta','urgente');
create type public.field_tipo as enum ('texto','numero','data','lista','checkbox','link');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);
create table public.workspace_members (
  user_id uuid primary key,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now()
);
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  invited_by uuid,
  created_at timestamptz not null default now()
);

create or replace function public.is_member(_uid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists(select 1 from public.workspace_members where user_id = _uid) $$;
create or replace function public.is_owner(_uid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists(select 1 from public.workspace_members where user_id = _uid and role='owner') $$;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null default '',
  capa_url text,
  prefixo text not null,
  arquivado boolean not null default false,
  next_numero int not null default 1,
  created_at timestamptz not null default now()
);
create table public.columns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  nome text not null,
  posicao double precision not null default 0
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  column_id uuid not null references public.columns(id) on delete cascade,
  numero int not null default 0,
  titulo text not null,
  descricao text not null default '',
  tipo public.task_tipo not null default 'feature',
  prioridade public.task_prioridade not null default 'media',
  data_inicio date,
  data_entrega date,
  posicao double precision not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null,
  primary key (task_id, user_id)
);
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  nome text not null,
  cor text not null default '#6366f1'
);
create table public.task_tags (
  task_id uuid not null references public.tasks(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (task_id, tag_id)
);
create table public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  nome text not null,
  tipo public.field_tipo not null default 'texto',
  opcoes jsonb not null default '[]'::jsonb,
  obrigatorio boolean not null default false,
  posicao double precision not null default 0
);
create table public.task_custom_values (
  task_id uuid not null references public.tasks(id) on delete cascade,
  field_id uuid not null references public.custom_fields(id) on delete cascade,
  valor jsonb,
  primary key (task_id, field_id)
);
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  texto text not null,
  created_at timestamptz not null default now()
);
create table public.task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid default auth.uid(),
  de_coluna text,
  para_coluna text,
  created_at timestamptz not null default now()
);

-- grants
grant select, insert, update, delete on public.profiles, public.workspace_members, public.invites, public.projects, public.columns, public.tasks, public.task_assignees, public.tags, public.task_tags, public.custom_fields, public.task_custom_values, public.comments, public.task_activity to authenticated;
grant all on public.profiles, public.workspace_members, public.invites, public.projects, public.columns, public.tasks, public.task_assignees, public.tags, public.task_tags, public.custom_fields, public.task_custom_values, public.comments, public.task_activity to service_role;

alter table public.profiles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invites enable row level security;
alter table public.projects enable row level security;
alter table public.columns enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.tags enable row level security;
alter table public.task_tags enable row level security;
alter table public.custom_fields enable row level security;
alter table public.task_custom_values enable row level security;
alter table public.comments enable row level security;
alter table public.task_activity enable row level security;

create policy "own or member read profiles" on public.profiles for select to authenticated using (id = auth.uid() or public.is_member(auth.uid()));
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "members read members" on public.workspace_members for select to authenticated using (user_id = auth.uid() or public.is_member(auth.uid()));
create policy "owner removes members" on public.workspace_members for delete to authenticated using (public.is_owner(auth.uid()) and user_id <> auth.uid());

create policy "owner manages invites" on public.invites for all to authenticated using (public.is_owner(auth.uid())) with check (public.is_owner(auth.uid()));

create policy "members all" on public.projects for all to authenticated using (public.is_member(auth.uid())) with check (public.is_member(auth.uid()));
create policy "members all" on public.columns for all to authenticated using (public.is_member(auth.uid())) with check (public.is_member(auth.uid()));
create policy "members all" on public.tasks for all to authenticated using (public.is_member(auth.uid())) with check (public.is_member(auth.uid()));
create policy "members all" on public.task_assignees for all to authenticated using (public.is_member(auth.uid())) with check (public.is_member(auth.uid()));
create policy "members all" on public.tags for all to authenticated using (public.is_member(auth.uid())) with check (public.is_member(auth.uid()));
create policy "members all" on public.task_tags for all to authenticated using (public.is_member(auth.uid())) with check (public.is_member(auth.uid()));
create policy "members all" on public.custom_fields for all to authenticated using (public.is_member(auth.uid())) with check (public.is_member(auth.uid()));
create policy "members all" on public.task_custom_values for all to authenticated using (public.is_member(auth.uid())) with check (public.is_member(auth.uid()));
create policy "members read" on public.comments for select to authenticated using (public.is_member(auth.uid()));
create policy "members insert own" on public.comments for insert to authenticated with check (public.is_member(auth.uid()) and user_id = auth.uid());
create policy "delete own" on public.comments for delete to authenticated using (user_id = auth.uid());
create policy "members read" on public.task_activity for select to authenticated using (public.is_member(auth.uid()));
create policy "members insert" on public.task_activity for insert to authenticated with check (public.is_member(auth.uid()));

-- signup: profile + membership
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, nome, email) values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)), new.email);
  if not exists (select 1 from public.workspace_members) then
    insert into public.workspace_members(user_id, role) values (new.id, 'owner');
  elsif exists (select 1 from public.invites where lower(email) = lower(new.email)) then
    insert into public.workspace_members(user_id, role) values (new.id, 'member');
    delete from public.invites where lower(email) = lower(new.email);
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- invited later (account already existed)
create or replace function public.claim_invite() returns boolean
language plpgsql security definer set search_path = public as $$
declare e text;
begin
  select email into e from auth.users where id = auth.uid();
  if exists (select 1 from public.invites where lower(email)=lower(e)) then
    insert into public.workspace_members(user_id, role) values (auth.uid(),'member') on conflict do nothing;
    delete from public.invites where lower(email)=lower(e);
    return true;
  end if;
  return public.is_member(auth.uid());
end $$;
grant execute on function public.claim_invite() to authenticated;

-- default columns
create or replace function public.project_default_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.columns(project_id, nome, posicao) values
    (new.id,'Backlog',1),(new.id,'Em Desenvolvimento',2),(new.id,'Teste',3),(new.id,'Produção',4);
  return new;
end $$;
create trigger project_created after insert on public.projects for each row execute function public.project_default_columns();

-- task number
create or replace function public.task_set_numero() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.projects set next_numero = next_numero + 1 where id = new.project_id returning next_numero - 1 into new.numero;
  return new;
end $$;
create trigger task_numero before insert on public.tasks for each row execute function public.task_set_numero();

-- column change history
create or replace function public.task_log_move() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.column_id <> old.column_id then
    insert into public.task_activity(task_id, user_id, de_coluna, para_coluna)
    values (new.id, auth.uid(), (select nome from public.columns where id=old.column_id), (select nome from public.columns where id=new.column_id));
  end if;
  return new;
end $$;
create trigger task_move after update on public.tasks for each row execute function public.task_log_move();

alter publication supabase_realtime add table public.tasks, public.columns, public.task_assignees;
