import fs from 'node:fs';

const api=fs.readFileSync('v10/api.js','utf8');
const workout=fs.readFileSync('v10/workout.js','utf8');
const home=fs.readFileSync('v10/home.js','utf8');

if(/startSession[^\n]+day_id:`eq\.\$\{dayId\}`/.test(api))throw Error('startSession cerca ancora solo la giornata corrente');
for(const token of ['await activeSession(uid)','ended_at:\'is.null\'','activeSession:openSession'])if(!api.includes(token))throw Error(`Bootstrap sessione incompleto: ${token}`);
for(const token of ['restoreSessionSets','api.sessionSets(state.session.id)','new Date(state.session.started_at).getTime()','state.boot.activeSession=state.session','state.boot.activeSession=null','Riprendo l’allenamento già in corso'])if(!workout.includes(token))throw Error(`Ripresa workout incompleta: ${token}`);
for(const token of ['Continua da dove eri rimasto','Riprendi allenamento','active.day_id'])if(!home.includes(token))throw Error(`Home senza ripresa sessione: ${token}`);
if(workout.includes('state.session=null;state.startedAt=null'))throw Error('Il route workout azzera ancora la sessione attiva');

console.log('Workout resume OK: sessione unica, timer originale, set Cloud e ripresa dalla Home');
