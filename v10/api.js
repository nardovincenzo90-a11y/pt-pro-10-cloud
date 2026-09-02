(() => {
'use strict';
const CFG='ptpro10_supabase_config', SES='ptpro10_session';
const config=()=>{try{return JSON.parse(localStorage.getItem(CFG)||'null')}catch{return null}};
const session=()=>{try{return JSON.parse(localStorage.getItem(SES)||'null')}catch{return null}};
async function request(path,{method='GET',body,headers={}}={}){
  const c=config(),s=session();
  if(!c?.url||!c?.key)throw new Error('Configurazione Supabase mancante');
  if(!s?.access_token)throw new Error('Sessione scaduta');
  const r=await fetch(c.url+path,{method,headers:{apikey:c.key,Authorization:`Bearer ${s.access_token}`,Accept:'application/json','Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!r.ok)throw new Error(data?.message||data?.hint||data?.error_description||`Errore ${r.status}`);
  return data;
}
const qs=o=>{const q=new URLSearchParams();Object.entries(o||{}).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')q.set(k,String(v))});return q.toString()};
const get=(table,params={})=>request(`/rest/v1/${table}?${qs(params)}`);
const post=(table,body)=>request(`/rest/v1/${table}`,{method:'POST',body,headers:{Prefer:'return=representation'}});
const patch=(table,filter,body)=>request(`/rest/v1/${table}?${qs(filter)}`,{method:'PATCH',body,headers:{Prefer:'return=representation'}});
const del=(table,filter)=>request(`/rest/v1/${table}?${qs(filter)}`,{method:'DELETE',headers:{Prefer:'return=representation'}});
async function user(){return request('/auth/v1/user')}
async function bootstrap(){
  const u=await user(), uid=u.id;
  const [profiles,plans,measures,sessions,checkins,goals]=await Promise.all([
    get('profiles',{select:'*',id:`eq.${uid}`,limit:1}),
    get('workout_plans',{select:'*',athlete_id:`eq.${uid}`,archived_at:'is.null',order:'active.desc,created_at.desc'}),
    get('measurements',{select:'*',athlete_id:`eq.${uid}`,order:'measured_on.desc',limit:20}),
    get('workout_sessions',{select:'*',athlete_id:`eq.${uid}`,order:'started_at.desc',limit:40}),
    get('weekly_checkins',{select:'*',athlete_id:`eq.${uid}`,order:'checkin_date.desc',limit:8}).catch(()=>[]),
    get('goals',{select:'*',athlete_id:`eq.${uid}`,order:'created_at.desc',limit:20}).catch(()=>[])
  ]);
  const plan=plans.find(x=>x.active)||plans[0]||null;
  const days=plan?await get('workout_days',{select:'*',plan_id:`eq.${plan.id}`,archived_at:'is.null',order:'sort_order.asc'}):[];
  return {uid,user:u,profile:profiles[0]||{},plan,plans,days,measures,sessions,checkins,goals};
}
async function workout(dayId){
  const [days,items]=await Promise.all([
    get('workout_days',{select:'*',id:`eq.${dayId}`,limit:1}),
    get('workout_items',{select:'*',day_id:`eq.${dayId}`,archived_at:'is.null',order:'sort_order.asc'})
  ]);
  const day=days[0];if(!day)throw new Error('Giorno non trovato');
  const ids=[...new Set(items.map(x=>x.exercise_id).filter(Boolean))];
  const exercises=ids.length?await get('exercises',{select:'id,legacy_id,name,muscle_group,equipment,description,technique,image_url,video_url,tags',id:`in.(${ids.join(',')})`}):[];
  const map=new Map(exercises.map(e=>[e.id,e]));
  const rows=items.map(item=>({...item,exercise:map.get(item.exercise_id)||null}));
  return {day,items:rows};
}
async function exerciseCatalog(){return get('exercises',{select:'id,legacy_id,name,muscle_group,equipment,description,technique,image_url,video_url,tags,active',active:'eq.true',order:'name.asc'})}
async function previousSets(uid,exerciseId){return get('workout_sets',{select:'load,reps,rir,rpe,logged_at,estimated_1rm',athlete_id:`eq.${uid}`,exercise_id:`eq.${exerciseId}`,order:'logged_at.desc',limit:12})}
async function startSession(uid,planId,dayId,count){const r=await post('workout_sessions',{athlete_id:uid,plan_id:planId||null,day_id:dayId,planned_exercises:count||0});return r?.[0]}
async function saveSet(payload){const r=await post('workout_sets',payload);return r?.[0]}
async function finishSession(id,payload){const r=await patch('workout_sessions',{id:`eq.${id}`},payload);return r?.[0]}
async function nutrition(uid){
 const [plans,days,recipes,pantry,lists,supp]=await Promise.all([
  get('nutrition_plans',{select:'*',athlete_id:`eq.${uid}`,order:'active.desc,created_at.desc'}).catch(()=>[]),
  get('nutrition_days',{select:'*',athlete_id:`eq.${uid}`,order:'date.desc',limit:14}).catch(()=>[]),
  get('recipes',{select:'*',limit:250}).catch(()=>[]),get('pantry_stock',{select:'*',athlete_id:`eq.${uid}`,limit:250}).catch(()=>[]),
  get('shopping_lists',{select:'*',athlete_id:`eq.${uid}`,order:'created_at.desc',limit:20}).catch(()=>[]),get('supplements',{select:'*',limit:100}).catch(()=>[])
 ]);return {plans,days,recipes,pantry,lists,supp};
}
window.PTAPI={get,post,patch,del,user,bootstrap,workout,exerciseCatalog,previousSets,startSession,saveSet,finishSession,nutrition};
})();