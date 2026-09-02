(() => {
'use strict';
const CFG='ptpro10_supabase_config', SES='ptpro10_session';
let cachePromise=null;
const cfg=()=>{try{return JSON.parse(localStorage.getItem(CFG)||'null')}catch{return null}};
const ses=()=>{try{return JSON.parse(localStorage.getItem(SES)||'null')}catch{return null}};
async function catalog(){
  if(cachePromise)return cachePromise;
  cachePromise=(async()=>{
    const c=cfg(),s=ses();
    if(!c||!s?.access_token)return {id:new Map(),legacy:new Map(),name:new Map()};
    const r=await fetch(c.url+'/rest/v1/exercises?select=id,legacy_id,name,muscle_group,equipment,image_url,video_url,category',{headers:{apikey:c.key,Authorization:'Bearer '+s.access_token}});
    if(!r.ok)throw new Error('Catalogo esercizi non disponibile');
    const rows=await r.json(), out={id:new Map(),legacy:new Map(),name:new Map()};
    rows.forEach(e=>{
      out.id.set(String(e.id),e);
      if(e.legacy_id)out.legacy.set(String(e.legacy_id),e);
      if(e.name)out.name.set(String(e.name).trim().toLowerCase(),e);
    });
    return out;
  })().catch(()=>({id:new Map(),legacy:new Map(),name:new Map()}));
  return cachePromise;
}
function css(){
  if(document.getElementById('ptproMediaNativeCss'))return;
  const s=document.createElement('style');s.id='ptproMediaNativeCss';
  s.textContent=`.exerciseSummaryLeft{display:flex;align-items:center;gap:12px;min-width:0}.exerciseSummaryLeft .exerciseThumb{width:58px;height:58px;object-fit:cover;border-radius:13px;border:1px solid #28364b;background:#0b111b;flex:0 0 auto}.exerciseMedia.ptproNativeMedia{display:flex;justify-content:center;margin:0 0 14px;padding:8px;border-radius:16px;background:#0b1118;border:1px solid #26354a}.exerciseMedia.ptproNativeMedia img{display:block;width:auto;max-width:100%;height:auto;max-height:260px;object-fit:contain;border-radius:12px}.exerciseLibraryCard img.exerciseThumb{width:72px;height:72px;object-fit:cover;border-radius:14px;flex:0 0 auto}@media(max-width:650px){.exerciseMedia.ptproNativeMedia img{max-height:210px}.exerciseSummaryLeft .exerciseThumb{width:48px;height:48px}}`;
  document.head.appendChild(s);
}
function escAttr(v){return String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}
async function patchWorkout(){
  const cards=[...document.querySelectorAll('.exercise[data-exercise]')];
  if(!cards.length)return;
  const m=await catalog();css();
  cards.forEach(card=>{
    const key=String(card.dataset.exercise||'');
    let e=m.legacy.get(key)||m.id.get(key);
    if(!e){
      const current=(card.querySelector('.exName')?.textContent||'').trim().toLowerCase();
      if(current)e=m.name.get(current);
    }
    if(!e)return;
    const name=card.querySelector('.exName'); if(name&&(!name.textContent.trim()||/^esercizio$/i.test(name.textContent.trim())))name.textContent=e.name||'Esercizio';
    const meta=card.querySelector('.exMeta'); if(meta&&e.muscle_group&&!meta.textContent.trim())meta.textContent=e.muscle_group;
    const left=card.querySelector('.exerciseSummaryLeft');
    if(left&&e.image_url&&!left.querySelector('img.exerciseThumb')){
      const img=document.createElement('img');img.className='exerciseThumb';img.loading='lazy';img.src=e.image_url;img.alt=e.name||'Esercizio';left.prepend(img);
    }
    const body=card.querySelector('.exerciseBody');
    if(body&&e.image_url&&!body.querySelector('.ptproNativeMedia')){
      const media=document.createElement('div');media.className='exerciseMedia ptproNativeMedia';
      media.innerHTML=`<img loading="lazy" src="${escAttr(e.image_url)}" alt="${escAttr(e.name||'Esercizio')}">`;
      body.prepend(media);
    }
  });
}
async function patchLibrary(){
  const title=[...document.querySelectorAll('h1')].find(x=>/^Esercizi$/i.test((x.textContent||'').trim()));
  if(!title)return;
  const m=await catalog();css();
  document.querySelectorAll('.exerciseLibraryCard').forEach(card=>{
    const label=card.querySelector('.exerciseLibraryText b,b');if(!label)return;
    const e=m.name.get(String(label.textContent||'').trim().toLowerCase());if(!e)return;
    if(!label.textContent.trim())label.textContent=e.name||'Esercizio';
    const old=card.querySelector('.exerciseThumb');
    if(e.image_url&&(!old||old.tagName!=='IMG')){
      const img=document.createElement('img');img.className='exerciseThumb';img.loading='lazy';img.src=e.image_url;img.alt=e.name||'Esercizio';
      if(old)old.replaceWith(img);else card.prepend(img);
    }
  });
}
function sanitizeCoach(){
  document.querySelectorAll('.smartSetPlan').forEach(box=>{
    box.querySelectorAll('strong,.smartLine,small,div').forEach(el=>{
      if(el.children.length>1)return;
      let t=el.textContent||'';
      t=t.replace(/Smart Coach\s*4\.0/gi,'Smart Coach')
         .replace(/undefined% affidabilità/gi,'— affidabilità')
         .replace(/trend undefined%/gi,'trend —')
         .replace(/RIR medio undefined/gi,'RIR medio —')
         .replace(/e1RM undefined/gi,'e1RM —');
      if(t!==el.textContent)el.textContent=t;
    });
  });
}
async function pass(){await Promise.all([patchWorkout(),patchLibrary()]);sanitizeCoach()}
function schedule(){[0,250,750,1500].forEach(ms=>setTimeout(pass,ms))}
document.addEventListener('click',schedule,true);
window.addEventListener('ptpro:modules-ready',schedule);
window.addEventListener('load',schedule);
schedule();
})();