(() => {
  'use strict';
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function friendlyName(id){
    try{
      const days=(typeof state!=='undefined' && state?.boot?.days)||[];
      const d=days.find(x=>String(x?._uuid||'')===String(id)||String(x?.giornoId||'')===String(id));
      if(d?.nomeGiorno) return d.nomeGiorno;
    }catch(e){}
    return 'Allenamento';
  }

  function apply(){
    document.querySelectorAll('h1,h2,h3,b,.row-title,.historyRow .muted').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(UUID.test(t)) el.textContent=friendlyName(t);
      else {
        const m=t.match(/^([0-9a-f]{8}-[0-9a-f-]{27})\s*•\s*(.+)$/i);
        if(m && UUID.test(m[1])) el.textContent=friendlyName(m[1])+' • '+m[2];
      }
    });
  }

  const observer=new MutationObserver(()=>apply());
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(apply,0);
})();
