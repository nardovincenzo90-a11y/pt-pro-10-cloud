(() => {
'use strict';
const CFG='ptpro10_supabase_config', SES='ptpro10_session';
let byLegacy=new Map(), byName=new Map(), loaded=false, loading=null;
const cfg=()=>{try{return JSON.parse(localStorage.getItem(CFG)||'null')}catch{return null}};
const ses=()=>{try{return JSON.parse(localStorage.getItem(SES)||'null')}catch{return null}};
async function loadMedia(){
  if(loaded)return; if(loading)return loading;
  loading=(async()=>{const c=cfg(),s=ses();if(!c||!s?.access_token)return;const r=await fetch(c.url+'/rest/v1/exercises?select=legacy_id,name,image_url&image_url=not.is.null',{headers:{apikey:c.key,Authorization:'Bearer '+s.access_token}});if(!r.ok)return;const rows=await r.json();for(const e of rows){if(e.legacy_id)byLegacy.set(String(e.legacy_id),e);if(e.name)byName.set(String(e.name).trim().toLowerCase(),e)}loaded=true;})();
  return loading;
}
function css(){if(document.getElementById('ptproMediaCss'))return;const s=document.createElement('style');s.id='ptproMediaCss';s.textContent=`.ptproExerciseImage{width:100%;max-height:330px;object-fit:contain;border-radius:16px;background:#0b111b;border:1px solid #27364b;display:block}.ptproExerciseImageWrap{margin:0 0 14px}.ptproLibThumb{width:56px;height:56px;object-fit:cover;border-radius:12px;border:1px solid #2a3a52;background:#0b111b;flex:0 0 auto}.ptproMediaLoaded .ptpro-placeholder-icon{display:none!important}`;document.head.appendChild(s)}
function cleanName(v){return String(v||'').trim().toLowerCase()}
function addWorkoutImages(){document.querySelectorAll('.exercise[data-exercise]').forEach(card=>{if(card.querySelector('.ptproExerciseImage'))return;const id=card.dataset.exercise||'';const e=byLegacy.get(String(id));if(!e?.image_url)return;const body=card.querySelector('.exerciseBody');if(!body)return;const wrap=document.createElement('div');wrap.className='ptproExerciseImageWrap';wrap.innerHTML=`<img class="ptproExerciseImage" src="${e.image_url}" alt="${(e.name||'Esercizio').replace(/"/g,'&quot;')}" loading="lazy">`;body.prepend(wrap)})}
function addLibraryImages(){
  const title=[...document.querySelectorAll('h1')].find(x=>/^Esercizi$/i.test((x.textContent||'').trim()));if(!title)return;
  document.querySelectorAll('.manageItem,.searchResult,.card,button').forEach(row=>{if(row.closest('.exercise')||row.querySelector('.ptproLibThumb'))return;const label=row.querySelector('b,strong,h3,h2');if(!label)return;const e=byName.get(cleanName(label.textContent));if(!e?.image_url)return;const img=document.createElement('img');img.className='ptproLibThumb';img.src=e.image_url;img.alt=e.name||'Esercizio';img.loading='lazy';const icon=row.querySelector('.exerciseIcon,.icon,.manageIcon');if(icon)icon.replaceWith(img);else row.prepend(img);row.classList.add('ptproMediaLoaded')})
}
function sanitizeCoach(){document.querySelectorAll('.smartSetPlan').forEach(box=>{box.querySelectorAll('strong,.smartLine').forEach(el=>{let t=el.textContent||'';t=t.replace(/Smart Coach\s*4\.0/gi,'Smart Coach').replace(/undefined% affidabilità/gi,'affidabilità in aggiornamento').replace(/trend undefined%/gi,'trend —').replace(/RIR medio undefined/gi,'RIR medio —').replace(/e1RM undefined/gi,'e1RM —');el.textContent=t})})}
async function apply(){await loadMedia();if(!loaded)return;css();addWorkoutImages();addLibraryImages();sanitizeCoach()}
const o=new MutationObserver(()=>apply());o.observe(document.documentElement,{subtree:true,childList:true});window.addEventListener('ptpro:modules-ready',apply);setTimeout(apply,1800);
})();