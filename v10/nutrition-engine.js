(() => {
'use strict';
const api=window.PTAPI;if(!api)return;
const n=v=>Number(v||0),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),round=(v,d=1)=>Number(Number(v||0).toFixed(d));
const hash=s=>[...String(s)].reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0),pick=(arr,seed)=>arr.length?arr[Math.abs(seed)%arr.length]:null;
const readProfile=()=>{try{return JSON.parse(localStorage.getItem('ptpro_nutrition_profile')||'{}')}catch{return{}}};
const baseName=x=>String(x.base_name||x.name||'').split(' · ')[0];
const normalizedFood=x=>({...x,id:/^[0-9a-f-]{36}$/i.test(String(x.id||''))?x.id:null,core_id:x.core_id||x.id||baseName(x),default_unit:x.default_unit||'g',active:x.active!==false,meal_tags:x.meal_tags||(/frutt|avena|yogurt|skyr|latte|mandorl|noce|chia/i.test(baseName(x))?['breakfast','snack']:['lunch','dinner'])});
async function foodCatalog(){
 const library=(window.PTPRONutritionLibrary?.foods||[]).map(normalizedFood);
 let cloud=await api.get('foods',{select:'id,name,category,department,kcal_100,protein_100,carbs_100,fat_100,default_unit,active',active:'eq.true',limit:1000}).catch(()=>[]);
 if(!library.length&&!cloud.length)throw new Error('Catalogo alimenti non disponibile. Riprova tra poco.');
 const names=new Set(library.map(x=>baseName(x).toLowerCase()));cloud=cloud.filter(x=>!names.has(baseName(x).toLowerCase())).map(normalizedFood);return[...library,...cloud];
}
function eligibleFoods(foods,profile=readProfile()){
 const mode=profile.mode||'onnivoro',avoid=[...(profile.avoid||[]),...(profile.allergens||[])].map(x=>String(x).trim().toLowerCase()).filter(Boolean);
 const eligible=foods.filter(x=>x.active!==false&&(!x.diet_modes||x.diet_modes.includes(mode))&&!avoid.some(a=>`${x.name} ${(x.allergens||[]).join(' ')}`.toLowerCase().includes(a)));
 if(eligible.length<8)throw new Error('Le esclusioni selezionate lasciano troppo pochi alimenti. Riduci i filtri o contatta un professionista.');return eligible;
}
function macros(food,qty){const f=qty/100;return{kcal:round(n(food.kcal_100)*f),p:round(n(food.protein_100)*f),c:round(n(food.carbs_100)*f),fat:round(n(food.fat_100)*f)}}
function qtyFor(food,target,key,min,max){const per=key==='p'?n(food.protein_100):key==='c'?n(food.carbs_100):n(food.fat_100);if(!per)return min;return Math.round(clamp(target/per*100,min,max)/5)*5}
function classify(foods){const protein=foods.filter(f=>n(f.protein_100)>=12&&n(f.fat_100)<35),carb=foods.filter(f=>n(f.carbs_100)>=17&&n(f.protein_100)<25),fat=foods.filter(f=>n(f.fat_100)>=15),fruit=foods.filter(f=>/frutt|banana|mela|pera|arancia|kiwi|fragol|mirtill|ananas|pesca/i.test(`${f.category} ${f.name}`)),veg=foods.filter(f=>/verd|veget|ortagg|zucchin|broccol|spinac|pomodor|carot|peperon|melanz|insalat|cavolfior|fungh/i.test(`${f.category} ${f.name}`));return{protein,carb,fat,fruit,veg,all:foods}}
function dayTargets(plan,dayType){const off=String(dayType).toUpperCase()==='OFF';return{kcal:n(plan?.kcal_target)*(off ? .94 : 1),protein:n(plan?.protein_g_target),carbs:n(plan?.carbs_g_target)*(off ? .88 : 1),fat:n(plan?.fat_g_target)*(off ? 1.04 : 1),advice:off?'Giorno OFF: carboidrati leggermente ridotti, proteine stabili.':'Giorno ON: distribuzione orientata a performance e recupero.'}}
function buildMeals(foods,targets,date,dayId,uid,plan){
 const g=classify(foods),names=['Colazione','Pranzo','Spuntino','Cena'],tags=['breakfast','lunch','snack','dinner'],ratios=[.24,.34,.16,.26],seed=hash(date),meals=[],items=[];
 names.forEach((name,i)=>{const r=ratios[i],target={k:targets.kcal*r,p:targets.protein*r,c:targets.carbs*r,f:targets.fat*r},clientId=crypto.randomUUID();meals.push({id:clientId,athlete_id:uid,nutrition_day_id:dayId,nutrition_plan_id:plan?.id||null,name,sort_order:i+1,kcal:round(target.k,0),protein_g:round(target.p),carbs_g:round(target.c),fat_g:round(target.f)});
  const forMeal=list=>{const tagged=list.filter(x=>!x.meal_tags||x.meal_tags.includes(tags[i]));return tagged.length?tagged:list},pool=i===0||i===2?g.fruit:g.veg;
  const chosen=[pick(forMeal(g.protein.length?g.protein:g.all),seed+i*11),pick(forMeal(g.carb.length?g.carb:g.all),seed+i*17+3),pick(forMeal(g.fat.length?g.fat:g.all),seed+i*23+7),pick(forMeal(pool.length?pool:g.all),seed+i*29+9)].filter((x,j,a)=>x&&a.findIndex(y=>y.core_id===x.core_id)===j);
  while(chosen.length<3){const extra=pick(g.all,seed+i*37+chosen.length);if(!extra||chosen.some(x=>x.core_id===extra.core_id))break;chosen.push(extra)}
  chosen.forEach((f,j)=>{const qty=j===0?qtyFor(f,target.p*.82,'p',50,250):j===1?qtyFor(f,target.c*.78,'c',30,250):j===2?qtyFor(f,target.f*.55,'f',5,80):(i===0||i===2?150:200),m=macros(f,qty);items.push({athlete_id:uid,meal_id:clientId,food_id:f.id||null,food_name_snapshot:f.name,quantity:qty,unit:f.default_unit||'g',kcal:m.kcal,protein_g:m.p,carbs_g:m.c,fat_g:m.fat,sort_order:j+1})});
 });return{meals,items};
}
async function createRange(uid,plan,startDate,count,onDays=[1,3,5]){
 const foods=eligibleFoods(await foodCatalog()),base=new Date(startDate+'T12:00:00'),dates=Array.from({length:count},(_,i)=>{const d=new Date(base);d.setDate(base.getDate()+i);return d.toISOString().slice(0,10)});
 const candidates=await api.get('nutrition_days',{select:'id,day_date',athlete_id:`eq.${uid}`,day_date:`gte.${dates[0]}`,limit:400}).catch(()=>[]),old=candidates.filter(x=>x.day_date<=dates.at(-1));if(old.length)await api.del('nutrition_days',{id:`in.(${old.map(x=>x.id).join(',')})`});
 const dayRows=dates.map(date=>{const d=new Date(date+'T12:00:00'),dow=d.getDay()||7,type=onDays.includes(dow)?'ON':'OFF',t=dayTargets(plan,type);return{id:crypto.randomUUID(),athlete_id:uid,plan_id:plan?.id||null,day_date:date,day_type:type,kcal:round(t.kcal,0),protein_g:round(t.protein),carbs_g:round(t.carbs),fat_g:round(t.fat),advice:t.advice}});
 await api.post('nutrition_days',dayRows);const meals=[],items=[];dayRows.forEach(day=>{const made=buildMeals(foods,dayTargets(plan,day.day_type),day.day_date,day.id,uid,plan);meals.push(...made.meals);items.push(...made.items)});await api.post('meals',meals);try{await api.post('meal_items',items)}catch(e){await api.post('meal_items',items.map(({sort_order,...x})=>x))}return dayRows.map(x=>({date:x.day_date,type:x.day_type}));
}
async function smartDay(uid,plan,date,dayType='AUTO'){const dow=new Date(date+'T12:00:00').getDay()||7,on=String(dayType).toUpperCase()==='OFF'?[]:String(dayType).toUpperCase()==='ON'?[dow]:[1,3,5];await createRange(uid,plan,date,1,on);const rows=await api.get('nutrition_days',{select:'*',athlete_id:`eq.${uid}`,day_date:`eq.${date}`,limit:1});return rows[0]}
api.createNutritionDay=smartDay;api.generateNutritionRange=createRange;
api.nutritionAlternatives=(current,profile=readProfile())=>{const lib=window.PTPRONutritionLibrary;if(!lib)return[];const currentBase=baseName({name:current}),base=lib.foods.find(x=>x.name===current||x.base_name===currentBase);return base?lib.alternatives(base.id,profile.mode||'onnivoro',[...(profile.avoid||[]),...(profile.allergens||[])]):[]};
window.PTPRONutritionEngine={foodCatalog,eligibleFoods,buildMeals,dayTargets,readProfile};
})();
