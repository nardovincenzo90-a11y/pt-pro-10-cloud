-- PT-PRO 11.7 — Registro didattico relazionale, privacy e sincronizzazione
-- Additivo e idempotente. Non elimina né modifica i dati scolastici esistenti.
begin;

create table if not exists public.school_assignments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete cascade,
  lesson_key text,
  title text not null,
  activity_kind text not null default 'Lezione',
  period_label text,
  assigned_on date not null default current_date,
  status text not null default 'Pianificata' check (status in ('Pianificata','In svolgimento','Completata')),
  theory_done boolean not null default false,
  practice_done boolean not null default false,
  teacher_note text,
  completed_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_assignment_students (
  assignment_id uuid not null references public.school_assignments(id) on delete cascade,
  student_id uuid not null references public.school_students(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  primary key (assignment_id,student_id)
);

create table if not exists public.school_attendance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete cascade,
  student_id uuid not null references public.school_students(id) on delete cascade,
  attendance_on date not null default current_date,
  status text not null check (status in ('Presente','Assente','Ritardo','Giustificato')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id,attendance_on)
);

create table if not exists public.school_audit_log (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_school_assignments_owner_class on public.school_assignments(owner_id,class_id,assigned_on desc);
create index if not exists idx_school_assignment_students_owner on public.school_assignment_students(owner_id,student_id);
create index if not exists idx_school_attendance_owner_class_date on public.school_attendance(owner_id,class_id,attendance_on desc);
create index if not exists idx_school_audit_owner_date on public.school_audit_log(owner_id,created_at desc);

alter table public.school_assignments enable row level security;
alter table public.school_assignment_students enable row level security;
alter table public.school_attendance enable row level security;
alter table public.school_audit_log enable row level security;

do $$
declare t text;
begin
  foreach t in array array['school_assignments','school_assignment_students','school_attendance','school_audit_log'] loop
    execute format('drop policy if exists %I_owner_all on public.%I',t,t);
    execute format('create policy %I_owner_all on public.%I for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())',t,t);
  end loop;
end $$;

grant select,insert,update,delete on public.school_assignments to authenticated;
grant select,insert,update,delete on public.school_assignment_students to authenticated;
grant select,insert,update,delete on public.school_attendance to authenticated;
grant select,insert on public.school_audit_log to authenticated;
grant usage,select on sequence public.school_audit_log_id_seq to authenticated;

commit;
