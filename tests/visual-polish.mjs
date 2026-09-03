import fs from 'node:fs';
const css=fs.readFileSync('v10/visual-polish.css','utf8'),js=fs.readFileSync('v10/visual-polish.js','utf8'),manifest=fs.readFileSync('app-manifest.js','utf8'),index=fs.readFileSync('index.html','utf8');
for(const token of ['.bars','.kpi','.ptproSaveState','@media(min-width:700px) and (max-width:1100px)','@media(max-width:699px)','prefers-reduced-motion','html[data-animations="off"]'])if(!css.includes(token))throw Error(`Rifinitura CSS assente: ${token}`);
for(const token of ["['post','patch','delete']",'Salvataggio nel Cloud','Salvato nel Cloud','loading=\'lazy\'','decoding=\'async\''])if(!js.includes(token))throw Error(`Rifinitura runtime assente: ${token}`);
if(!manifest.includes('v23-visual-polish')||!index.includes('/v10/visual-polish.css'))throw Error('Rifinitura non caricata');
console.log('Visual polish OK: grafici, immagini, responsive, movimento e feedback Cloud');
