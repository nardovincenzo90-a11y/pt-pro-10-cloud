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
  const u=await user(),uid=u.id;
  const [profiles,plans,measures,sessions,checkins,goals,notifications,events]=await Promise.all([
    get('profiles',{select:'*',id:`eq.${uid}`,limit:1}),
    get('workout_plans',{select:'*',athlete_id:`eq.${uid}`,archived_at:'is.null',order:'active.desc,created_at.desc'}),
    get('measurements',{select:'*',athlete_id:`eq.${uid}`,order:'measured_on.desc',limit:30}),
    get('workout_sessions',{select:'*',athlete_id:`eq.${uid}`,order:'started_at.desc',limit:60}),
    get('weekly_checkins',{select:'*',athlete_id:`eq.${uid}`,order:'checkin_date.desc',limit:12}).catch(()=>[]),
    get('goals',{select:'*',athlete_id:`eq.${uid}`,order:'created_at.desc',limit:30}).catch(()=>[]),
    get('notifications',{select:'*',athlete_id:`eq.${uid}`,archived_at:'is.null',order:'created_at.desc',limit:20}).catch(()=>[]),
    get('calendar_events',{select:'*',athlete_id:`eq.${uid}`,order:'starts_at.asc',limit:40}).catch(()=>[])
  ]);
  const plan=plans.find(x=>x.active)||plans[0]||null;
  const days=plan?await get('workout_days',{select:'*',plan_id:`eq.${plan.id}`,archived_at:'is.null',order:'sort_order.asc'}):[];
  return {uid,user:u,profile:profiles[0]||{},plan,plans,days,measures,sessions,checkins,goals,notifications,events};
}
async function workout(dayId){
  const [days,items]=await Promise.all([get('workout_days',{select:'*',id:`eq.${dayId}`,limit:1}),get('workout_items',{select:'*',day_id:`eq.${dayId}`,archived_at:'is.null',order:'sort_order.asc'})]);
  const day=days[0];if(!day)throw new Error('Giorno non trovato');
  const ids=[...new Set(items.map(x=>x.exercise_id).filter(Boolean))];
  const exercises=ids.length?await get('exercises',{select:'*',id:`in.(${ids.join(',')})`}):[];
  const notes=ids.length?await get('exercise_notes',{select:'*',athlete_id:`eq.${day.athlete_id}`,exercise_id:`in.(${ids.join(',')})`}).catch(()=>[]):[];
  const map=new Map(exercises.map(e=>[e.id,e])), noteMap=new Map(notes.map(n=>[n.exercise_id,n]));
  return {day,items:items.map(item=>({...item,exercise:map.get(item.exercise_id)||null,exercise_note:noteMap.get(item.exercise_id)||null}))};
}
async function exerciseCatalog(){return get('exercises',{select:'*',active:'eq.true',order:'name.asc'})}
async function previousSets(uid,exerciseId){return get('workout_sets',{select:'*',athlete_id:`eq.${uid}`,exercise_id:`eq.${exerciseId}`,order:'logged_at.desc',limit:20})}
async function startSession(uid,planId,dayId,count,readiness){const r=await post('workout_sessions',{athlete_id:uid,plan_id:planId||null,day_id:dayId,planned_exercises:count||0,readiness_score:readiness??null});return r?.[0]}
async function saveSet(payload){const r=await post('workout_sets',payload);return r?.[0]}
async function finishSession(id,payload){const r=await patch('workout_sessions',{id:`eq.${id}`},payload);return r?.[0]}
async function saveExerciseNote(uid,exerciseId,data){const old=await get('exercise_notes',{select:'id',athlete_id:`eq.${uid}`,exercise_id:`eq.${exerciseId}`,limit:1});if(old[0])return (await patch('exercise_notes',{id:`eq.${old[0].id}`},data))[0];return (await post('exercise_notes',{athlete_id:uid,exercise_id:exerciseId,...data}))[0]}
async function substitutes(uid,exerciseId){return get('exercise_substitutions',{select:'*',athlete_id:`eq.${uid}`,from_exercise_id:`eq.${exerciseId}`,order:'created_at.desc',limit:12}).catch(()=>[])}
async function saveSubstitution(data){return (await post('exercise_substitutions',data))[0]}
async function measurements(uid){return get('measurements',{select:'*',athlete_id:`eq.${uid}`,order:'measured_on.desc',limit:100})}
async function addMeasurement(data){return (await post('measurements',data))[0]}
async function saveCheckin(uid,data){const old=await get('weekly_checkins',{select:'id',athlete_id:`eq.${uid}`,checkin_date:`eq.${data.checkin_date}`,limit:1});if(old[0])return (await patch('weekly_checkins',{id:`eq.${old[0].id}`},data))[0];return (await post('weekly_checkins',{athlete_id:uid,...data}))[0]}
async function addGoal(data){return (await post('goals',data))[0]}
async function updateGoal(id,data){return (await patch('goals',{id:`eq.${id}`},data))[0]}
async function progressData(uid){const [m,g,c,p,prs,vol]=await Promise.all([measurements(uid),get('goals',{select:'*',athlete_id:`eq.${uid}`,order:'created_at.desc'}).catch(()=>[]),get('weekly_checkins',{select:'*',athlete_id:`eq.${uid}`,order:'checkin_date.desc',limit:30}).catch(()=>[]),get('progress_photos',{select:'*',athlete_id:`eq.${uid}`,order:'photo_date.desc',limit:50}).catch(()=>[]),get('v_exercise_prs',{select:'*',athlete_id:`eq.${uid}`,limit:100}).catch(()=>[]),get('v_weekly_training_volume',{select:'*',athlete_id:`eq.${uid}`,order:'week_start.desc',limit:20}).catch(()=>[])]);return {measurements:m,goals:g,checkins:c,photos:p,prs,volume:vol}}
async function nutrition(uid){
 const [plans,days,recipes,pantry,lists,supp,foods]=await Promise.all([
  get('nutrition_plans',{select:'*',athlete_id:`eq.${uid}`,order:'active.desc,created_at.desc'}).catch(()=>[]),
  get('nutrition_days',{select:'*',athlete_id:`eq.${uid}`,order:'day_date.desc',limit:30}).catch(()=>[]),
  get('recipes',{select:'*',limit:250}).catch(()=>[]),get('pantry_stock',{select:'*',athlete_id:`eq.${uid}`,limit:250}).catch(()=>[]),
  get('shopping_lists',{select:'*',athlete_id:`eq.${uid}`,order:'created_at.desc',limit:20}).catch(()=>[]),get('supplements',{select:'*',active:'eq.true',limit:100}).catch(()=>[]),
  get('foods',{select:'*',limit:300}).catch(()=>[])
 ]);return {plans,days,recipes,pantry,lists,supp,foods};
}
async function nutritionDay(uid,date){const days=await get('nutrition_days',{select:'*',athlete_id:`eq.${uid}`,day_date:`eq.${date}`,limit:1});const day=days[0];if(!day)return {day:null,meals:[]};const meals=await get('meals',{select:'*',nutrition_day_id:`eq.${day.id}`,order:'sort_order.asc'});const ids=meals.map(x=>x.id);const items=ids.length?await get('meal_items',{select:'*',meal_id:`in.(${ids.join(',')})`}):[];return {day,meals:meals.map(m=>({...m,items:items.filter(i=>i.meal_id===m.id)}))}}
async function createNutritionDay(data){return (await post('nutrition_days',data))[0]}
async function addMeal(data){return (await post('meals',data))[0]}
async function addMealItem(data){return (await post('meal_items',data))[0]}
async function calendar(uid){return get('calendar_events',{select:'*',athlete_id:`eq.${uid}`,order:'starts_at.asc',limit:100})}
async function addCalendarEvent(data){return (await post('calendar_events',data))[0]}
async function removeCalendarEvent(id){return del('calendar_events',{id:`eq.${id}`})}
async function notifications(uid){return get('notifications',{select:'*',athlete_id:`eq.${uid}`,archived_at:'is.null',order:'created_at.desc',limit:100})}
async function markNotification(id){return (await patch('notifications',{id:`eq.${id}`},{read_at:new Date().toISOString()}))[0]}
async function coach(uid){
 const links=await get('coach_athletes',{select:'*',coach_id:`eq.${uid}`,active:'eq.true'}).catch(()=>[]);
 const ids=links.map(x=>x.athlete_id);const profiles=ids.length?await get('profiles',{select:'*',id:`in.(${ids.join(',')})`}):[];
 const notes=ids.length?await get('coach_notes',{select:'*',coach_id:`eq.${uid}`,order:'created_at.desc',limit:100}).catch(()=>[]):[];
 return {links,profiles,notes};
}
async function addCoachNote(data){return (await post('coach_notes',data))[0]}
async function techLog(uid,level,area,message,details={}){return post('tech_logs',{athlete_id:uid,level,area,message,details,app_version:'10.0-native',user_agent:navigator.userAgent}).catch(()=>null)}
window.PTAPI={request,get,post,patch,del,user,bootstrap,workout,exerciseCatalog,previousSets,startSession,saveSet,finishSession,saveExerciseNote,substitutes,saveSubstitution,measurements,addMeasurement,saveCheckin,addGoal,updateGoal,progressData,nutrition,nutritionDay,createNutritionDay,addMeal,addMealItem,calendar,addCalendarEvent,removeCalendarEvent,notifications,markNotification,coach,addCoachNote,techLog};
})();