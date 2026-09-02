(() => {
'use strict';
const api=window.PTAPI;
if(!api)return;
const n=v=>Number(v||0),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),round=(v,d=1)=>Number(Number(v||0).toFixed(d));
const hash=s=>[...String(s)].reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0);
const pick=(arr,seed)=>arr.length?arr[Math.abs(seed)%arr.length]:null;
const coreFoods=[
 {name:'Fiocchi d’avena',category:'cereali',department:'colazione',kcal_100:389,protein_100:17,carbs_100:66,fat_100:7,default_unit:'g',meal_tags:['breakfast','snack']},
 {name:'Pane integrale',category:'cereali',department:'forno',kcal_100:247,protein_100:13,carbs_100:41,fat_100:4,default_unit:'g',meal_tags:['breakfast','lunch','snack','dinner']},
 {name:'Riso basmati',category:'cereali',department:'primi',kcal_100:350,protein_100:8,carbs_100:78,fat_100:1,default_unit:'g',meal_tags:['lunch','dinner']},
 {name:'Pasta integrale',category:'cereali',department:'primi',kcal_100:348,protein_100:13,carbs_100:67,fat_100:3,default_unit:'g',meal_tags:['lunch','dinner']},
 {name:'Patate',category:'tuberi',department:'verdura',kcal_100:77,protein_100:2,carbs_100:17,fat_100:.1,default_unit:'g',meal_tags:['lunch','dinner']},
 {name:'Petto di pollo',category:'proteine',department:'carne',kcal_100:165,protein_100:31,carbs_100:0,fat_100:4,default_unit:'g',meal_tags:['lunch','dinner']},
 {name:'Tacchino',category:'proteine',department:'carne',kcal_100:135,protein_100:29,carbs_100:0,fat_100:2,default_unit:'g',meal_tags:['lunch','dinner']},
 {name:'Salmone',category:'proteine',department:'pesce',kcal_100:208,protein_100:20,carbs_100:0,fat_100:13,default_unit:'g',meal_tags:['lunch','dinner']},
 {name:'Tonno al naturale',category:'proteine',department:'pesce',kcal_100:116,protein_100:26,carbs_100:0,fat_100:1,default_unit:'g',meal_tags:['lunch','dinner']},
 {name:'Uova',category:'proteine',department:'uova',kcal_100:143,protein_100:13,carbs_100:1,fat_100:10,default_unit:'g',meal_tags:['breakfast','lunch','dinner']},
 {name:'Yogurt greco',category:'proteine',department:'latticini',kcal_100:73,protein_100:10,carbs_100:4,fat_100:2,default_unit:'g',meal_tags:['breakfast','snack']},
 {name:'Latte parzialmente scremato',category:'latticini',department:'colazione',kcal_100:46,protein_100:3.3,carbs_100:5,fat_100:1.6,default_unit:'ml',meal_tags:['breakfast','snack']},
 {name:'Ceci cotti',category:'legumi',department:'proteine vegetali',kcal_100:164,protein_100:9,carbs_100:27,fat_100:3,default_unit:'g',meal_tags:['lunch','dinner']},
 {name:'Lenticchie cotte',category:'legumi',department:'proteine vegetali',kcal_100:116,protein_100:9,carbs_100:20,fat_100:.4,default_unit:'g',meal_tags:['lunch','dinner']},
 {name:'Banana',category:'frutta',department:'frutta',kcal_100:89,protein_100:1.1,carbs_100:23,fat_100:.3,default_unit:'g',meal_tags:['breakfast','snack']},
 {name:'Mela',category:'frutta',department:'frutta',kcal_100:52,protein_100:.3,carbs_100:14,fat_100:.2,default_unit:'g',meal_tags:['breakfast','snack']},
 {name:'Arancia',category:'frutta',department:'frutta',kcal_100:47,protein_100:.9,carbs_100:12,fat_100:.1,default_unit:'g',meal_tags:['breakfast','snack']},
 {name:'Frutti di bosco',category:'frutta',department:'frutta',kcal_100:50,protein_100:1,carbs_100:12,fat_100:.4,default_unit:'g',meal_tags:['breakfast','snack']},
 {name:'Zucchine',category:'verdura',department:'verdura',kcal_100:17,protein_100:1.2,carbs_100:3,fat_100:.3,default_unit:'g',meal_tags:['lunch','dinner']},
 {name:'Broccoli',category:'verdura',department:'verdura',kcal_100:34,protein_100:2.8,carbs_100:7,fat_100:.4,default_unit:'g',meal_tags:['lunch','dinner']},
 {name:'Spinaci',category:'verdura',department:'verdura',kcal_100:23,protein_100:2.9,carbs_100:3.6,fat_100:.4,default_unit:'g',meal_tags:['lunch','dinner']},
 {name:'Pomodori',category:'verdura',department:'verdura',kcal_100:18,protein_100:.9,carbs_100:3.9,fat_100:.2,default_unit:'g',meal_tags:['lunch','dinner']},
 {name:'Mandorle',category:'grassi',department:'frutta secca',kcal_100:579,protein_100:21,carbs_100:22,fat_100:50,default_unit:'g',meal_tags:['breakfast','snack']},
 {name:'Noci',category:'grassi',department:'frutta secca',kcal_100:654,protein_100:15,carbs_100:14,fat_100:65,default_unit:'g',meal_tags:['breakfast','snack']},
 {name:'Olio extravergine di oliva',category:'grassi',department:'condimenti',kcal_100:884,protein_100:0,carbs_100:0,fat_100:100,default_unit:'g',meal_tags:['lunch','dinner']}
].map((x,i)=>({...x,id:null,active:true,core_id:`core-${i+1}`}));
function macros(food,qty){const f=qty/100;return {kcal:round(n(food.kcal_100)*f),p:round(n(food.protein_100)*f),c:round(n(food.carbs_100)*f),fat:round(n(food.fat_100)*f)}}
function qtyFor(food,target,key,min,max){const per=key==='p'?n(food.protein_100):key==='c'?n(food.carbs_100):n(food.fat_100);if(!per)return min;return Math.round(clamp(target/per*100,min,max)/5)*5}
function classify(foods){const active=foods.filter(f=>f.active!==false),protein=active.filter(f=>n(f.protein_100)>=15&&n(f.fat_100)<35),carb=active.filter(f=>n(f.carbs_100)>=30&&n(f.protein_100)<25),fat=active.filter(f=>n(f.fat_100)>=20),fruit=active.filter(f=>/frutt|fruit/i.test(`${f.category||''} ${f.department||''} ${f.name||''}`)),veg=active.filter(f=>/verd|veget|ortagg/i.test(`${f.category||''} ${f.department||''} ${f.name||''}`));return {protein,carb,fat,fruit,veg,all:active}}
async function smartDay(uid,plan,date,dayType='AUTO'){
 const old=await api.get('nutrition_days',{select:'id',athlete_id:`eq.${uid}`,day_date:`eq.${date}`,limit:1});if(old.length)await api.del('nutrition_days',{id:`eq.${old[0].id}`});
 const isOff=String(dayType).toUpperCase()==='OFF',kcal=n(plan?.kcal_target)*(isOff?.94:1),protein=n(plan?.protein_g_target),carbs=n(plan?.carbs_g_target)*(isOff?.88:1),fat=n(plan?.fat_g_target)*(isOff?1.04:1);
 const day=(await api.post('nutrition_days',{athlete_id:uid,plan_id:plan?.id||null,day_date:date,day_type:dayType,kcal:round(kcal,0),protein_g:round(protein),carbs_g:round(carbs),fat_g:round(fat),advice:isOff?'Giorno OFF: carboidrati leggermente ridotti, proteine stabili.':'Giorno ON: distribuzione orientata a performance e recupero.'}))[0];
 let foods=await api.get('foods',{select:'id,name,category,department,kcal_100,protein_100,carbs_100,fat_100,default_unit,active',active:'eq.true',limit:300}).catch(()=>[]);if(!foods.length)foods=coreFoods;const g=classify(foods),mealNames=['Colazione','Pranzo','Spuntino','Cena'],mealTags=['breakfast','lunch','snack','dinner'],ratios=[.24,.34,.16,.26],seed=hash(date);
 for(let i=0;i<mealNames.length;i++){
  const r=ratios[i],target={k:kcal*r,p:protein*r,c:carbs*r,f:fat*r},meal=(await api.post('meals',{athlete_id:uid,nutrition_day_id:day.id,nutrition_plan_id:plan?.id||null,name:mealNames[i],sort_order:i+1,kcal:round(target.k,0),protein_g:round(target.p),carbs_g:round(target.c),fat_g:round(target.f)}))[0];
  if(!foods.length)continue;
  const tag=mealTags[i],forMeal=list=>{const tagged=list.filter(x=>!x.meal_tags||x.meal_tags.includes(tag));return tagged.length?tagged:list},pf=pick(forMeal(g.protein.length?g.protein:g.all),seed+i*11),cf=pick(forMeal(g.carb.length?g.carb:g.all),seed+i*17+3),ff=pick(forMeal(g.fat.length?g.fat:g.all),seed+i*23+7),vf=pick(forMeal((i===0||i===2?g.fruit:g.veg).length?(i===0||i===2?g.fruit:g.veg):g.all),seed+i*29+9),chosen=[];
  const foodKey=f=>f?.id||f?.core_id;if(pf)chosen.push([pf,qtyFor(pf,target.p*.82,'p',50,250)]);if(cf&&foodKey(cf)!==foodKey(pf))chosen.push([cf,qtyFor(cf,target.c*.78,'c',30,250)]);if(ff&&![foodKey(pf),foodKey(cf)].includes(foodKey(ff)))chosen.push([ff,qtyFor(ff,target.f*.55,'f',5,60)]);if(vf&&![foodKey(pf),foodKey(cf),foodKey(ff)].includes(foodKey(vf)))chosen.push([vf,i===0||i===2?150:200]);
  let order=1;for(const [f,q] of chosen){const m=macros(f,q),item={athlete_id:uid,meal_id:meal.id,food_id:f.id||null,food_name_snapshot:f.name,quantity:q,unit:f.default_unit||'g',kcal:m.kcal,protein_g:m.p,carbs_g:m.c,fat_g:m.fat,sort_order:order++};await api.post('meal_items',item).catch(async()=>{delete item.sort_order;await api.post('meal_items',item)})}
 }
 return day
}
api.createNutritionDay=smartDay;
api.generateNutritionRange=async(uid,plan,startDate,count,onDays=[1,3,5])=>{const out=[],base=new Date(startDate+'T12:00:00');for(let i=0;i<count;i++){const d=new Date(base);d.setDate(base.getDate()+i);const dow=d.getDay()===0?7:d.getDay(),date=d.toISOString().slice(0,10),type=onDays.includes(dow)?'ON':'OFF';await smartDay(uid,plan,date,type);out.push({date,type})}return out};
})();
