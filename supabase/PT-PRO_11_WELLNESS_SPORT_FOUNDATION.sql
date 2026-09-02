-- PT-PRO 11 Wellness & Sport — fondazione multi-attività
-- Additivo: non rimuove né modifica i moduli PT-PRO 10 esistenti.

begin;

-- Ruoli applicativi: il profilo esistente mantiene role; se assente viene aggiunto.
alter table public.profiles add column if not exists role text not null default 'athlete';
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists sex text;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists timezone text default 'Europe/Rome';

create or replace function public.ptpro_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  description text,
  icon text,
  environment text[] not null default '{}',
  min_age int,
  max_age int,
  intensity_levels text[] not null default '{low,moderate,high}',
  equipment text[] not null default '{}',
  supported_goals text[] not null default '{wellness,weight_loss,maintenance,fitness}',
  metric_schema jsonb not null default '{}'::jsonb,
  generator_rules jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_activity_profiles (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  primary_activity_id uuid references public.activities(id),
  secondary_activity_ids uuid[] not null default '{}',
  main_goal text not null default 'wellness',
  secondary_goals text[] not null default '{}',
  experience_level text not null default 'beginner',
  available_days int not null default 3,
  session_minutes int not null default 45,
  preferred_days int[] not null default '{}',
  locations text[] not null default '{}',
  equipment text[] not null default '{}',
  limitations text[] not null default '{}',
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(athlete_id)
);

create table if not exists public.wellness_programs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id),
  title text not null,
  goal text not null default 'wellness',
  status text not null default 'draft',
  starts_on date,
  ends_on date,
  weeks int,
  days_per_week int,
  activity_mix jsonb not null default '[]'::jsonb,
  generation_context jsonb not null default '{}'::jsonb,
  notes text,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wellness_program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.wellness_programs(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  week_index int not null default 1,
  day_index int not null default 1,
  day_name text not null,
  focus text,
  planned_date date,
  sort_order int not null default 1,
  notes text
);

create table if not exists public.wellness_program_items (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references public.wellness_program_days(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid references public.activities(id),
  item_type text not null default 'activity',
  title text not null,
  instructions text,
  prescription jsonb not null default '{}'::jsonb,
  target_intensity text,
  target_rpe numeric,
  duration_minutes int,
  distance_km numeric,
  steps_target int,
  sort_order int not null default 1,
  optional boolean not null default false
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid references public.activities(id),
  program_item_id uuid references public.wellness_program_items(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes int,
  distance_km numeric,
  steps int,
  calories numeric,
  avg_heart_rate numeric,
  max_heart_rate numeric,
  rpe numeric,
  enjoyment numeric,
  pain numeric,
  metrics jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.registration_invites (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete cascade,
  email text,
  role text not null default 'athlete',
  invite_code text not null unique,
  status text not null default 'open',
  expires_at timestamptz not null default (now() + interval '14 days'),
  redeemed_by uuid references public.profiles(id),
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.redeem_registration_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.registration_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into inv from public.registration_invites
  where invite_code = p_code and status = 'open' and expires_at > now()
  for update;
  if inv.id is null then raise exception 'Invite non valido o scaduto'; end if;
  update public.registration_invites
    set status='redeemed', redeemed_by=auth.uid(), redeemed_at=now()
    where id=inv.id;
  if inv.coach_id is not null then
    insert into public.coach_athletes(coach_id,athlete_id,active)
    values(inv.coach_id,auth.uid(),true)
    on conflict do nothing;
  end if;
  return jsonb_build_object('ok',true,'role',inv.role,'coach_id',inv.coach_id);
end;
$$;

-- Catalogo attività iniziale. L'Admin potrà aggiungerne altre senza aggiornare il codice.
insert into public.activities(slug,name,category,description,icon,environment,equipment,supported_goals,metric_schema)
values
('gym-strength','Palestra · Forza','strength','Allenamento con sovraccarichi orientato alla forza.','🏋️','{gym}','{barbell,dumbbells,machines}','{strength,muscle_gain,fitness,maintenance}', '{"sets":true,"reps":true,"load":true,"rir":true,"rpe":true}'::jsonb),
('gym-hypertrophy','Palestra · Ipertrofia','strength','Allenamento pesi per massa muscolare.','💪','{gym}','{barbell,dumbbells,machines,cables}','{muscle_gain,body_recomposition,fitness}', '{"sets":true,"reps":true,"load":true,"rir":true,"volume":true}'::jsonb),
('home-bodyweight','Corpo libero a casa','home','Circuiti e forza senza attrezzatura.','🏠','{home}','{}','{weight_loss,fitness,maintenance,wellness}', '{"sets":true,"reps":true,"duration":true,"rpe":true}'::jsonb),
('home-equipment','Allenamento a casa con attrezzi','home','Programmi con elastici, manubri, kettlebell o piccoli attrezzi.','🏠','{home}','{bands,dumbbells,kettlebell}','{strength,muscle_gain,weight_loss,fitness}', '{"sets":true,"reps":true,"load":true,"rpe":true}'::jsonb),
('walking','Camminata','cardio','Camminata per salute, dimagrimento e recupero.','🚶','{outdoor,indoor}','{}','{weight_loss,maintenance,wellness,recovery}', '{"duration":true,"distance":true,"steps":true,"pace":true,"heart_rate":true}'::jsonb),
('brisk-walking','Camminata veloce','cardio','Camminata sostenuta a intensità moderata.','🚶‍♂️','{outdoor,treadmill}','{}','{weight_loss,fitness,cardio,wellness}', '{"duration":true,"distance":true,"pace":true,"heart_rate":true}'::jsonb),
('running','Corsa','endurance','Corsa continua, progressivi e intervalli.','🏃','{outdoor,treadmill}','{}','{weight_loss,endurance,performance,fitness}', '{"duration":true,"distance":true,"pace":true,"heart_rate":true,"rpe":true}'::jsonb),
('trail-running','Trail running','endurance','Corsa su sentieri e dislivello.','⛰️','{outdoor}','{}','{endurance,performance,fitness}', '{"duration":true,"distance":true,"elevation":true,"heart_rate":true}'::jsonb),
('cycling-road','Ciclismo su strada','cycling','Uscite endurance e lavori di intensità in bici.','🚴','{outdoor}','{bike}','{endurance,weight_loss,performance,wellness}', '{"duration":true,"distance":true,"speed":true,"heart_rate":true,"power":true}'::jsonb),
('cycling-indoor','Bike indoor / cyclette','cycling','Cardio su bike indoor.','🚴‍♀️','{home,gym}','{bike}','{weight_loss,fitness,endurance}', '{"duration":true,"heart_rate":true,"rpe":true,"power":true}'::jsonb),
('mtb','Mountain bike','cycling','Ciclismo fuoristrada.','🚵','{outdoor}','{bike}','{endurance,performance,wellness}', '{"duration":true,"distance":true,"elevation":true,"heart_rate":true}'::jsonb),
('swimming','Nuoto','aquatic','Nuoto libero o strutturato per distanza e tecnica.','🏊','{pool,open_water}','{}','{endurance,fitness,weight_loss,recovery}', '{"duration":true,"distance":true,"pace":true,"laps":true,"rpe":true}'::jsonb),
('aqua-fitness','Acquagym / Aqua fitness','aquatic','Attività a basso impatto in acqua.','🌊','{pool}','{}','{weight_loss,wellness,mobility,fitness}', '{"duration":true,"rpe":true,"heart_rate":true}'::jsonb),
('football','Calcio','team-sport','Preparazione e attività calcistica.','⚽','{field,outdoor}','{ball}','{performance,endurance,fitness}', '{"duration":true,"distance":true,"sprints":true,"rpe":true}'::jsonb),
('futsal','Calcio a 5','team-sport','Attività intermittente ad alta intensità.','⚽','{indoor,field}','{ball}','{performance,fitness,endurance}', '{"duration":true,"rpe":true,"sprints":true}'::jsonb),
('basketball','Basket','team-sport','Basket e preparazione atletica correlata.','🏀','{court,indoor,outdoor}','{ball}','{performance,fitness,coordination}', '{"duration":true,"rpe":true,"jumps":true}'::jsonb),
('volleyball','Pallavolo','team-sport','Pallavolo e lavoro atletico specifico.','🏐','{court,indoor,outdoor}','{ball}','{performance,fitness,coordination}', '{"duration":true,"rpe":true,"jumps":true}'::jsonb),
('tennis','Tennis','racket','Tennis e preparazione fisica.','🎾','{court,outdoor,indoor}','{racket}','{performance,fitness,endurance}', '{"duration":true,"rpe":true,"matches":true}'::jsonb),
('padel','Padel','racket','Padel e condizionamento specifico.','🎾','{court,outdoor,indoor}','{racket}','{fitness,performance,wellness}', '{"duration":true,"rpe":true,"matches":true}'::jsonb),
('badminton','Badminton','racket','Sport di racchetta rapido e coordinativo.','🏸','{court,indoor}','{racket}','{fitness,coordination,performance}', '{"duration":true,"rpe":true,"matches":true}'::jsonb),
('table-tennis','Tennis tavolo','racket','Attività coordinativa e ricreativa.','🏓','{indoor}','{racket}','{wellness,coordination,fitness}', '{"duration":true,"matches":true}'::jsonb),
('hiking','Trekking / Escursionismo','outdoor','Cammino su percorsi naturali e dislivello.','🥾','{outdoor}','{}','{wellness,endurance,weight_loss,fitness}', '{"duration":true,"distance":true,"elevation":true,"steps":true}'::jsonb),
('stairs','Scale / Stair climbing','cardio','Lavoro cardiovascolare su scale o stair machine.','🪜','{indoor,outdoor,gym}','{}','{weight_loss,fitness,endurance}', '{"duration":true,"floors":true,"heart_rate":true,"rpe":true}'::jsonb),
('rowing','Canottaggio / Rowing','endurance','Ergometro o canottaggio.','🚣','{gym,outdoor,water}','{rower}','{endurance,fitness,strength}', '{"duration":true,"distance":true,"pace":true,"stroke_rate":true}'::jsonb),
('elliptical','Ellittica','cardio','Cardio a basso impatto.','🔄','{gym,home}','{elliptical}','{weight_loss,fitness,recovery}', '{"duration":true,"heart_rate":true,"rpe":true}'::jsonb),
('jump-rope','Corda','cardio','Salto con la corda per cardio e coordinazione.','🪢','{home,gym,outdoor}','{rope}','{weight_loss,fitness,coordination}', '{"duration":true,"jumps":true,"rpe":true}'::jsonb),
('hiit','HIIT','conditioning','Intervalli ad alta intensità adattabili al livello.','⚡','{home,gym,outdoor}','{}','{weight_loss,fitness,performance}', '{"duration":true,"intervals":true,"rpe":true,"heart_rate":true}'::jsonb),
('low-impact-circuit','Circuito low impact','conditioning','Circuiti a basso impatto per principianti o ripresa.','🌿','{home,gym}','{}','{weight_loss,wellness,fitness,recovery}', '{"duration":true,"rounds":true,"rpe":true}'::jsonb),
('functional-training','Functional training','conditioning','Movimenti funzionali, circuiti e condizionamento.','🔧','{gym,home,outdoor}','{kettlebell,bands,dumbbells}','{fitness,performance,weight_loss}', '{"duration":true,"rounds":true,"load":true,"rpe":true}'::jsonb),
('cross-training','Cross training','conditioning','Allenamento misto forza e conditioning.','🔥','{gym}','{barbell,dumbbells,kettlebell,cardio-machines}','{performance,fitness,strength}', '{"duration":true,"rounds":true,"load":true,"rpe":true}'::jsonb),
('mobility','Mobilità','mobility','Routine per mobilità articolare e qualità del movimento.','🤸','{home,gym,outdoor}','{}','{mobility,recovery,wellness}', '{"duration":true,"areas":true}'::jsonb),
('stretching','Stretching','mobility','Routine di allungamento e rilassamento.','🧘','{home,gym,outdoor}','{}','{mobility,recovery,wellness}', '{"duration":true,"areas":true}'::jsonb),
('yoga','Yoga','mind-body','Sessioni yoga adattabili a livello e obiettivo.','🧘‍♀️','{home,studio,outdoor}','{mat}','{mobility,wellness,recovery,fitness}', '{"duration":true,"rpe":true,"style":true}'::jsonb),
('pilates','Pilates','mind-body','Controllo, core, postura e mobilità.','🧘‍♂️','{home,studio}','{mat}','{mobility,wellness,core,fitness}', '{"duration":true,"level":true}'::jsonb),
('dance-fitness','Danza fitness','dance','Attività musicale e cardiovascolare.','💃','{home,studio}','{}','{weight_loss,fitness,wellness,coordination}', '{"duration":true,"heart_rate":true,"rpe":true}'::jsonb),
('dance','Danza','dance','Danza ricreativa o tecnica.','🕺','{studio,home}','{}','{wellness,coordination,fitness}', '{"duration":true,"style":true}'::jsonb),
('boxing-fitness','Boxe fitness','combat','Tecnica al sacco e conditioning senza contatto.','🥊','{gym,home}','{bag,gloves}','{weight_loss,fitness,coordination}', '{"duration":true,"rounds":true,"rpe":true}'::jsonb),
('boxing','Boxe','combat','Preparazione fisica e tecnica pugilistica.','🥊','{gym}','{bag,gloves}','{performance,fitness,endurance}', '{"duration":true,"rounds":true,"rpe":true}'::jsonb),
('martial-arts','Arti marziali','combat','Preparazione generale per discipline marziali.','🥋','{dojo,gym}','{}','{performance,fitness,coordination}', '{"duration":true,"rpe":true,"rounds":true}'::jsonb),
('skiing','Sci','winter','Sci alpino e preparazione complementare.','⛷️','{outdoor}','{ski}','{wellness,performance,fitness}', '{"duration":true,"distance":true,"elevation":true}'::jsonb),
('cross-country-ski','Sci di fondo','winter','Endurance sulla neve.','🎿','{outdoor}','{ski}','{endurance,performance,fitness}', '{"duration":true,"distance":true,"heart_rate":true}'::jsonb),
('skating','Pattinaggio','recreation','Pattinaggio ricreativo o fitness.','⛸️','{indoor,outdoor}','{skates}','{fitness,coordination,wellness}', '{"duration":true,"distance":true}'::jsonb),
('climbing','Arrampicata','outdoor','Arrampicata indoor/outdoor e forza specifica.','🧗','{indoor,outdoor}','{climbing-gear}','{strength,performance,fitness}', '{"duration":true,"grade":true,"attempts":true}'::jsonb),
('golf','Golf','recreation','Golf con attenzione a cammino, mobilità e performance.','⛳','{outdoor}','{clubs}','{wellness,coordination,fitness}', '{"duration":true,"steps":true,"holes":true}'::jsonb),
('senior-fitness','Fitness senior','special','Attività adattata per adulti anziani: forza, equilibrio e mobilità.','🌱','{home,gym,outdoor}','{bands,light-dumbbells}','{wellness,mobility,maintenance,fitness}', '{"duration":true,"balance":true,"rpe":true}'::jsonb),
('beginner-reconditioning','Ricondizionamento generale','special','Ritorno graduale all’attività dopo periodi di inattività.','🌿','{home,gym,outdoor}','{}','{wellness,recovery,fitness,weight_loss}', '{"duration":true,"steps":true,"rpe":true}'::jsonb),
('active-breaks','Pause attive','wellness','Micro-sessioni durante la giornata per ridurre sedentarietà.','⏱️','{home,office}','{}','{wellness,mobility,maintenance}', '{"duration":true,"sessions":true}'::jsonb),
('daily-steps','Obiettivo passi','wellness','Programmazione giornaliera dei passi.','👟','{outdoor,indoor}','{}','{weight_loss,wellness,maintenance}', '{"steps":true,"distance":true}'::jsonb),
('breathing-relaxation','Respirazione e rilassamento','mind-body','Sessioni brevi per rilassamento e recupero percepito.','🌬️','{home,outdoor}','{}','{wellness,recovery}', '{"duration":true,"stress_before":true,"stress_after":true}'::jsonb)
on conflict(slug) do update set
  name=excluded.name, category=excluded.category, description=excluded.description,
  icon=excluded.icon, environment=excluded.environment, equipment=excluded.equipment,
  supported_goals=excluded.supported_goals, metric_schema=excluded.metric_schema, active=true;

-- RLS
alter table public.activities enable row level security;
alter table public.user_activity_profiles enable row level security;
alter table public.wellness_programs enable row level security;
alter table public.wellness_program_days enable row level security;
alter table public.wellness_program_items enable row level security;
alter table public.activity_logs enable row level security;
alter table public.registration_invites enable row level security;

drop policy if exists ptpro_activities_read on public.activities;
create policy ptpro_activities_read on public.activities for select to authenticated using (active or public.ptpro_is_admin());
drop policy if exists ptpro_activities_admin on public.activities;
create policy ptpro_activities_admin on public.activities for all to authenticated using (public.ptpro_is_admin()) with check (public.ptpro_is_admin());

drop policy if exists ptpro_uap_access on public.user_activity_profiles;
create policy ptpro_uap_access on public.user_activity_profiles for all to authenticated
using (athlete_id=auth.uid() or public.ptpro_is_admin() or public.can_access_athlete(athlete_id))
with check (athlete_id=auth.uid() or public.ptpro_is_admin() or public.can_edit_athlete(athlete_id,'profile'));

drop policy if exists ptpro_program_access on public.wellness_programs;
create policy ptpro_program_access on public.wellness_programs for all to authenticated
using (athlete_id=auth.uid() or public.ptpro_is_admin() or public.can_access_athlete(athlete_id))
with check (athlete_id=auth.uid() or public.ptpro_is_admin() or public.can_edit_athlete(athlete_id,'plan'));

drop policy if exists ptpro_program_days_access on public.wellness_program_days;
create policy ptpro_program_days_access on public.wellness_program_days for all to authenticated
using (athlete_id=auth.uid() or public.ptpro_is_admin() or public.can_access_athlete(athlete_id))
with check (athlete_id=auth.uid() or public.ptpro_is_admin() or public.can_edit_athlete(athlete_id,'plan'));

drop policy if exists ptpro_program_items_access on public.wellness_program_items;
create policy ptpro_program_items_access on public.wellness_program_items for all to authenticated
using (athlete_id=auth.uid() or public.ptpro_is_admin() or public.can_access_athlete(athlete_id))
with check (athlete_id=auth.uid() or public.ptpro_is_admin() or public.can_edit_athlete(athlete_id,'plan'));

drop policy if exists ptpro_activity_logs_access on public.activity_logs;
create policy ptpro_activity_logs_access on public.activity_logs for all to authenticated
using (athlete_id=auth.uid() or public.ptpro_is_admin() or public.can_access_athlete(athlete_id))
with check (athlete_id=auth.uid() or public.ptpro_is_admin() or public.can_edit_athlete(athlete_id,'workout'));

drop policy if exists ptpro_invites_admin on public.registration_invites;
create policy ptpro_invites_admin on public.registration_invites for all to authenticated
using (created_by=auth.uid() or coach_id=auth.uid() or public.ptpro_is_admin())
with check (created_by=auth.uid() or public.ptpro_is_admin());

grant select on public.activities to authenticated;
grant select,insert,update,delete on public.user_activity_profiles,public.wellness_programs,public.wellness_program_days,public.wellness_program_items,public.activity_logs,public.registration_invites to authenticated;
grant execute on function public.redeem_registration_invite(text) to authenticated;

commit;
