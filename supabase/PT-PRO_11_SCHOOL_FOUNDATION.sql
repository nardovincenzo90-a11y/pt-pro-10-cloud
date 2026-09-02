-- PT-PRO 11.1 — Area Docenti / School foundation
-- Additivo e idempotente. Eseguire dopo le migrazioni PT-PRO 11 già applicate.
begin;

create table if not exists public.school_classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  school_level text not null check (school_level in ('I grado','II grado')),
  school_year text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.school_classes(id) on delete cascade,
  display_name text not null,
  code text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.school_assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.school_classes(id) on delete set null,
  student_id uuid references public.school_students(id) on delete set null,
  student_name_snapshot text,
  class_name_snapshot text,
  assessed_on date not null default current_date,
  technique numeric,
  effort numeric,
  teamwork numeric,
  autonomy numeric,
  overall numeric,
  notes text,
  created_at timestamptz not null default now(),
  constraint school_assessment_scores check (
    (technique is null or technique between 1 and 10) and
    (effort is null or effort between 1 and 10) and
    (teamwork is null or teamwork between 1 and 10) and
    (autonomy is null or autonomy between 1 and 10) and
    (overall is null or overall between 1 and 10)
  )
);

create table if not exists public.school_test_results (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.school_classes(id) on delete set null,
  student_id uuid references public.school_students(id) on delete set null,
  student_name_snapshot text,
  class_name_snapshot text,
  test_name text not null,
  capacity text,
  measured_on date not null default current_date,
  value numeric not null,
  unit text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.school_lesson_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  school_level text not null check (school_level in ('I grado','II grado')),
  sport text,
  objective text,
  duration_minutes integer,
  blocks jsonb not null default '[]'::jsonb,
  notes text,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_school_classes_owner on public.school_classes(owner_id);
create index if not exists idx_school_students_owner_class on public.school_students(owner_id,class_id);
create index if not exists idx_school_assessments_owner_date on public.school_assessments(owner_id,assessed_on desc);
create index if not exists idx_school_tests_owner_date on public.school_test_results(owner_id,measured_on desc);
create index if not exists idx_school_lessons_owner on public.school_lesson_plans(owner_id,created_at desc);

alter table public.school_classes enable row level security;
alter table public.school_students enable row level security;
alter table public.school_assessments enable row level security;
alter table public.school_test_results enable row level security;
alter table public.school_lesson_plans enable row level security;

do $$
declare t text;
begin
  foreach t in array array['school_classes','school_students','school_assessments','school_test_results','school_lesson_plans'] loop
    execute format('drop policy if exists %I_owner_all on public.%I',t,t);
    execute format('create policy %I_owner_all on public.%I for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())',t,t);
  end loop;
end $$;

grant select,insert,update,delete on public.school_classes to authenticated;
grant select,insert,update,delete on public.school_students to authenticated;
grant select,insert,update,delete on public.school_assessments to authenticated;
grant select,insert,update,delete on public.school_test_results to authenticated;
grant select,insert,update,delete on public.school_lesson_plans to authenticated;

commit;