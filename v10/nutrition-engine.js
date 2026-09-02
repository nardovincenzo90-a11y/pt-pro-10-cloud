(() => {
'use strict';
const api=window.PTAPI;
if(!api)return;
const n=v=>Number(v||0),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),round=(v,d=1)=>Number(Number(v||0).toFixed(d));
const hash=s=>[...String(s)].reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0);
const pick=(arr,seed)=>arr.length?arr[Math.abs(seed)%arr.length]:null;
function macros(food,qty){const f=qty/100;return {kcal:round(n(food.kcal_100)*f),p:round(n(food.protein_100)*f),c:round(n(food.carbs_100)*f),fat:round(n(food.fat_100)*f)}}
function qtyFor(food,target,key,min,max){const per=key==='p'?n(food.protein_100):key==='c'?n(food.carbs_100):n(food.fat_100);if(!per)return min;return Math.round(clamp(target/per*100,min,max)/5)*5}
function classify(foods){const active=foods.filter(f=>f.active!==false),protein=active.filter(f=>n(f.protein_100)>=15&&n(f.fat_100)<35),carb=active.filter(f=>n(f.carbs_100)>=30&&n(f.protein_100)<25),fat=active.filter(f=>n(f.fat_100)>=20),fruit=active.filter(f=>/frutt|fruit/i.test(`${f.category||''} ${f.department||''} ${f.name||''}`)),veg=active.filter(f=>/verd|veget|ortagg/i.test(`${f.category||''} ${f.department||''} ${f.name||''}`));return {protein,carb,fat,fruit,veg,all:active}}
async function smartDay(uid,plan,date,dayType='AUTO'){
 const old=await api.get('nutrition_days',{select:'id',athlete_id:`eq.${uid}`,day_date:`eq.${date}`,limit:1});if(old.length)await api.del('nutrition_days',{id:`eq.${old[0].id}`});
 const isOff=String(dayType).toUpperCase()==='OFF',kcal=n(plan?.kcal_target)*(isOff?.94:1),protein=n(plan?.protein_g_target),carbs=n(plan?.carbs_g_target)*(isOff?.88:1),fat=n(plan?.fat_g_target)*(isOff?1.04:1);
 const day=(await api.post('nutrition_days',{athlete_id:uid,plan_id:plan?.id||null,day_date:date,day_type:dayType,kcal:round(kcal,0),protein_g:round(protein),carbs_g:round(carbs),fat_g:round(fat),advice:isOff?'Giorno OFF: carboidrati leggermente ridotti, proteine stabili.':'Giorno ON: distribuzione orientata a performance e recupero.'}))[0];
 const foods=await api.get('foods',{select:'id,name,category,department,kcal_100,protein_100,carbs_100,fat_100,default_unit,active',active:'eq.true',limit:300}).catch(()=>[]),g=classify(foods),mealNames=['Colazione','Pranzo','Spuntino','Cena'],ratios=[.24,.34,.16,.26],seed=hash(date);
 for(let i=0;i<mealNames.length;i++){
  const r=ratios[i],target={k:kcal*r,p:protein*r,c:carbs*r,f:fat*r},meal=(await api.post('meals',{athlete_id:uid,nutrition_day_id:day.id,nutrition_plan_id:plan?.id||null,name:mealNames[i],sort_order:i+1,kcal:round(target.k,0),protein_g:round(target.p),carbs_g:round(target.c),fat_g:round(target.f)}))[0];
  if(!foods.length)continue;
  const pf=pick(g.protein.length?g.protein:g.all,seed+i*11),cf=pick(g.carb.length?g.carb:g.all,seed+i*17+3),ff=pick(g.fat.length?g.fat:g.all,seed+i*23+7),vf=pick((i===0?g.fruit:g.veg).length?(i===0?g.fruit:g.veg):g.all,seed+i*29+9),chosen=[];
  if(pf)chosen.push([pf,qtyFor(pf,target.p*.82,'p',50,250)]);if(cf&&cf.id!==pf?.id)chosen.push([cf,qtyFor(cf,target.c*.78,'c',30,250)]);if(ff&&![pf?.id,cf?.id].includes(ff.id))chosen.push([ff,qtyFor(ff,target.f*.55,'f',5,60)]);if(vf&&![pf?.id,cf?.id,ff?.id].includes(vf.id))chosen.push([vf,i===0?150:200]);
  let order=1;for(const [f,q] of chosen){const m=macros(f,q);await api.post('meal_items',{athlete_id:uid,meal_id:meal.id,food_id:f.id,food_name_snapshot:f.name,quantity:q,unit:f.default_unit||'g',kcal:m.kcal,protein_g:m.p,carbs_g:m.c,fat_g:m.fat,sort_order:order++}).catch(async()=>{await api.post('meal_items',{athlete_id:uid,meal_id:meal.id,food_id:f.id,food_name_snapshot:f.name,quantity:q,unit:f.default_unit||'g',kcal:m.kcal,protein_g:m.p,carbs_g:m.c,fat_g:m.fat})})}
 }
 return day
}
api.createNutritionDay=smartDay;
api.generateNutritionRange=async(uid,plan,startDate,count,onDays=[1,3,5])=>{const out=[],base=new Date(startDate+'T12:00:00');for(let i=0;i<count;i++){const d=new Date(base);d.setDate(base.getDate()+i);const dow=d.getDay()===0?7:d.getDay(),date=d.toISOString().slice(0,10),type=onDays.includes(dow)?'ON':'OFF';await smartDay(uid,plan,date,type);out.push({date,type})}return out};
})();