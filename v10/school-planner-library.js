(() => {
'use strict';
const grades=[
{id:'m1',label:'1ª media',level:'Secondaria I grado',focus:'Schemi motori, regole, corpo e collaborazione'},
{id:'m2',label:'2ª media',level:'Secondaria I grado',focus:'Capacità motorie, apparati, tecnica e autonomia'},
{id:'m3',label:'3ª media',level:'Secondaria I grado',focus:'Allenamento, salute, cittadinanza e orientamento'},
{id:'s1',label:'1ª superiore',level:'Secondaria II grado',focus:'Fondamenti scientifici e metodo di lavoro'},
{id:'s2',label:'2ª superiore',level:'Secondaria II grado',focus:'Anatomia funzionale e capacità motorie'},
{id:'s3',label:'3ª superiore',level:'Secondaria II grado',focus:'Fisiologia, metodologia e prevenzione'},
{id:'s4',label:'4ª superiore',level:'Secondaria II grado',focus:'Programmazione, salute e analisi dei dati'},
{id:'s5',label:'5ª superiore',level:'Secondaria II grado',focus:'Autonomia, cittadinanza, sport e progetto finale'}
];
const periods=[{id:'set-ott',label:'Settembre–Ottobre',months:[8,9]},{id:'nov-dic',label:'Novembre–Dicembre',months:[10,11]},{id:'gen-feb',label:'Gennaio–Febbraio',months:[0,1]},{id:'mar-apr',label:'Marzo–Aprile',months:[2,3]},{id:'mag-giu',label:'Maggio–Giugno',months:[4,5]}];
const sequences={
m1:[['coordinative','sport','muscoli'],['condizionali','prevenzione','postura'],['cellula','alimentazione','salute'],['cardiorespiratorio','inclusione','sport'],['energia','postura','sport']],
m2:[['coordinative','muscoli','sport'],['condizionali','cardiorespiratorio','prevenzione'],['neuroni','cellula','alimentazione'],['postura','paramorfismi','inclusione'],['energia','salute','sport']],
m3:[['condizionali','energia','sport'],['muscoli','cardiorespiratorio','prevenzione'],['alimentazione','salute','neuroni'],['postura','paramorfismi','inclusione'],['sport','salute','prevenzione']],
s1:[['cellula','muscoli','coordinative'],['condizionali','sport','prevenzione'],['cardiorespiratorio','energia','alimentazione'],['postura','salute','inclusione'],['sport','prevenzione','salute']],
s2:[['muscoli','neuroni','coordinative'],['condizionali','cardiorespiratorio','energia'],['cellula','alimentazione','salute'],['postura','paramorfismi','prevenzione'],['sport','inclusione','salute']],
s3:[['cardiorespiratorio','energia','condizionali'],['muscoli','neuroni','prevenzione'],['alimentazione','salute','cellula'],['postura','paramorfismi','inclusione'],['sport','prevenzione','salute']],
s4:[['condizionali','energia','cardiorespiratorio'],['muscoli','neuroni','coordinative'],['alimentazione','salute','prevenzione'],['postura','paramorfismi','inclusione'],['sport','salute','prevenzione']],
s5:[['salute','sport','inclusione'],['energia','condizionali','prevenzione'],['alimentazione','neuroni','cellula'],['postura','paramorfismi','muscoli'],['sport','salute','inclusione']]
};
const currentPeriod=(month=new Date().getMonth())=>periods.findIndex(p=>p.months.includes(month))<0?0:periods.findIndex(p=>p.months.includes(month));
const recommend=(gradeId,periodIndex=currentPeriod())=>{const academy=window.PTPROSchoolAcademy,ids=sequences[gradeId]?.[periodIndex]||sequences.m1[0],grade=grades.find(x=>x.id===gradeId)||grades[0];return ids.flatMap((id,order)=>academy.lessons.filter(x=>x.topic===id&&x.level===grade.level).slice(order,order+2).map(x=>({...x,recommendedTopic:id,period:periods[periodIndex].label,grade:grade.label}))).slice(0,6)};
window.PTPROSchoolPlanner={grades,periods,sequences,currentPeriod,recommend};
})();
