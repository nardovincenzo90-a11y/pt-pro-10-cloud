-- PT-PRO 12 — Smart Watch foundation
-- Additivo e idempotente. Non modifica programmi, schede o storico esistenti.
-- Applicare solo dopo backup e verifica in ambiente di staging.

begin;

create table if not exists public.connected_devices (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  installation_id uuid not null,
  platform text not null check (platform in ('ios','watchos')),
  model_identifier text,
  system_version text,
  app_version text,
  display_name text,
  capabilities jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, installation_id)
);

create table if not exists public.workout_sync_events (
  event_id uuid primary key,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid references public.connected_devices(id) on delete set null,
  session_id uuid references public.workout_sessions(id) on delete cascade,
  event_type text not null,
  event_version integer not null default 1,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received'
    check (status in ('received','processed','rejected')),
  error_code text
);

create table if not exists public.workout_health_summaries (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  healthkit_workout_uuid uuid,
  source_device_id uuid references public.connected_devices(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer,
  active_energy_kcal numeric,
  average_heart_rate_bpm numeric,
  maximum_heart_rate_bpm numeric,
  minimum_heart_rate_bpm numeric,
  recovery_heart_rate_1m_bpm numeric,
  recovery_heart_rate_2m_bpm numeric,
  sample_count integer not null default 0,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, session_id),
  unique (athlete_id, healthkit_workout_uuid)
);

create table if not exists public.workout_motion_estimates (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  workout_set_id uuid references public.workout_sets(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  source_device_id uuid references public.connected_devices(id) on delete set null,
  algorithm_key text not null,
  algorithm_version text not null,
  estimated_repetitions integer,
  confirmed_repetitions integer,
  average_rep_seconds numeric,
  cadence_variation_percent numeric,
  performance_drift_percent numeric,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  quality_flags text[] not null default '{}',
  user_confirmed boolean not null default false,
  measured_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.workout_sessions
  add column if not exists source text not null default 'ptpro_web',
  add column if not exists client_event_id uuid;

alter table public.workout_sets
  add column if not exists source text not null default 'ptpro_web',
  add column if not exists client_event_id uuid;

create unique index if not exists uq_workout_sessions_client_event
  on public.workout_sessions(athlete_id, client_event_id)
  where client_event_id is not null;

create unique index if not exists uq_workout_sets_client_event
  on public.workout_sets(athlete_id, client_event_id)
  where client_event_id is not null;

create index if not exists idx_watch_events_athlete_time
  on public.workout_sync_events(athlete_id, occurred_at desc);
create index if not exists idx_watch_events_device
  on public.workout_sync_events(device_id) where device_id is not null;
create index if not exists idx_watch_events_session
  on public.workout_sync_events(session_id) where session_id is not null;
create index if not exists idx_watch_motion_session
  on public.workout_motion_estimates(session_id, measured_at);
create index if not exists idx_watch_health_session
  on public.workout_health_summaries(session_id);
create index if not exists idx_watch_health_device
  on public.workout_health_summaries(source_device_id) where source_device_id is not null;
create index if not exists idx_watch_motion_set
  on public.workout_motion_estimates(workout_set_id) where workout_set_id is not null;
create index if not exists idx_watch_motion_exercise
  on public.workout_motion_estimates(exercise_id) where exercise_id is not null;
create index if not exists idx_watch_motion_device
  on public.workout_motion_estimates(source_device_id) where source_device_id is not null;

alter table public.connected_devices enable row level security;
alter table public.workout_sync_events enable row level security;
alter table public.workout_health_summaries enable row level security;
alter table public.workout_motion_estimates enable row level security;

drop policy if exists connected_devices_select on public.connected_devices;
drop policy if exists connected_devices_insert on public.connected_devices;
drop policy if exists connected_devices_update on public.connected_devices;
drop policy if exists connected_devices_delete on public.connected_devices;
create policy connected_devices_select on public.connected_devices for select to authenticated
  using (public.can_access_athlete(athlete_id));
create policy connected_devices_insert on public.connected_devices for insert to authenticated
  with check (athlete_id = (select auth.uid()));
create policy connected_devices_update on public.connected_devices for update to authenticated
  using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()));
create policy connected_devices_delete on public.connected_devices for delete to authenticated
  using (athlete_id = (select auth.uid()));

drop policy if exists workout_sync_events_select on public.workout_sync_events;
drop policy if exists workout_sync_events_insert on public.workout_sync_events;
create policy workout_sync_events_select on public.workout_sync_events for select to authenticated
  using (public.can_access_athlete(athlete_id));
create policy workout_sync_events_insert on public.workout_sync_events for insert to authenticated
  with check (athlete_id = (select auth.uid()));

drop policy if exists workout_health_summaries_select on public.workout_health_summaries;
drop policy if exists workout_health_summaries_insert on public.workout_health_summaries;
drop policy if exists workout_health_summaries_update on public.workout_health_summaries;
create policy workout_health_summaries_select on public.workout_health_summaries for select to authenticated
  using (public.can_access_athlete(athlete_id));
create policy workout_health_summaries_insert on public.workout_health_summaries for insert to authenticated
  with check (athlete_id = (select auth.uid()));
create policy workout_health_summaries_update on public.workout_health_summaries for update to authenticated
  using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()));

drop policy if exists workout_motion_estimates_select on public.workout_motion_estimates;
drop policy if exists workout_motion_estimates_insert on public.workout_motion_estimates;
drop policy if exists workout_motion_estimates_update on public.workout_motion_estimates;
create policy workout_motion_estimates_select on public.workout_motion_estimates for select to authenticated
  using (public.can_access_athlete(athlete_id));
create policy workout_motion_estimates_insert on public.workout_motion_estimates for insert to authenticated
  with check (athlete_id = (select auth.uid()));
create policy workout_motion_estimates_update on public.workout_motion_estimates for update to authenticated
  using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()));

grant select, insert, update, delete on public.connected_devices to authenticated;
grant select, insert on public.workout_sync_events to authenticated;
grant select, insert, update on public.workout_health_summaries to authenticated;
grant select, insert, update on public.workout_motion_estimates to authenticated;

create or replace function public.ptpro_ingest_watch_event(
  p_event_id uuid,
  p_session_id uuid,
  p_event_type text,
  p_occurred_at timestamptz,
  p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inserted_event_count integer := 0;
  target_set_id uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_event_type not in (
    'session_started','session_paused','session_resumed','session_ended',
    'set_completed','health_summary','motion_estimate'
  ) then raise exception 'Unsupported event type'; end if;
  if p_event_type = 'session_started' then
    if p_session_id is null then raise exception 'Session id required'; end if;
    insert into public.workout_sessions(
      id, athlete_id, plan_id, day_id, started_at, planned_exercises,
      logged_exercises, source, client_event_id
    ) values (
      p_session_id, uid, (p_payload->>'plan_id')::uuid,
      (p_payload->>'day_id')::uuid, p_occurred_at,
      coalesce((p_payload->>'planned_exercises')::integer, 0),
      0, 'ptpro_watch', p_event_id
    ) on conflict (id) do nothing;
  elsif p_session_id is not null and not exists (
    select 1 from public.workout_sessions s
    where s.id = p_session_id and public.can_access_athlete(s.athlete_id)
  ) then raise exception 'Workout session not accessible'; end if;

  insert into public.workout_sync_events(
    event_id, athlete_id, session_id, event_type, payload, occurred_at
  ) values (p_event_id, uid, p_session_id, p_event_type, p_payload, p_occurred_at)
  on conflict (event_id) do nothing;
  get diagnostics inserted_event_count = row_count;
  if inserted_event_count = 0 then
    return jsonb_build_object('ok', true, 'duplicate', true, 'event_id', p_event_id);
  end if;

  -- Serializza le modifiche alla stessa sessione: due dispositivi non possono
  -- creare contemporaneamente la stessa serie.
  if p_session_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_session_id::text, 0));
  end if;

  if p_event_type = 'set_completed' then
    update public.workout_sets
      set load = coalesce((p_payload->>'load')::numeric, 0),
          reps = coalesce((p_payload->>'repetitions')::integer, 0),
          rir = (p_payload->>'rir')::numeric,
          rpe = (p_payload->>'rpe')::numeric,
          rest_seconds = (p_payload->>'rest_seconds')::integer,
          successful = true,
          logged_at = p_occurred_at,
          source = 'ptpro_watch',
          client_event_id = p_event_id
      where athlete_id = uid
        and session_id = p_session_id
        and workout_item_id = (p_payload->>'workout_item_id')::uuid
        and set_index = (p_payload->>'set_index')::integer
      returning id into target_set_id;

    if target_set_id is null then
      insert into public.workout_sets(
        athlete_id, session_id, plan_id, day_id, workout_item_id,
        exercise_id, exercise_name_snapshot, set_index, set_type,
        load, reps, rir, rpe, rest_seconds, successful, logged_at,
        source, client_event_id
      ) values (
        uid, p_session_id, (p_payload->>'plan_id')::uuid,
        (p_payload->>'day_id')::uuid, (p_payload->>'workout_item_id')::uuid,
        (p_payload->>'exercise_id')::uuid, p_payload->>'exercise_name',
        (p_payload->>'set_index')::integer, 'working',
        coalesce((p_payload->>'load')::numeric, 0),
        coalesce((p_payload->>'repetitions')::integer, 0),
        (p_payload->>'rir')::numeric, (p_payload->>'rpe')::numeric,
        (p_payload->>'rest_seconds')::integer, true, p_occurred_at,
        'ptpro_watch', p_event_id
      ) returning id into target_set_id;
    end if;
  elsif p_event_type = 'health_summary' then
    insert into public.workout_health_summaries(
      athlete_id, session_id, healthkit_workout_uuid, started_at, ended_at,
      duration_seconds, active_energy_kcal, average_heart_rate_bpm,
      maximum_heart_rate_bpm, sample_count, provenance
    ) values (
      uid, p_session_id, (p_payload->>'health_kit_workout_id')::uuid,
      (p_payload->>'started_at')::timestamptz,
      (p_payload->>'ended_at')::timestamptz,
      (p_payload->>'duration_seconds')::integer,
      (p_payload#>>'{active_energy_kcal,value}')::numeric,
      (p_payload#>>'{average_heart_rate,value}')::numeric,
      (p_payload#>>'{maximum_heart_rate,value}')::numeric,
      coalesce((p_payload->>'sample_count')::integer, 0),
      jsonb_build_object(
        'heart_rate','measured',
        'duration','measured',
        'active_energy','apple_estimated'
      )
    )
    on conflict (athlete_id, session_id) do update set
      healthkit_workout_uuid = excluded.healthkit_workout_uuid,
      ended_at = excluded.ended_at,
      duration_seconds = excluded.duration_seconds,
      active_energy_kcal = excluded.active_energy_kcal,
      average_heart_rate_bpm = excluded.average_heart_rate_bpm,
      maximum_heart_rate_bpm = excluded.maximum_heart_rate_bpm,
      sample_count = excluded.sample_count,
      provenance = excluded.provenance,
      updated_at = now();
  elsif p_event_type = 'motion_estimate' then
    select ws.id into target_set_id
      from public.workout_sets ws
      where ws.athlete_id = uid
        and ws.session_id = p_session_id
        and ws.workout_item_id = (p_payload->>'workout_item_id')::uuid
        and ws.set_index = (p_payload->>'set_index')::integer
      limit 1;
    insert into public.workout_motion_estimates(
      athlete_id, session_id, workout_set_id, exercise_id,
      algorithm_key, algorithm_version,
      estimated_repetitions, average_rep_seconds,
      cadence_variation_percent, performance_drift_percent,
      confidence, metadata
    ) values (
      uid, p_session_id, target_set_id,
      (p_payload->>'exercise_id')::uuid,
      p_payload#>>'{estimate,algorithm_key}',
      p_payload#>>'{estimate,algorithm_version}',
      (p_payload#>>'{estimate,repetitions}')::integer,
      (p_payload#>>'{estimate,average_rep_seconds}')::numeric,
      (p_payload#>>'{estimate,cadence_variation_percent}')::numeric,
      (p_payload#>>'{estimate,performance_drift_percent}')::numeric,
      (p_payload#>>'{estimate,confidence}')::numeric,
      jsonb_build_object(
        'experimental', true,
        'workout_item_id', p_payload->>'workout_item_id',
        'set_index', (p_payload->>'set_index')::integer
      )
    );
  elsif p_event_type = 'session_ended' then
    update public.workout_sessions
      set ended_at = p_occurred_at,
          duration_minutes = greatest(0, coalesce((p_payload->>'duration_seconds')::integer, 0) / 60),
          logged_exercises = (
            select count(distinct ws.workout_item_id)
            from public.workout_sets ws where ws.session_id = p_session_id
          ),
          completion_percent = case
            when planned_exercises > 0 then least(100, round((
              select count(distinct ws.workout_item_id)::numeric * 100
              from public.workout_sets ws where ws.session_id = p_session_id
            ) / planned_exercises, 1))
            else null
          end,
          updated_at = now()
      where id = p_session_id and athlete_id = uid;
  end if;

  update public.workout_sync_events
    set status = 'processed', processed_at = now()
    where event_id = p_event_id and athlete_id = uid;

  return jsonb_build_object(
    'ok', true, 'duplicate', false, 'event_id', p_event_id,
    'workout_set_id', target_set_id
  );
end;
$$;

revoke all on function public.ptpro_ingest_watch_event(uuid,uuid,text,timestamptz,jsonb)
  from public, anon;
grant execute on function public.ptpro_ingest_watch_event(uuid,uuid,text,timestamptz,jsonb) to authenticated;

commit;
