const CACHE='ptpro11-shell-v19';
const SHELL=['/','/index.html','/styles.css','/auth-gate.js','/ui-fixes.js','/cloud-evolution.js','/manifest.webmanifest','/ptpro-icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.pathname.startsWith('/api/')||u.hostname.includes('supabase.co'))return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/'))));
});
self.addEventListener('push',e=>{
  let data={};try{data=e.data?.json()||{}}catch{data={body:e.data?.text()||''}}
  e.waitUntil(self.registration.showNotification(data.title||'PT-PRO',{body:data.body||'',icon:'/ptpro-icon.svg',badge:'/ptpro-icon.svg',tag:data.tag||data.id||undefined,data:data.action||data.url||'/',renotify:false}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const target=typeof e.notification.data==='string'?e.notification.data:(e.notification.data?.url||'/');
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus'in c){c.navigate?.(target);return c.focus()}}return self.clients.openWindow?self.clients.openWindow(target):null}));
});
