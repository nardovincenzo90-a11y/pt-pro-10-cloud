(() => {
'use strict';
const CFG='ptpro10_supabase_config', SES='ptpro10_session';
let cachePromise=null, patched=false;
const cfg=()=>{try{return JSON.parse(localStorage.getItem(CFG)||'null')}catch{return null}};
const ses=()=>{try{return JSON.parse(localStorage.getItem(SES)||'null')}catch{return null}};
async function catalog(){
  if(cachePromise)return cachePromise;
  cachePromise=(async()=>{
    const c=cfg(),s=ses(); if(!c||!s?.access_token)return {id:new Map(),legacy:new Map(),name:new Map()};
    const r=await fetch(c.url+'/rest/v1/exercises?select=id,legacy_id,name,muscle_group,equipment,image_url,video_url,category',{headers:{apikey:c.key,Authorization:'Bearer '+s.access_token}});
    if(!r.ok)throw new Error('Catalogo esercizi non disponibile');
    const rows=await r.json(), out={id:new Map(),legacy:new Map(),name:new Map()};
    rows.forEach(e=>{out.id.set(String(e.id),e);if(e.legacy_id)out.legacy.set(String(e.legacy_id),e);if(e.name)out.name.set(String(e.name).trim().toLowerCase(),e)});
    return out;
  })().catch(()=>({id:new Map(),legacy:new Map(),name:new Map()}));
  return cachePromise;
}
function lookup(m,x){
  return m.id.get(String(x?.exUuid||x?._uuid||x?.id||'')) || m.legacy.get(String(x?.exId||x?.legacy_id||'')) || m.name.get(String(x?.exNome||x?.nomeEsercizio||x?.nome||x?.name||'').trim().toLowerCase()) || null;
}
function enrich(x,m){
  if(!x)return x; const e=lookup(m,x); if(!e)return x;
  const name=x.exNome||x.nomeEsercizio||x.nome||e.name||'Esercizio';
  x.exNome=name; x.nome=x.nome||name; x.nomeEsercizio=x.nomeEsercizio||name;
  x.gruppo=x.gruppo||e.muscle_group||e.category||'';
  x.attrezzatura=x.attrezzatura||x.attrezzo||e.equipment||''; x.attrezzo=x.attrezzo||x.attrezzatura;
  x.imgUrl=e.image_url||x.imgUrl||x.immagine||x.image_url||''; x.immagine=x.imgUrl;
  x.videoUrl=e.video_url||x.videoUrl||x.video||x.video_url||'';
  return x;
}
async function enrichCurrentWorkout(){
  if(!window.state?.workout?.exercises?.length || typeof window.renderWorkout!=='function')return;
  const m=await catalog();
  window.state.workout.exercises=window.state.workout.exercises.map(x=>enrich(x,m));
  window.renderWorkout();
}
async function patchLibraryOnce(){
  const title=[...document.querySelectorAll('h1')].find(x=>(x.textContent||'').trim()==='Esercizi');
  if(!title)return;
  const m=await catalog();
  document.querySelectorAll('.exerciseLibraryCard').forEach(card=>{
    if(card.querySelector('img'))return;
    const label=card.querySelector('b'); if(!label)return;
    const e=m.name.get(String(label.textContent||'').trim().toLowerCase()); if(!e?.image_url)return;
    const old=card.querySelector('.exerciseThumb');
    const img=document.createElement('img'); img.className='exerciseThumb'; img.loading='lazy'; img.src=e.image_url; img.alt=e.name||'Esercizio';
    if(old)old.replaceWith(img); else card.prepend(img);
  });
}
function sanitizeCoach(){
  document.querySelectorAll('.smartSetPlan').forEach(box=>{
    const strong=box.querySelector('strong'); if(strong){let t=strong.textContent||'';t=t.replace(/undefined%|—%/g,'—').replace(/Smart Coach\s*4\.0/gi,'Smart Coach');strong.textContent=t;}
  });
}
function install(){
  if(patched)return;
  if(typeof window.openWorkout!=='function' || typeof window.exerciseLibrary!=='function')return;
  const originalOpen=window.openWorkout;
  window.openWorkout=async function(...args){const r=await originalOpen.apply(this,args);await enrichCurrentWorkout();sanitizeCoach();return r;};
  const originalLibrary=window.exerciseLibrary;
  window.exerciseLibrary=async function(...args){const r=await originalLibrary.apply(this,args);await patchLibraryOnce();return r;};
  patched=true;
  if(window.state?.workout?.exercises?.length)enrichCurrentWorkout().then(sanitizeCoach);
  else patchLibraryOnce();
}
window.addEventListener('ptpro:modules-ready',()=>setTimeout(install,0));
const t=setInterval(()=>{install();if(patched)clearInterval(t)},100);
setTimeout(()=>clearInterval(t),15000);
})();