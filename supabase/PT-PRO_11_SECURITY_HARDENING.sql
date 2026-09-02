-- PT-PRO 11 — hardening ruoli, inviti e redemption
-- Additivo e idempotente: eseguire dopo FOUNDATION + ADMIN_BOOTSTRAP.
begin;

-- Gli inviti possono assegnare solo ruoli applicativi non-admin.
alter table public.registration_invites
  drop constraint if exists ptpro_registration_invites_role_check;
alter table public.registration_invites
  add constraint ptpro_registration_invites_role_check
  check (role in ('athlete','coach'));

-- Solo Admin o Coach possono creare inviti. Un Coach può invitare esclusivamente
-- Atleti associati a se stesso; la promozione a Coach resta riservata all'Admin.
drop policy if exists ptpro_invites_admin on public.registration_invites;
drop policy if exists ptpro_invites_read on public.registration_invites;
drop policy if exists ptpro_invites_insert on public.registration_invites;
drop policy if exists ptpro_invites_update on public.registration_invites;
drop policy if exists ptpro_invites_delete on public.registration_invites;

create policy ptpro_invites_read on public.registration_invites
for select to authenticated
using (
  public.ptpro_is_admin()
  or created_by = auth.uid()
  or coach_id = auth.uid()
);

create policy ptpro_invites_insert on public.registration_invites
for insert to authenticated
with check (
  public.ptpro_is_admin()
  or (
    created_by = auth.uid()
    and role = 'athlete'
    and coach_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  )
);

create policy ptpro_invites_update on public.registration_invites
for update to authenticated
using (public.ptpro_is_admin() or created_by = auth.uid())
with check (
  public.ptpro_is_admin()
  or (
    created_by = auth.uid()
    and role = 'athlete'
    and coach_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  )
);

create policy ptpro_invites_delete on public.registration_invites
for delete to authenticated
using (public.ptpro_is_admin() or created_by = auth.uid());

create or replace function public.redeem_registration_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.registration_invites%rowtype;
  current_email text;
  creator_role text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  current_email := lower(coalesce(auth.jwt() ->> 'email',''));

  select * into inv
  from public.registration_invites
  where invite_code = trim(p_code)
    and status = 'open'
    and expires_at > now()
  for update;

  if inv.id is null then
    raise exception 'Invite non valido o scaduto';
  end if;

  if inv.role not in ('athlete','coach') then
    raise exception 'Ruolo invito non valido';
  end if;

  if inv.email is not null
     and length(trim(inv.email)) > 0
     and lower(trim(inv.email)) <> current_email then
    raise exception 'Questo invito è associato a un altro indirizzo email';
  end if;

  select role into creator_role
  from public.profiles
  where id = inv.created_by;

  if inv.role = 'coach' and creator_role <> 'admin' then
    raise exception 'Solo un Admin può invitare un Coach';
  end if;

  if inv.role = 'athlete' and inv.coach_id is not null then
    if not exists (
      select 1 from public.profiles p
      where p.id = inv.coach_id and p.role in ('coach','admin')
    ) then
      raise exception 'Coach associato non valido';
    end if;
  end if;

  -- Non retrocedere mai un Admin tramite codice invito.
  if inv.role = 'coach' then
    update public.profiles
      set role = 'coach'
      where id = auth.uid() and role <> 'admin';
  end if;

  update public.registration_invites
    set status = 'redeemed', redeemed_by = auth.uid(), redeemed_at = now()
    where id = inv.id;

  if inv.role = 'athlete' and inv.coach_id is not null then
    insert into public.coach_athletes(coach_id,athlete_id,active)
    values(inv.coach_id,auth.uid(),true)
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'role', inv.role,
    'coach_id', inv.coach_id
  );
end;
$$;

grant execute on function public.redeem_registration_invite(text) to authenticated;

commit;