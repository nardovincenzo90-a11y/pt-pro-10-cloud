(() => {
  'use strict';
  const CFG='ptpro10_supabase_config',SES='ptpro10_session',VERSION='10.0.0-evolution.4';
  let sending=false,last='';
  const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
  async function send(level,area,message,details={}){
    if(sending)return;const c=read(CFG),s=read(SES),uid=s?.user?.id;if(!c||!s?.access_token||!uid)return;
    const sig=area+'|'+message;if(sig===last)return;last=sig;sending=true;
    try{await fetch(c.url+'/rest/v1/tech_logs',{method:'POST',headers:{apikey:c.key,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({athlete_id:uid,level,area,message:String(message||'Errore').slice(0,1000),details,app_version:VERSION,user_agent:navigator.userAgent})})}catch{}finally{sending=false;setTimeout(()=>{if(last===sig)last=''},3000)}
  }
  window.addEventListener('error',e=>send('error','frontend',e.message,{file:e.filename,line:e.lineno,column:e.colno}));
  window.addEventListener('unhandledrejection',e=>send('error','promise',e.reason?.message||String(e.reason||'Unhandled rejection'),{stack:e.reason?.stack||null}));
  window.PTPRO_LOG=(level,area,message,details)=>send(level||'info',area||'app',message,details||{});
})();
