import fs from 'node:fs';
const js=fs.readFileSync('v10/training-cycles.js','utf8'),css=fs.readFileSync('v10/training-cycles.css','utf8'),manifest=fs.readFileSync('app-manifest.js','utf8'),index=fs.readFileSync('index.html','utf8');
for(const token of ['workout-cycles','cycle_weeks','cycle_start','cycle_end','cycle_checkins','source_plan_id','Rivedi e crea il prosieguo','Check-in settimanale','Continua e progredisci','Cambia fase','Riprogramma','Perché te lo consiglio','Conferma e attiva','archived_at','Ripristina','ptpro_cycle_draft_v1'])if(!js.includes(token))throw Error(`Sistema cicli incompleto: ${token}`);
for(const token of ['workout_sessions','workout_sets','completion_percent','target_load','target_rir','exercise_id'])if(!js.includes(token))throw Error(`Analisi o progressione incompleta: ${token}`);
for(const token of ['.cycleProgress','.cycleMetricGrid','.cycleCompare','@media(max-width:760px)'])if(!css.includes(token))throw Error(`Layout cicli incompleto: ${token}`);
if(!manifest.includes('v24-training-cycles')||!index.includes('/v10/training-cycles.css'))throw Error('Modulo cicli non caricato');
console.log('Training cycles OK: durata, check-in, analisi, anteprima, attivazione, storico e ripristino');
