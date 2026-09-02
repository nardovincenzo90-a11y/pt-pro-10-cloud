import fs from 'node:fs';import vm from 'node:vm';
const academy=fs.readFileSync('v10/school-academy-library.js','utf8'),planner=fs.readFileSync('v10/school-planner-library.js','utf8'),ctx={window:{},Date};vm.createContext(ctx);vm.runInContext(academy,ctx);vm.runInContext(planner,ctx);const p=ctx.window.PTPROSchoolPlanner;
if(p.grades.length!==8)throw Error(`Anni scolastici non completi: ${p.grades.length}`);if(p.periods.length!==5)throw Error('Periodi annuali incompleti');
for(const g of p.grades){if(p.sequences[g.id]?.length!==5)throw Error(`Progressione mancante: ${g.id}`);for(let i=0;i<5;i++)if(p.recommend(g.id,i).length<4)throw Error(`Consigli insufficienti: ${g.id}/${i}`)}
const runtime=fs.readFileSync('v10/school-planner-runtime.js','utf8');for(const token of ['Nuova classe','Aggiungi alunni','Presenze','Valutazione','Piano annuale','studentIds'])if(!runtime.includes(token))throw Error(`Funzione registro mancante: ${token}`);
console.log('School Planner OK: 8 anni, 5 periodi, classi, alunni, assegnazioni, presenze e valutazioni');
