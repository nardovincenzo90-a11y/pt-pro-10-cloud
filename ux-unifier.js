(() => {
  'use strict';
  const replacements=[
    [/^Smart Coach\s*[234](?:\.0)?$/i,'Smart Coach Cloud'],
    [/^Smart Coach\s*4\.0\s*·/i,'Smart Coach ·'],
    [/^Nutrition Pro$/i,'Nutrizione'],
    [/^Nutrizione Smart$/i,'Nutrizione'],
    [/^Smart Nutrition$/i,'Nutrizione'],
    [/^Analytics$/i,'Analisi'],
    [/^Report Mensile Smart Coach$/i,'Report Progressi']
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
  function apply(){
    document.querySelectorAll('h1,h2,h3,.viewTitle,.sectionTitle,.eyebrow,button,a').forEach(normalizeText);
    document.querySelectorAll('nav,.quick,.manageGrid,.moreGrid,.tabs').forEach(dedupeContainer);
    document.documentElement.dataset.ptproUnified='true';
  }
  const o=new MutationObserver(apply);o.observe(document.documentElement,{subtree:true,childList:true});setTimeout(apply,0);
})();
