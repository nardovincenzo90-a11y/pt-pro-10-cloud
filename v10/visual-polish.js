(() => {
'use strict';
const A=window.PTAPP,api=window.PTAPI;if(!A||!api||window.PTPROVisualPolish)return;
let timer=0,pending=0;
function node(){let n=document.querySelector('.ptproSaveState');if(!n){n=document.createElement('div');n.className='ptproSaveState';n.setAttribute('role','status');n.setAttribute('aria-live','polite');document.body.appendChild(n)}return n}
function show(state,text,delay=1500){const n=node();clearTimeout(timer);n.dataset.state=state;n.textContent=text;n.classList.add('show');if(delay)timer=setTimeout(()=>n.classList.remove('show'),delay)}
function wrap(name){const original=api[name];if(typeof original!=='function'||original.__visualWrapped)return;const wrapped=async(...args)=>{pending++;show('saving','Salvataggio nel Cloud…',0);try{const value=await original.apply(api,args);pending--;if(!pending)show('saved','Salvato nel Cloud ✓');return value}catch(error){pending=Math.max(0,pending-1);show('error','Salvataggio non riuscito',2600);throw error}};wrapped.__visualWrapped=true;api[name]=wrapped}
['post','patch','delete'].forEach(wrap);
function images(root=document){root.querySelectorAll('img:not([data-ptpro-image])').forEach(img=>{img.dataset.ptproImage='1';img.loading='lazy';img.decoding='async';if(img.complete){img.dataset.ptproLoaded='true'}else{img.dataset.ptproLoading='true';img.addEventListener('load',()=>{delete img.dataset.ptproLoading;img.dataset.ptproLoaded='true'},{once:true});img.addEventListener('error',()=>{delete img.dataset.ptproLoading;img.alt=img.alt||'Immagine non disponibile'},{once:true})}})}
new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType===1)images(n)}))).observe(document.getElementById('app'),{childList:true,subtree:true});
images();window.PTPROVisualPolish={show,images,version:'12.1'};
})();
