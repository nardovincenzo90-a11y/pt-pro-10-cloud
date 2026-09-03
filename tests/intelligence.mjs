import fs from 'node:fs';
const runtime=fs.readFileSync('v10/intelligence-runtime.js','utf8'),css=fs.readFileSync('v10/intelligence.css','utf8');
for(const token of ['PTPROIntelligence','IA, analisi e automazioni','Riepilogo settimanale','Protezione recupero','Piano e spesa della settimana','Chiusura lezione','Protezione bozze','Elaborazione locale','Ripristina','runDue','assistant','activity_logs'])if(!runtime.includes(token))throw Error(`Intelligence contract missing: ${token}`);
for(const token of ['intelligenceGrid','automationGrid','aiAnswer','@media(max-width:760px)'])if(!css.includes(token))throw Error(`Intelligence style missing: ${token}`);
console.log('PT-PRO Intelligence OK: analisi, 8 automazioni, assistente locale e bozze');
