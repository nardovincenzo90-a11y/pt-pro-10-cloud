(() => {
  'use strict';
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const names=new Map();
  let loading=false;
  const cfg=()=>{try{return JSON.parse(localStorage.getItem('ptpro10_supabase_config')||'null')}catch{return null}};
  const ses=()=>{try{return JSON.parse(localStorage.getItem('ptpro10_session')||'null')}catch{return null}};
  async function rest(path){const c=cfg(),s=ses();if(!c||!s?.access_token)return[];const r=await fetch(c.url+'/rest/v1/'+path,{headers:{apikey:c.key,Authorization:'Bearer '+s.access_token}});return r.ok?r.json():[]}
  async function hydrate(){if(loading||names.size)return;loading=true;try{
    const [days,sessions,plans]=await Promise.all([
      rest('workout_days?select=id,name,plan_id&archived_at=is.null'),
      rest('workout_sessions?select=id,day_id,plan_id&order=started_at.desc&limit=100'),
      rest('workout_plans?select=id,title&archived_at=is.null')
    ]);
    const dayMap=new Map(days.map(d=>[String(d.id),d]));
    const planMap=new Map(plans.map(p=>[String(p.id),p.title||'Scheda']));
    days.forEach(d=>names.set(String(d.id),d.name||planMap.get(String(d.plan_id))||'Allenamento'));
    sessions.forEach(s=>{const d=dayMap.get(String(s.day_id));names.set(String(s.id),d?.name||planMap.get(String(s.plan_id))||'Allenamento')});
    plans.forEach(p=>names.set(String(p.id),p.title||'Scheda'));
  }catch(e){}finally{loading=false;apply()}}
  function friendlyName(id){
    if(names.has(String(id)))return names.get(String(id));
    try{const days=(typeof state!=='undefined'&&state?.boot?.days)||[];const d=days.find(x=>String(x?._uuid||'')===String(id)||String(x?.giornoId||'')===String(id));if(d?.nomeGiorno)return d.nomeGiorno}catch(e){}
    return 'Allenamento';
  }
  function apply(){
    document.querySelectorAll('h1,h2,h3,b,.row-title,.historyRow .muted,.sessionTitle,.session-name').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(UUID.test(t))el.textContent=friendlyName(t);else{const m=t.match(/^([0-9a-f]{8}-[0-9a-f-]{27})\s*•\s*(.+)$/i);if(m&&UUID.test(m[1]))el.textContent=friendlyName(m[1])+' • '+m[2]}
    });
  }
  const observer=new MutationObserver(()=>{apply();if(!names.size)hydrate()});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(()=>{apply();hydrate()},300);
})();
