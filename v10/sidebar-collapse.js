(() => {
'use strict';
const KEY='ptpro_desktop_sidebar_collapsed',root=document.documentElement,app=document.getElementById('app');
const isDesktop=()=>matchMedia('(min-width:1021px)').matches;
const saved=()=>localStorage.getItem(KEY)==='1';
function apply(collapsed){root.dataset.sidebarCollapsed=collapsed?'true':'false';localStorage.setItem(KEY,collapsed?'1':'0');const button=document.querySelector('[data-desktop-sidebar-toggle]');if(button){button.setAttribute('aria-expanded',String(!collapsed));button.setAttribute('aria-label',collapsed?'Apri menu laterale':'Chiudi menu laterale');button.title=collapsed?'Apri menu':'Chiudi menu';button.textContent=collapsed?'☰':'‹'}}
function ensure(){let button=document.querySelector('[data-desktop-sidebar-toggle]');if(!button){button=document.createElement('button');button.type='button';button.className='desktopSidebarToggle';button.dataset.desktopSidebarToggle='1';button.onclick=()=>apply(root.dataset.sidebarCollapsed!=='true');document.body.appendChild(button)}apply(isDesktop()&&saved())}
new MutationObserver(ensure).observe(app,{childList:true,subtree:true});
addEventListener('resize',ensure,{passive:true});
ensure();
})();
