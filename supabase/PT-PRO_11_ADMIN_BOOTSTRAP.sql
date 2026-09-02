-- PT-PRO 11 — bootstrap Admin iniziale e policy gestione utenti
begin;

create or replace function public.ptpro_claim_initial_admin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  admins_count int;
  profiles_count int;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select count(*) into admins_count from public.profiles where role='admin';
  if admins_count > 0 then return jsonb_build_object('ok',false,'reason','admin_exists'); end if;
  select count(*) into profiles_count from public.profiles;
  if profiles_count <> 1 then return jsonb_build_object('ok',false,'reason','initial_admin_requires_single_profile'); end if;
  update public.profiles set role='admin' where id=auth.uid();
  return jsonb_build_object('ok',true,'role','admin');
end;
$$;

grant execute on function public.ptpro_claim_initial_admin() to authenticated;

-- L'Admin può vedere e aggiornare i profili. Le policy esistenti per atleta/coach restano valide.
drop policy if exists ptpro_admin_profiles_select on public.profiles;
create policy ptpro_admin_profiles_select on public.profiles
for select to authenticated
using (public.ptpro_is_admin());

drop policy if exists ptpro_admin_profiles_update on public.profiles;
create policy ptpro_admin_profiles_update on public.profiles
for update to authenticated
using (public.ptpro_is_admin())
with check (public.ptpro_is_admin());

-- L'Admin può gestire le associazioni Coach ↔ Atleta.
drop policy if exists ptpro_admin_coach_athletes on public.coach_athletes;
create policy ptpro_admin_coach_athletes on public.coach_athletes
for all to authenticated
using (public.ptpro_is_admin())
with check (public.ptpro_is_admin());

grant select,update on public.profiles to authenticated;
grant select,insert,update,delete on public.coach_athletes to authenticated;

commit;
