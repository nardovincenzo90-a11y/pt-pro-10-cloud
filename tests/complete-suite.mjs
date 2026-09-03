import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8'),has=(src,t,label)=>{if(!src.includes(t))throw new Error(`${label}: ${t}`)};
const home=read('v10/home-role-runtime.js'),athlete=read('v10/home.js'),ai=read('v10/ai-center-pro.js'),platform=read('v10/platform-pro.js'),manifest=read('app-manifest.js'),kernel=read('v10/kernel.js');
has(athlete,"register('home-athlete'",'Home atleta');
for(const token of ['HOME DOCENTE','HOME COACH','HOME AMMINISTRATORE','ptpro_home_mode','Presenze e valutazioni','Utenti e autorizzazioni'])has(home,token,'Home per ruolo');
for(const token of ['Perché te lo consiglio','PTPROUniversalCatalog','PTPRONutritionLibrary','PTPROSchoolAcademy','Duplica','Esporta','Elimina','ai-center'])has(ai,token,'Assistente centrale');
for(const token of ['ptpro_boot_snapshot_v1','analysis-center','automation-center','Carico acuto/cronico','Cronologia e annullamento','Ricerca globale','ptpro_error_buffer_v1','navigator.onLine'])has(platform,token,'Piattaforma');
for(const token of ['v20-role-home','v21-ai-center','v22-platform-pro'])has(manifest,token,'Manifest');
for(const token of ['Centro Analisi','Regole automatiche','Assistente PT-PRO'])has(kernel,token,'Navigazione');
const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(read('v10/universal-catalog.js'),sandbox);
const rows=sandbox.window.PTPROUniversalCatalog.exercises;
if(rows.length<500)throw new Error(`Catalogo insufficiente: ${rows.length}`);
for(const x of rows){for(const k of ['name','sport','goal','level','muscle_group','equipment','location','image_url','breathing','steps','errors','safety','alternatives'])if(x[k]===undefined)throw new Error(`Scheda incompleta ${x.id}: ${k}`)}
console.log(`Complete suite OK: ${rows.length} esercizi strutturati`);
