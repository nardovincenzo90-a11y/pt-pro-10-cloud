(() => {
'use strict';
const lib=window.PTPROSportLibrary;if(!lib?.session)return;
const baseSession=lib.session.bind(lib);
const block=(title,kind,prescription,instructions)=>({title,kind,prescription,instructions});
function walking(brisk=false){return [
 block('Attivazione articolare','warmup',{minutes:6,rpe:2},'Mobilità di caviglie, anche e spalle, poi cammino molto facile.'),
 block(brisk?'Camminata veloce a ritmo continuo':'Camminata facile a ritmo continuo','endurance',{minutes:brisk?25:30,rpe:brisk?5:3,steps:brisk?3200:3000},brisk?'Passo sostenuto ma controllato: riesci ancora a parlare per frasi brevi.':'Ritmo conversazionale e postura rilassata.'),
 block('Blocchi di passo attivo','conditioning',{sets:brisk?6:4,minutes:2,recovery_min:1,rpe:brisk?6:5},'Alterna passo più rapido e recupero facile senza arrivare allo sprint.'),
 block('Forza utile al cammino','strength',{sets:2,reps:10},'Sit-to-stand, calf raise e step-up basso con controllo.'),
 block('Defaticamento','cooldown',{minutes:5,rpe:2},'Riduci progressivamente il ritmo e termina con respirazione calma.')
]}
lib.session=function(activity,...args){const s=String(activity?.slug||'');if(s==='walking')return walking(false);if(s==='brisk-walking')return walking(true);return baseSession(activity,...args)};
})();