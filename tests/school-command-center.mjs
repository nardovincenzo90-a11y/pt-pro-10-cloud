import fs from'node:fs';
const js=fs.readFileSync('v10/school-command-center.js','utf8'),css=fs.readFileSync('v10/school-command-center.css','utf8');
for(const token of["A.register('school-command'",'Oggi a scuola','Analisi automatica','Pianifica lezione','Esporta registro','Attività concluse','Presenze oggi','schoolPlannerUpdatedAt'])if(!js.includes(token))throw Error(`Cruscotto docente incompleto: ${token}`);
for(const token of['metrics(data,c)','status=a=>','theoryDone','practiceDone','attendance','assessments','text/csv'])if(!js.includes(token))throw Error(`Analisi registro incompleta: ${token}`);
for(const token of['commandGrid','commandClassGrid','@media(max-width:600px)'])if(!css.includes(token))throw Error(`Layout cruscotto incompleto: ${token}`);
console.log('Cruscotto Docente OK: classi, analisi, pianificazione ed esportazione');
