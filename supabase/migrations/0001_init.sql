-- plusductivity Phase 0 schema
-- Run in Supabase Dashboard > SQL Editor. All tables have user_id + RLS.

-- 1. Profiles (1 row per auth user)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text
);

-- 2. Subjects (folders like Calculus, Algorithms)
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text default '#F9A8D4',
  icon text default '📁',
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 3. Files (metadata; bytes live in Storage bucket "subject-files")
create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  size_bytes int,
  mime_type text,
  created_at timestamptz default now()
);

-- 4. Links
create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  title text not null,
  url text not null,
  favicon_url text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 5. Todos
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  title text not null,
  is_done boolean default false,
  due_date date,
  priority text default 'normal',
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 6. Pomodoro sessions (one row per finished focus/break)
create table if not exists pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  type text not null check (type in ('focus','short','long')),
  duration_min int not null,
  completed_at timestamptz default now(),
  date date default current_date
);

-- RLS: enable + user can only see own rows
alter table profiles enable row level security;
alter table subjects enable row level security;
alter table files enable row level security;
alter table links enable row level security;
alter table todos enable row level security;
alter table pomodoro_sessions enable row level security;

-- Drop old policies if re-running, then create
drop policy if exists "own rows" on profiles;
drop policy if exists "own rows" on subjects;
drop policy if exists "own rows" on files;
drop policy if exists "own rows" on links;
drop policy if exists "own rows" on todos;
drop policy if exists "own rows" on pomodoro_sessions;

create policy "own rows" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own rows" on subjects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on files for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on todos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on pomodoro_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket (create in Dashboard > Storage, then run storage policies):
-- bucket name: subject-files, private, path: {user_id}/{subject_id}/{filename}
