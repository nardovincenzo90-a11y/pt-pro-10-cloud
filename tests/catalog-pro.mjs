import fs from 'node:fs';import vm from 'node:vm';
const context={window:{}};vm.createContext(context);
for(const file of ['v10/universal-catalog.js','v10/nutrition-library.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const c=context.window.PTPROUniversalCatalog,n=context.window.PTPRONutritionLibrary;
if(c.exercises.length<300||c.exercises.length>500)throw Error(`Numero esercizi non valido: ${c.exercises.length}`);
if(n.foods.length<200||n.foods.length>300)throw Error(`Numero alimenti non valido: ${n.foods.length}`);
if(n.recipes.length<80||n.recipes.length>120)throw Error(`Numero ricette non valido: ${n.recipes.length}`);
for(const key of ['steps','errors','breathing','level','muscle_group','equipment','alternatives','image_url'])if(c.exercises.some(x=>!x[key]||(Array.isArray(x[key])&&!x[key].length)))throw Error(`Campo esercizio mancante: ${key}`);
if(n.foods.some(x=>!x.portion_g||!Array.isArray(x.allergens)||!Number.isFinite(x.portion_kcal)))throw Error('Porzioni o allergeni mancanti');
for(const name of new Set(n.foods.map(x=>x.base_name))){const rows=n.foods.filter(x=>x.base_name===name),signature=new Set(rows.map(x=>[x.kcal_100,x.protein_100,x.carbs_100,x.fat_100].join('|')));if(signature.size!==1)throw Error(`Valori per 100 g incoerenti tra porzioni: ${name}`)}
const foodByName=new Map(n.foods.map(x=>[x.base_name,x]));for(const recipe of n.recipes)for(const item of recipe.ingredients){const food=foodByName.get(item.name);if(!food)throw Error(`Ingrediente sconosciuto: ${item.name}`);if(recipe.diet_mode!=='onnivoro'&&!food.diet_modes.includes(recipe.diet_mode))throw Error(`Ricetta ${recipe.diet_mode} incompatibile: ${recipe.name} / ${item.name}`)}
const school=fs.readFileSync('v10/school-pro.js','utf8');for(const token of ['Protocollo passo-passo','Errori comuni','Sicurezza','Valutazione','Genera lezione completa'])if(!school.includes(token))throw Error(`Scuola PRO incompleta: ${token}`);
const runtime=fs.readFileSync('v10/catalog-runtime.js','utf8');for(const token of ['catWellness','addToWellness','wellness_program_items','Aggiungi al programma Wellness'])if(!runtime.includes(token))throw Error(`Integrazione Wellness incompleta: ${token}`);
if(!fs.existsSync('assets/exercise-guides/athletic-tests-photo-atlas.webp')||!school.includes('athletic-tests-photo-atlas.webp'))throw Error('Atlante fotografico test atletici mancante');
const session=fs.readFileSync('v10/nutrition-session-pro.js','utf8'),schoolTools=fs.readFileSync('v10/school-tools-runtime.js','utf8');for(const token of ['Dimagrimento','Mantenimento','Ipertrofia','Performance sportiva','quickNutritionGenerate','createNutritionDay'])if(!session.includes(token))throw Error(`Generazione diretta incompleta: ${token}`);for(const token of ['Valutazione','Storico','Registro Cloud','Fondamentali','Giochi didattici'])if(!schoolTools.includes(token))throw Error(`Strumenti scuola mancanti: ${token}`);
console.log(`Catalogo PRO OK: ${c.exercises.length} esercizi, ${n.foods.length} alimenti, ${n.recipes.length} ricette`);
