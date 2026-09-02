-- PT-PRO 10 Cloud — RLS audit (read-only)
-- Eseguire come utente autenticato in Supabase SQL Editor solo per verifica finale.

with app_tables as (
  select c.oid, n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r'
), policies as (
  select schemaname, tablename, count(*) as policy_count
  from pg_policies
  where schemaname='public'
  group by schemaname, tablename
)
select a.table_name,
       a.rls_enabled,
       coalesce(p.policy_count,0) as policy_count,
       case
         when a.rls_enabled and coalesce(p.policy_count,0)>0 then 'OK'
         when a.rls_enabled then 'ATTENZIONE: RLS senza policy'
         else 'ATTENZIONE: RLS disabilitata'
       end as status
from app_tables a
left join policies p on p.schemaname=a.schema_name and p.tablename=a.table_name
where a.table_name in (
'profiles','coach_athletes','coach_notes','exercises','exercise_notes','workout_plans','workout_days','workout_items','workout_item_set_targets','workout_sessions','workout_sets','exercise_substitutions','measurements','goals','weekly_checkins','progress_photos','smart_coach_recommendations','foods','food_preferences','nutrition_plans','nutrition_days','meals','meal_items','food_substitutions','pantry_stock','shopping_lists','shopping_list_items','supplements','supplement_logs','calendar_events','notifications','user_preferences','trash','tech_logs','audit_log','recipes','recipe_items'
)
order by a.table_name;

-- Deve risultare zero.
select count(*) as tables_without_rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and c.relrowsecurity=false
and c.relname in ('profiles','coach_athletes','exercises','workout_plans','workout_days','workout_items','workout_sessions','workout_sets','measurements','goals','weekly_checkins','foods','nutrition_plans','calendar_events','notifications','progress_photos');
