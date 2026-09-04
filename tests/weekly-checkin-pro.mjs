import fs from 'node:fs';
const js=fs.readFileSync('v10/progress.js','utf8');
for(const token of ['Nessun valore è preselezionato','Qualità del sonno','Fatica generale','Indolenzimento muscolare','Dolore diverso dal normale indolenzimento?','painArea','weekStart','recoveryLabel','PTPROWeeklyCheckin','Aggiorna questa settimana','PTPRO2:'])if(!js.includes(token))throw Error(`Check-in PRO incompleto: ${token}`);
if(/id="sleep"[^>]*value="7"/.test(js))throw Error('Il check-in non deve preselezionare il sonno');
console.log('Weekly check-in PRO OK: scala chiara, nessun default, dolore separato, trend e dato condiviso');
