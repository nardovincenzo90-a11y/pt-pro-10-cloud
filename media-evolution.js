(() => {
'use strict';
const CFG='ptpro10_supabase_config', SES='ptpro10_session';
let patched=false, catalogPromise=null;
const cfg=()=>{try{return JSON.parse(localStorage.getItem(CFG)||'null')}catch{return null}};
const ses=()=>{try{return JSON.parse(localStorage.getItem(SES)||'null')}catch{return null}};
async function catalog(){
  if(catalogPromise)return catalogPromise;
  catalogPromise=(async()=>{
    const c=cfg(),s=ses(); if(!c||!s?.access_token)return {id:new Map(),legacy:new Map(),name:new Map()};
    const r=await fetch(c.url+'/rest/v1/exercises?select=id,legacy_id,name,muscle_group,equipment,image_url,video_url,category',{headers:{apikey:c.key,Authorization:'Bearer '+s.access_token}});
    if(!r.ok)throw new Error('Impossibile caricare il catalogo esercizi');
    const rows=await r.json(), out={id:new Map(),legacy:new Map(),name:new Map()};
    for(const e of rows){out.id.set(String(e.id),e);if(e.legacy_id)out.legacy.set(String(e.legacy_id),e);if(e.name)out.name.set(String(e.name).trim().toLowerCase(),e)}
    return out;
  })().catch(()=>({id:new Map(),legacy:new Map(),name:new Map()}));
  return catalogPromise;
}
function findExercise(m,x){
  return m.id.get(String(x?.exUuid||x?._uuid||x?.id||'')) || m.legacy.get(String(x?.exId||x?.legacy_id||'')) || m.name.get(String(x?.exNome||x?.nomeEsercizio||x?.nome||x?.name||'').trim().toLowerCase()) || null;
}
function enrich(x,m){
  if(!x)return x; const e=findExercise(m,x)||{};
  const name=x.exNome||x.nomeEsercizio||x.nome||x.name||e.name||'Esercizio';
  x.exNome=name;
  x.nome=x.nome||name;
  x.nomeEsercizio=x.nomeEsercizio||name;
  x.gruppo=x.gruppo||e.muscle_group||e.category||'';
  x.attrezzatura=x.attrezzatura||x.attrezzo||e.equipment||'';
  x.attrezzo=x.attrezzo||x.attrezzatura;
  x.imgUrl=x.imgUrl||x.immagine||x.image_url||e.image_url||'';
  x.immagine=x.immagine||x.imgUrl;
  x.videoUrl=x.videoUrl||x.video||x.video_url||e.video_url||'';
  return x;
}
async function normalize(name,res){
  if(!res||typeof res!=='object')return res;
  if(name==='api_getWorkout'||name==='api_getExercises'){
    const m=await catalog();
    if(Array.isArray(res.exercises))res.exercises=res.exercises.map(x=>enrich(x,m));
  }
  if(name==='api_getSmartPrescription9'){
    if(res.confidence==null)res.confidence='—';
    if(res.reason==null)res.reason='Analisi in aggiornamento';
    if(res.trendPct==null)res.trendPct=0;
    if(res.avgRir==null)res.avgRir='—';
    if(res.latestE1rm==null)res.latestE1rm='—';
    if(!Array.isArray(res.prescription))res.prescription=[];
  }
  return res;
}
function patchGas(){
  if(patched||typeof window.gas!=='function')return;
  const original=window.gas;
  window.gas=async function(name,...args){return normalize(name,await original(name,...args));};
  patched=true;
  document.documentElement.dataset.ptproMedia='native';
}
const timer=setInterval(()=>{patchGas();if(patched)clearInterval(timer)},50);
window.addEventListener('ptpro:modules-ready',patchGas);
setTimeout(patchGas,0);
setTimeout(()=>clearInterval(timer),15000);
})();