(() => {
'use strict';
const api=window.PTAPI, app=document.getElementById('app');
const state={boot:null,view:'home',workout:null,session:null,startedAt:null,catalog:null,cache:new Map()};
const routes=new Map();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=1)=>Number.isFinite(Number(v))?Number(v).toLocaleString('it-IT',{maximumFractionDigits:d}):'—';
const today=()=>new Date().toISOString().slice(0,10);
function toast(text,type='ok'){const n=document.createElement('div');n.className='toast '+type;n.textContent=text;document.body.appendChild(n);setTimeout(()=>n.remove(),2400)}
function modal(title,body){const back=document.createElement('div');back.className='modalBack';back.innerHTML=`<div class="modal"><div class="modalHead"><h2>${esc(title)}</h2><button class="iconBtn" data-close>×</button></div>${body}</div>`;document.body.appendChild(back);back.querySelector('[data-close]').onclick=()=>back.remove();back.onclick=e=>{if(e.target===back)back.remove()};return back}
function top(){const unread=(state.boot?.notifications||[]).filter(x=>!x.read_at).length;return `<div class="top"><div class="brand mobileBrand"><div class="logo"></div><div><b>PT-PRO</b><span>Smart Performance</span></div></div><button class="cloudPill" data-route="notifications">☁ Cloud${unread?` · 🔔 ${unread}`:''}</button></div>`}
const navItems=[['home','⌂','Home'],['workout','🏋️','Workout'],['progress','↗','Progressi'],['nutrition','🥗','Nutrizione'],['more','•••','Altro']];
function nav(){return `<nav class="bottom">${navItems.map(([v,i,l])=>`<button data-route="${v}" class="${state.view===v?'active':''}"><b>${i}</b>${l}</button>`).join('')}</nav>`}
const sideGroups=[['IMPOSTAZIONI',[['profile-pro','♙','Profilo'],['appearance','◉','Aspetto'],['notifications','♧','Notifiche'],['quick-actions','⚙','Preferenze'],['backup','☁','Backup & Dati']]],['STRUMENTI PRO',[['coach-smart','♜','Smart Coach'],['data-manager','▣','Builder Schede'],['progress','↗','Centro Progressi'],['nutrition','◉','Nutrizione PRO'],['calendar','▦','Calendario'],['reports','▥','Report & Analytics']]],['SUPPORTO',[['system-pro','?','Guida & Sistema'],['search','⌕','Ricerca globale']]]];
function sidebar(){const p=state.boot?.profile||{},name=p.display_name||p.first_name||'Vincenzo';return `<aside class="sidebar"><button class="sideBrand" data-route="home"><div class="logo"></div><div><b>PT-PRO</b><span>Smart Performance</span></div></button><div class="sideDivider"></div>${sideGroups.map(([title,items])=>`<section class="sideGroup"><div class="sideTitle">${title}</div>${items.map(([r,i,l])=>`<button data-route="${r}" class="sideItem ${state.view===r?'active':''}"><span class="sideIcon">${i}</span><b>${l}</b></button>`).join('')}</section>`).join('')}<button class="userCard" data-route="profile-pro"><span class="avatar">${esc(name).slice(0,2).toUpperCase()}</span><span><b>${esc(name)}</b><small>Atleta • PRO</small></span><i>›</i></button></aside>`}
function bindRoutes(root=document){root.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>go(b.dataset.route))}
function shell(content){app.innerHTML=`<div class="appFrame">${sidebar()}<main class="app">${top()}${content}</main></div>${nav()}`;bindRoutes()}
function loading(t='Caricamento…'){app.innerHTML=`<div class="appFrame">${sidebar()}<main class="app">${top()}<div class="loading"><div class="spinner"></div><span>${esc(t)}</span></div></main></div>`;bindRoutes()}
function failure(e){console.error(e);shell(`<div class="card"><h2>Errore</h2><div class="error">${esc(e?.message||e)}</div><button class="btn secondary" data-route="home">Torna alla Home</button></div>`)}
function register(name,fn){routes.set(name,fn)}
async function go(name,...args){state.view=name;const fn=routes.get(name);if(!fn){toast('Sezione non disponibile','err');return}try{await fn(...args)}catch(e){failure(e)}}
async function refresh(){state.boot=await api.bootstrap();return state.boot}
async function start(){loading('Avvio PT-PRO 10…');try{await refresh();await go('home')}catch(e){failure(e)}}
function readiness(){const c=state.boot?.checkins?.[0]||{};if(Number.isFinite(Number(c.recovery_score)))return Math.round(Number(c.recovery_score));const vals=[c.sleep,c.energy,c.motivation,c.stress!=null?10-Number(c.stress):null,c.doms!=null?10-Number(c.doms):null].map(Number).filter(Number.isFinite);return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10):70}
function smartAdvice(r){return r<50?['Scarico consigliato','Riduci volume 30–40%, evita il cedimento e cura il recupero.']:r<65?['Fatica moderata','Mantieni margine tecnico e riduci leggermente volume o intensità.']:r>82?['Pronto a progredire','Recupero alto: puoi cercare una piccola progressione mantenendo tecnica pulita.']:['Programmazione regolare','Prosegui come previsto e usa il RIR per autoregolarti.']}
window.PTAPP={api,state,esc,fmt,today,toast,modal,shell,loading,failure,register,go,refresh,start,readiness,smartAdvice,bindRoutes};
})();