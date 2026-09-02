(() => {
  'use strict';
  const replacements=[
    [/^Smart Coach\s*[234](?:\.0)?$/i,'Smart Coach'],
    [/^Smart Coach\s*4\.0\s*·/i,'Smart Coach ·'],
    [/^Nutrition Pro$/i,'Nutrizione'],
    [/^Nutrizione Smart$/i,'Nutrizione'],
    [/^Smart Nutrition$/i,'Nutrizione'],
    [/^Analytics$/i,'Analisi'],
    [/^Report Mensile Smart Coach$/i,'Report Progressi'],
    [/^Readiness$/i,'Prontezza'],
    [/^Readiness & Fatigue$/i,'Prontezza e fatica'],
    [/^Cloud online$/i,'Cloud connesso'],
    [/^Workout settimana$/i,'Allenamenti settimana'],
    [/^Streak giorni$/i,'Giorni consecutivi'],
    [/^Minuti settimana$/i,'Minuti settimanali'],
    [/^kcal target$/i,'Calorie obiettivo'],
    [/^Carbo$/i,'Carboidrati']
  ];
  function normalizeText(el){
    if(el.children.length>2)return;
    const raw=(el.textContent||'').trim();if(!raw)return;
    for(const [rx,to] of replacements){if(rx.test(raw)){if(el.children.length===0)el.textContent=raw.replace(rx,to);break}}
  }
  function dedupeContainer(root){
    const seen=new Set();
    [...root.children].forEach(el=>{
      if(!/^(BUTTON|A)$/.test(el.tagName))return;
      const key=(el.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
      if(!key)return;
      if(seen.has(key))el.style.display='none';else seen.add(key);
    });
  }
  function dedupeCards(selector){const a=[...document.querySelectorAll(selector)];a.slice(1).forEach(x=>x.remove())}
  function cleanUndefined(){document.querySelectorAll('b,strong,.stat,.bigValue').forEach(el=>{if((el.textContent||'').trim()==='undefined')el.textContent='—'})}
  function apply(){
    document.querySelectorAll('h1,h2,h3,.viewTitle,.sectionTitle,.eyebrow,button,a,span,b,strong,.small').forEach(normalizeText);
    document.querySelectorAll('nav,.quick,.manageGrid,.moreGrid,.tabs').forEach(dedupeContainer);
    dedupeCards('.ptpro-fatigue');dedupeCards('.ptpro-nutriHub');cleanUndefined();
    document.documentElement.lang='it';
    document.documentElement.dataset.ptproUnified='true';
  }
  const o=new MutationObserver(apply);o.observe(document.documentElement,{subtree:true,childList:true});setTimeout(apply,0);
})();