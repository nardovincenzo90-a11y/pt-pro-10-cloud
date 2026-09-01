
    try{
      const _m=localStorage.getItem("ptpro_theme_mode")||"auto";
      const _h=new Date().getHours();
      document.documentElement.dataset.theme=_m==="auto"?((_h>=7&&_h<19)?"light":"dark"):_m;
    }catch(e){}

    /* =========================================================
       STATE
       ========================================================= */

const state = {

  boot:null,

  view:"home",

  workout:null,

  session:null,

  restEnd:0,

  restTick:null,

  sessionTick:null,

  completedSets:0,

  totalSets:0,

  workoutVolume:0,

  savedSets:new Set()

};


    const $ =
      q =>
        document.querySelector(q);


    /* =========================================================
       HELPERS
       ========================================================= */

    function esc(value){

      return String(
        value ?? ""
      )
      .replace(
        /[&<>"']/g,
        char => ({
          "&":"&amp;",
          "<":"&lt;",
          ">":"&gt;",
          '"':"&quot;",
          "'":"&#39;"
        }[char])
      );

    }



    /* ============================================================
       PT-PRO 10 CLOUD COMPATIBILITY LAYER
       Preserva la UI PT-PRO 10 e sostituisce google.script.run
       con Supabase Auth + PostgREST.
       ============================================================ */

    const CLOUD_VERSION = "10.0.0-evolution.1";
    const CLOUD_CFG_KEY = "ptpro10_supabase_config";
    const CLOUD_SESSION_KEY = "ptpro10_session";

    function cloudCfg_(){
      try{
        const c = JSON.parse(localStorage.getItem(CLOUD_CFG_KEY) || "null");
        if(!c) return null;
        c.url = String(c.url||"").trim().replace(/\/+$/,"").replace(/\/(?:rest|auth|storage|functions)\/v1(?:\/.*)?$/i,"");
        return c;
      }catch(e){ return null; }
    }

    function cloudSession_(){
      try{ return JSON.parse(localStorage.getItem(CLOUD_SESSION_KEY)||"null"); }
      catch(e){ return null; }
    }

    async function cloudFetch_(path,opt={}){
      const cfg=cloudCfg_(), ses=cloudSession_();
      if(!cfg) throw new Error("PT-PRO Cloud non configurato. Apri prima la Home Cloud e collega Supabase.");
      const headers={
        apikey:cfg.key,
        "Content-Type":"application/json",
        Accept:"application/json",
        ...(opt.headers||{})
      };
      if(ses?.access_token) headers.Authorization="Bearer "+ses.access_token;
      const res=await fetch(cfg.url+path,{
        method:opt.method||"GET",
        headers,
        body:opt.body===undefined?undefined:JSON.stringify(opt.body)
      });
      const text=await res.text();
      let data=null; try{data=text?JSON.parse(text):null}catch(e){data=text}
      if(!res.ok){
        throw new Error(data?.message||data?.msg||data?.error_description||data?.hint||("HTTP "+res.status));
      }
      return data;
    }

    async function cloudUser_(){
      return cloudFetch_("/auth/v1/user");
    }

    function cq_(o){
      const q=new URLSearchParams();
      Object.entries(o||{}).forEach(([k,v])=>{ if(v!==undefined&&v!==null&&v!=="") q.set(k,String(v)); });
      return q.toString();
    }

    async function cget_(table,params={}){
      const q=cq_(params);
      return cloudFetch_("/rest/v1/"+table+(q?"?"+q:""));
    }

    async function cpost_(table,body,returnRows=true){
      return cloudFetch_("/rest/v1/"+table,{
        method:"POST", body,
        headers:{Prefer:returnRows?"return=representation":"return=minimal"}
      });
    }

    async function cpatch_(table,filter,body,returnRows=true){
      const q=cq_(filter);
      return cloudFetch_("/rest/v1/"+table+"?"+q,{
        method:"PATCH", body,
        headers:{Prefer:returnRows?"return=representation":"return=minimal"}
      });
    }

    async function cdelete_(table,filter){
      const q=cq_(filter);
      return cloudFetch_("/rest/v1/"+table+"?"+q,{method:"DELETE",headers:{Prefer:"return=representation"}});
    }

    async function cuid_(){
      const u=await cloudUser_(); return u.id;
    }

    const n_=(v,d=0)=>{ const x=Number(v); return Number.isFinite(x)?x:d; };
    const ymd_=v=>v?String(v).slice(0,10):"";
    const isoNow_=()=>new Date().toISOString();

    function planLegacy_(p){
      if(!p) return null;
      return {
        ...p,
        schedaId:p.legacy_id||p.id,
        _uuid:p.id,
        titolo:p.title||"",
        obiettivo:p.goal||"",
        fase:p.phase||"",
        livello:p.level||"",
        giorniSett:p.days_per_week||"",
        durataMin:p.session_minutes||"",
        settimane:p.cycle_weeks||"",
        stileCiclo:p.cycle_style||"",
        deload:!!p.deload,
        settimanaCorrente:p.current_week||1,
        attiva:!!p.active,
        note:p.notes||""
      };
    }

    function dayLegacy_(d){
      if(!d) return null;
      return {
        ...d,
        giornoId:d.legacy_id||d.id,
        _uuid:d.id,
        schedaId:d.plan_legacy_id||d.plan_id,
        nomeGiorno:d.name||"",
        focus:d.focus||"",
        ordine:d.sort_order||0,
        note:d.notes||""
      };
    }

    function exLegacy_(e){
      if(!e) return null;
      return {
        ...e,
        exId:e.legacy_id||e.id,
        _uuid:e.id,
        nome:e.name||"",
        gruppo:e.muscle_group||e.category||"",
        attrezzo:e.equipment||"",
        categoria:e.category||e.muscle_group||"",
        istruzioni:e.instructions||e.notes||"",
        immagine:e.image_url||"",
        video:e.video_url||""
      };
    }

    function itemLegacy_(w,e){
      return {
        ...w,
        rowId:w.legacy_id||w.id,
        _uuid:w.id,
        giornoId:w.day_legacy_id||w.day_id,
        exId:e?.legacy_id||e?.id||w.exercise_id,
        exUuid:w.exercise_id,
        nomeEsercizio:e?.name||w.exercise_name_snapshot||"Esercizio",
        nome:e?.name||w.exercise_name_snapshot||"Esercizio",
        gruppo:e?.muscle_group||"",
        attrezzo:e?.equipment||"",
        serie:w.sets||3,
        ripetizioni:w.reps_text||"",
        carico:w.target_load??"",
        recuperoSec:w.rest_seconds||0,
        recupero:w.rest_seconds||0,
        tempo:w.tempo||"",
        rir:w.target_rir??"",
        rpe:w.target_rpe??"",
        note:w.notes||"",
        tecnica:w.technique_type||"standard",
        gruppoTecnica:w.technique_group||"",
        warmup:w.warmup_enabled!==false
      };
    }

    function measureLegacy_(m){
      return {
        ...m,
        misuraId:m.legacy_id||m.id,
        data:m.measured_on,
        peso_kg:m.weight_kg,
        vita_cm:m.waist_cm,
        fianchi_cm:m.hips_cm,
        torace_cm:m.chest_cm,
        braccio_cm:m.arm_cm,
        coscia_cm:m.thigh_cm,
        grasso_pct:m.body_fat_percent,
        bmi:m.bmi
      };
    }

    function sessionLegacy_(s){
      return {
        ...s,
        sessionId:s.legacy_id||s.id,
        schedaId:s.plan_legacy_id||s.plan_id,
        giornoId:s.day_legacy_id||s.day_id,
        dataOraStart:s.started_at,
        dataOraEnd:s.ended_at,
        durataMin:s.duration_minutes,
        eserciziPrevisti:s.planned_exercises,
        eserciziFatti:s.logged_exercises,
        completamento:s.completion_percent
      };
    }

    function dietLegacy_(p){
      if(!p) return null;
      return {
        ...p,
        dietaId:p.legacy_id||p.id,
        _uuid:p.id,
        titolo:p.title||"",
        fase:p.phase||"",
        kcal:p.kcal_target,
        proteine:p.protein_g_target,
        carbo:p.carbs_g_target,
        grassi:p.fat_g_target,
        settimane:p.weeks,
        attiva:!!p.active,
        obiettivo:p.goal||"",
        attivita:p.activity||""
      };
    }

    async function resolvePlan_(legacyOrUuid){
      if(!legacyOrUuid) return null;
      let r=await cget_("workout_plans",{select:"*",id:"eq."+legacyOrUuid,limit:1}).catch(()=>[]);
      if(r?.[0]) return r[0];
      r=await cget_("workout_plans",{select:"*",legacy_id:"eq."+legacyOrUuid,limit:1});
      return r?.[0]||null;
    }
    async function resolveDay_(legacyOrUuid){
      if(!legacyOrUuid) return null;
      let r=await cget_("workout_days",{select:"*",id:"eq."+legacyOrUuid,limit:1}).catch(()=>[]);
      if(r?.[0]) return r[0];
      r=await cget_("workout_days",{select:"*",legacy_id:"eq."+legacyOrUuid,limit:1});
      return r?.[0]||null;
    }
    async function resolveExercise_(legacyOrUuid){
      if(!legacyOrUuid) return null;
      let r=await cget_("exercises",{select:"*",id:"eq."+legacyOrUuid,limit:1}).catch(()=>[]);
      if(r?.[0]) return r[0];
      r=await cget_("exercises",{select:"*",legacy_id:"eq."+legacyOrUuid,limit:1});
      return r?.[0]||null;
    }

    async function cloudBootstrap_(){
      const uid=await cuid_();
      const [pr,plans,measures,sessions,diets,supps]=await Promise.all([
        cget_("profiles",{select:"*",id:"eq."+uid,limit:1}),
        cget_("workout_plans",{select:"*",athlete_id:"eq."+uid,order:"active.desc,created_at.desc"}),
        cget_("measurements",{select:"*",athlete_id:"eq."+uid,order:"measured_on.desc",limit:20}),
        cget_("workout_sessions",{select:"*",athlete_id:"eq."+uid,order:"started_at.desc",limit:30}),
        cget_("nutrition_plans",{select:"*",athlete_id:"eq."+uid,order:"active.desc,created_at.desc"}),
        cget_("supplements",{select:"*",athlete_id:"eq."+uid,active:"eq.true",order:"name.asc"}).catch(()=>[])
      ]);
      const profile=pr?.[0]||{};
      const pp=plans.find(x=>x.active&&!x.archived_at)||plans.find(x=>!x.archived_at)||plans[0]||null;
      let days=[];
      if(pp) days=await cget_("workout_days",{select:"*",plan_id:"eq."+pp.id,order:"sort_order.asc"});
      const dp=diets.find(x=>x.active)||diets[0]||null;
      let meals=[];
      if(dp) meals=await cget_("meals",{select:"*",nutrition_plan_id:"eq."+dp.id,order:"sort_order.asc"}).catch(()=>[]);
      const sess=sessions.map(sessionLegacy_);
      const ms=measures.map(measureLegacy_);
      const stats={
        workoutsWeek:sess.filter(s=>{
          const t=new Date(s.dataOraStart||0); return (Date.now()-t.getTime())<7*86400000;
        }).length,
        consistency30:Math.min(100,Math.round(sess.filter(s=>(Date.now()-new Date(s.dataOraStart||0).getTime())<30*86400000).length/12*100)),
        sessions:sess.length
      };
      const last=ms[0]||null;
      return {
        ok:true, app:"PT-PRO 10 Cloud Evolution", version:CLOUD_VERSION,
        today:new Date().toISOString().slice(0,10),
        profile:{
          ...profile,
          userId:uid,
          nome:profile.display_name||profile.first_name||"",
          altezza_cm:profile.height_cm||""
        },
        plan:planLegacy_(pp),
        days:days.map(dayLegacy_),
        measures:ms,
        sessions:sess,
        diet:dietLegacy_(dp),
        meals:meals.map(m=>({...m,pastoId:m.legacy_id||m.id,nomePasto:m.name})),
        integration:supps.map(s=>({...s,intId:s.legacy_id||s.id,nome:s.name,quando:s.timing||"",presa:false})),
        coach:{
          title:"Smart Coach 4 Cloud",
          text: sess.length ? "Storico Cloud collegato. Le prescrizioni vengono calcolate sui set registrati." : "Registra i primi workout per attivare analisi e progressioni."
        },
        stats
      };
    }

    async function workoutLegacy_(giornoId){
      const day=await resolveDay_(giornoId);
      if(!day) throw new Error("Giorno non trovato");
      const rows=await cget_("workout_items",{select:"*",day_id:"eq."+day.id,archived_at:"is.null",order:"sort_order.asc"});
      const exIds=[...new Set(rows.map(x=>x.exercise_id).filter(Boolean))];
      let exs=[];
      if(exIds.length) exs=await cget_("exercises",{select:"*",id:"in.("+exIds.join(",")+")"});
      const map=new Map(exs.map(x=>[x.id,x]));
      const exercises=rows.map(w=>itemLegacy_(w,map.get(w.exercise_id)));
      const previous={};
      for(const x of rows){
        const sets=await cget_("workout_sets",{select:"*",athlete_id:"eq."+day.athlete_id,exercise_id:"eq."+x.exercise_id,order:"logged_at.desc",limit:5}).catch(()=>[]);
        previous[x.legacy_id||x.id]=sets;
      }
      return {ok:true,day:dayLegacy_(day),exercises,previous};
    }

    async function smartCoach4_(){
      const uid=await cuid_();
      const [sets,checks,goals]=await Promise.all([
        cget_("workout_sets",{select:"*",athlete_id:"eq."+uid,order:"logged_at.desc",limit:300}),
        cget_("weekly_checkins",{select:"*",athlete_id:"eq."+uid,order:"checkin_date.desc",limit:4}),
        cget_("goals",{select:"*",athlete_id:"eq."+uid,order:"created_at.desc",limit:30})
      ]);
      const latest=checks[0];
      const score=latest?.recovery_score??(
        latest ? Math.round((n_(latest.sleep,5)+n_(latest.energy,5)+n_(latest.motivation,5)+(10-n_(latest.stress,5))+(10-n_(latest.doms,5)))/50*100) : 70
      );
      const byEx={};
      sets.forEach(s=>(byEx[s.exercise_id]??=[]).push(s));
      const plateauCount=Object.values(byEx).filter(a=>a.length>=6 && Math.max(...a.slice(0,3).map(x=>n_(x.estimated_1rm)))<=Math.max(...a.slice(3,6).map(x=>n_(x.estimated_1rm)))*1.005).length;
      const fatigue=Math.max(0,Math.min(100,100-score));
      return {
        ok:true, version:"4.0 Cloud",
        readiness:score, fatigue,
        deloadGlobal:score<50,
        base:{summary:{plateauCount}},
        checkIn:{latest,score},
        recovery:{score,status:score>=70?"good":score>=50?"medium":"low"},
        goals:goals.map(g=>({...g,goalId:g.legacy_id||g.id,label:g.label,progressPct:g.target_value?Math.round((n_(g.current_value)-n_(g.start_value))/(n_(g.target_value)-n_(g.start_value)||1)*100):0})),
        alerts:[
          ...(score<55?["Check-in: recupero basso"]:[]),
          ...(plateauCount?[(plateauCount+" esercizi in possibile plateau")]:[])
        ]
      };
    }

    async function cloudGas_(name,...args){
      const uid=await cuid_();
      switch(name){
        case "api_ping": return {ok:true,version:CLOUD_VERSION};
        case "api_getProfile":{
          const r=await cget_("profiles",{select:"*",id:"eq."+uid,limit:1}), p=r[0]||{};
          return {ok:true,profile:{...p,userId:uid,nome:p.display_name||p.first_name||"",altezza_cm:p.height_cm||""}};
        }
        case "api_bootstrap": return cloudBootstrap_();
        case "api_getWorkout": return workoutLegacy_(args[0]);
        case "api_getProgress":{
          const [m,s]=await Promise.all([
            cget_("measurements",{select:"*",athlete_id:"eq."+uid,order:"measured_on.desc",limit:100}),
            cget_("workout_sessions",{select:"*",athlete_id:"eq."+uid,order:"started_at.desc",limit:100})
          ]);
          return {ok:true,measures:m.map(measureLegacy_),sessions:s.map(sessionLegacy_)};
        }
        case "api_getNutrition":{
          const r=await cget_("nutrition_plans",{select:"*",athlete_id:"eq."+uid,order:"active.desc,created_at.desc"});
          const p=r.find(x=>x.active)||r[0]||null;
          const meals=p?await cget_("meals",{select:"*",nutrition_plan_id:"eq."+p.id,order:"sort_order.asc"}):[];
          return {ok:true,diet:dietLegacy_(p),meals:meals.map(m=>({...m,pastoId:m.legacy_id||m.id,nomePasto:m.name}))};
        }
        case "api_getExercises":{
          const ex=await cget_("exercises",{select:"*",or:"(owner_id.eq."+uid+",is_global.eq.true)",active:"eq.true",order:"name.asc",limit:500});
          return {ok:true,exercises:ex.map(exLegacy_)};
        }
        case "api_getExerciseHistory":{
          const e=await resolveExercise_(args[0]); if(!e) return {ok:true,sets:[],sessions:[]};
          const sets=await cget_("workout_sets",{select:"*",athlete_id:"eq."+uid,exercise_id:"eq."+e.id,order:"logged_at.desc",limit:100});
          return {ok:true,exercise:exLegacy_(e),sets};
        }
        case "api_startWorkout":{
          const p=args[0]||{}, day=await resolveDay_(p.giornoId||p.dayId), plan=day?await resolvePlan_(day.plan_id):null;
          const items=day?await cget_("workout_items",{select:"id",day_id:"eq."+day.id,archived_at:"is.null"}):[];
          const r=await cpost_("workout_sessions",{athlete_id:uid,plan_id:plan?.id||null,day_id:day?.id||null,started_at:isoNow_(),planned_exercises:items.length,notes:p.note||p.notes||null});
          return {ok:true,session:sessionLegacy_(r[0]),sessionId:r[0].id};
        }
        case "api_saveSet":{
          const p=args[0]||{};
          const ex=await resolveExercise_(p.exId||p.exerciseId);
          const day=await resolveDay_(p.giornoId||p.dayId);
          let wi=null;
          if(p.rowId){
            const rr=await cget_("workout_items",{select:"*",or:"(id.eq."+p.rowId+",legacy_id.eq."+p.rowId+")",limit:1}).catch(()=>[]);
            wi=rr[0]||null;
          }
          const sid=p.sessionId||p.session_id;
          const body={
            athlete_id:uid, session_id:sid, plan_id:day?.plan_id||null, day_id:day?.id||null,
            workout_item_id:wi?.id||null, exercise_id:ex?.id||wi?.exercise_id,
            exercise_name_snapshot:ex?.name||p.nomeEsercizio||p.nome||null,
            set_index:n_(p.setIndex||p.serieIndex||p.numeroSerie,1),
            set_type:p.setType||"working",
            load:n_(p.carico??p.load,0), reps:n_(p.reps??p.ripetizioni,0),
            rir:p.rir===""||p.rir==null?null:n_(p.rir),
            rpe:p.rpe===""||p.rpe==null?null:n_(p.rpe),
            rest_seconds:n_(p.recuperoSec||p.restSeconds,0)||null,
            successful:p.successful!==false, note:p.note||p.notes||null
          };
          const r=await cpost_("workout_sets",body);
          return {ok:true,set:r[0],saved:true};
        }
        case "api_finishWorkout":{
          const p=args[0]||{}, sid=p.sessionId||p.id;
          const sets=await cget_("workout_sets",{select:"*",session_id:"eq."+sid});
          const sess=await cget_("workout_sessions",{select:"*",id:"eq."+sid,limit:1});
          const s=sess[0]; const end=new Date();
          const mins=s?.started_at?Math.max(1,Math.round((end-new Date(s.started_at))/60000)):null;
          const exCount=new Set(sets.map(x=>x.exercise_id)).size;
          const patch={ended_at:end.toISOString(),duration_minutes:mins,logged_exercises:exCount,completion_percent:s?.planned_exercises?Math.min(100,Math.round(exCount/s.planned_exercises*100)):100,notes:p.note||p.notes||s?.notes||null};
          const r=await cpatch_("workout_sessions",{id:"eq."+sid},patch);
          return {ok:true,session:sessionLegacy_(r[0]||{...s,...patch})};
        }
        case "api_addMeasure":{
          const p=args[0]||{};
          const date=p.data||p.measured_on||new Date().toISOString().slice(0,10);
          const height=(await cget_("profiles",{select:"height_cm",id:"eq."+uid,limit:1}))[0]?.height_cm;
          const weight=n_(p.peso_kg??p.weight_kg,0)||null;
          const bmi=weight&&height?+(weight/((height/100)**2)).toFixed(2):null;
          const body={athlete_id:uid,measured_on:date,weight_kg:weight,waist_cm:p.vita_cm||null,hips_cm:p.fianchi_cm||null,chest_cm:p.torace_cm||null,arm_cm:p.braccio_cm||null,thigh_cm:p.coscia_cm||null,body_fat_percent:p.grasso_pct||null,bmi,notes:p.note||p.notes||null};
          let r;
          try{r=await cpost_("measurements",body)}catch(e){r=await cpatch_("measurements",{athlete_id:"eq."+uid,measured_on:"eq."+date},body)}
          return {ok:true,measure:measureLegacy_(r[0]||body)};
        }
        case "api_toggleSupplement":{
          const p=args[0]||{}; return {ok:true,presa:!!p.presa};
        }
        case "api_getSmartCoach":
        case "api_getSmartCoach2":
        case "api_getSmartCoach3":
        case "api_getSmartCoach4": return smartCoach4_();
        case "api_getWeeklyCheckIn9":{
          const r=await cget_("weekly_checkins",{select:"*",athlete_id:"eq."+uid,order:"checkin_date.desc",limit:12});
          const latest=r[0]||null; const score=latest?.recovery_score??null;
          return {ok:true,latest,history:r,score};
        }
        case "api_saveWeeklyCheckIn9":{
          const p=args[0]||{}, d=p.data||p.checkin_date||new Date().toISOString().slice(0,10);
          const body={athlete_id:uid,checkin_date:d,sleep:p.sleep??p.sonno??null,stress:p.stress??null,energy:p.energy??p.energia??null,doms:p.doms??null,motivation:p.motivation??p.motivazione??null,notes:p.note||p.notes||null};
          body.recovery_score=Math.round((n_(body.sleep,5)+n_(body.energy,5)+n_(body.motivation,5)+(10-n_(body.stress,5))+(10-n_(body.doms,5)))/50*100);
          let r; try{r=await cpost_("weekly_checkins",body)}catch(e){r=await cpatch_("weekly_checkins",{athlete_id:"eq."+uid,checkin_date:"eq."+d},body)}
          return {ok:true,checkin:r[0]||body,score:body.recovery_score};
        }
        case "api_getGoals9":{
          const r=await cget_("goals",{select:"*",athlete_id:"eq."+uid,order:"created_at.desc"});
          return {ok:true,goals:r.map(g=>({...g,goalId:g.legacy_id||g.id,progressPct:g.target_value?Math.round((n_(g.current_value)-n_(g.start_value))/(n_(g.target_value)-n_(g.start_value)||1)*100):0}))};
        }
        case "api_saveGoal9":{
          const p=args[0]||{};
          const body={athlete_id:uid,goal_type:p.goalType||p.tipo||"custom",label:p.label||p.titolo||"Obiettivo",target_value:p.targetValue??p.target??null,unit:p.unit||p.unita||null,start_value:p.startValue??null,current_value:p.currentValue??null,target_date:p.targetDate||null,status:p.status||"active"};
          let r; if(p.goalId&&String(p.goalId).includes("-")) r=await cpatch_("goals",{id:"eq."+p.goalId},body); else r=await cpost_("goals",body);
          return {ok:true,goal:r[0]||body};
        }
        case "api_deleteGoal9": await cdelete_("goals",{id:"eq."+args[0]}); return {ok:true};
        case "api_getExerciseNotes9":{
          const ex=await resolveExercise_(args[0]); const r=ex?await cget_("exercise_notes",{select:"*",athlete_id:"eq."+uid,exercise_id:"eq."+ex.id,limit:1}):[];
          return {ok:true,note:r[0]||null};
        }
        case "api_saveExerciseNotes9":{
          const p=args[0]||{}, ex=await resolveExercise_(p.exId||p.exerciseId);
          const body={athlete_id:uid,exercise_id:ex.id,note:p.note||p.notes||"",cue:p.cue||null};
          let r=await cget_("exercise_notes",{select:"id",athlete_id:"eq."+uid,exercise_id:"eq."+ex.id,limit:1});
          r=r[0]?await cpatch_("exercise_notes",{id:"eq."+r[0].id},body):await cpost_("exercise_notes",body);
          return {ok:true,note:r[0]};
        }
        case "api_getExerciseAlternatives9":{
          const p=args[0]||{}, ex=await resolveExercise_(p.exId||p.exerciseId);
          const r=await cget_("exercises",{select:"*",or:"(owner_id.eq."+uid+",is_global.eq.true)",active:"eq.true",order:"name.asc",limit:100});
          const out=r.filter(x=>x.id!==ex?.id && (!ex?.muscle_group||x.muscle_group===ex.muscle_group)).slice(0,12).map(exLegacy_);
          return {ok:true,alternatives:out};
        }
        case "api_replaceWorkoutExercise9":{
          const p=args[0]||{}, to=await resolveExercise_(p.toExId||p.newExId||p.exerciseId);
          let wi=await cget_("workout_items",{select:"*",or:"(id.eq."+p.rowId+",legacy_id.eq."+p.rowId+")",limit:1}).catch(()=>[]);
          wi=wi[0]; if(!wi) throw new Error("Riga workout non trovata");
          await cpost_("exercise_substitutions",{athlete_id:uid,workout_item_id:wi.id,from_exercise_id:wi.exercise_id,to_exercise_id:to.id,apply_to_plan:!!p.applyToPlan,reason:p.reason||null});
          if(p.applyToPlan) await cpatch_("workout_items",{id:"eq."+wi.id},{exercise_id:to.id});
          return {ok:true};
        }
        case "api_getWarmup9":{
          const p=args[0]||{}, target=n_(p.targetLoad??p.carico??0), sets=[];
          if(target>0){[[.4,8],[.6,5],[.75,3],[.88,1]].forEach((x,i)=>sets.push({setIndex:i+1,load:Math.round(target*x[0]*2)/2,reps:x[1],type:"warmup"}));}
          return {ok:true,sets,warmup:sets};
        }
        case "api_getWorkoutAdvanced9":{
          let wi=await cget_("workout_items",{select:"*",or:"(id.eq."+((args[0]||{}).rowId||"")+",legacy_id.eq."+((args[0]||{}).rowId||"")+")",limit:1}).catch(()=>[]);
          return {ok:true,advanced:wi[0]||null};
        }
        case "api_saveWorkoutAdvanced9":{
          const p=args[0]||{}; let wi=await cget_("workout_items",{select:"*",or:"(id.eq."+p.rowId+",legacy_id.eq."+p.rowId+")",limit:1}).catch(()=>[]); wi=wi[0];
          const patch={technique_type:p.techniqueType||p.tecnica||"standard",technique_group:p.techniqueGroup||null,drop_percent:p.dropPercent||null,rest_pause_seconds:p.restPauseSeconds||null,warmup_enabled:p.warmupEnabled!==false};
          await cpatch_("workout_items",{id:"eq."+wi.id},patch); return {ok:true,advanced:{...wi,...patch}};
        }
        case "api_pt9GetPrefs":{
          const r=await cget_("user_preferences",{select:"*",athlete_id:"eq."+uid,limit:1}); return {ok:true,prefs:r[0]||{}};
        }
        case "api_pt9SavePrefs":{
          const p=args[0]||{}, body={athlete_id:uid,effort_mode:p.effortMode||p.effort_mode||"RIR",theme_mode:p.themeMode||p.theme_mode||"auto",preferences:p.preferences||{}};
          let r=await cget_("user_preferences",{select:"id",athlete_id:"eq."+uid,limit:1});
          r=r[0]?await cpatch_("user_preferences",{id:"eq."+r[0].id},body):await cpost_("user_preferences",body);
          return {ok:true,prefs:r[0]};
        }
        case "api_calendarList":{
          const p=args[0]||{}; const q={select:"*",athlete_id:"eq."+uid,order:"starts_at.asc",limit:200};
          if(p.from)q.starts_at="gte."+p.from; const r=await cget_("calendar_events",q);
          return {ok:true,events:r.map(x=>({...x,id:x.id,start:x.starts_at,end:x.ends_at,tipo:x.event_type,schedaId:x.plan_id,giornoId:x.day_id}))};
        }
        case "api_calendarSave":{
          const p=args[0]||{}, body={athlete_id:uid,title:p.title||p.titolo||"Evento",starts_at:p.start||p.starts_at||isoNow_(),ends_at:p.end||p.ends_at||null,event_type:p.tipo||p.event_type||"manual",notes:p.note||p.notes||null,plan_id:p.plan_id||null,day_id:p.day_id||null};
          const r=p.id?await cpatch_("calendar_events",{id:"eq."+p.id},body):await cpost_("calendar_events",body); return {ok:true,event:r[0]};
        }
        case "api_calendarDelete": await cdelete_("calendar_events",{id:"eq."+args[0]}); return {ok:true};
        case "api_getFoodStock9":{
          const r=await cget_("pantry_stock",{select:"*",athlete_id:"eq."+uid,order:"updated_at.desc",limit:100}); return {ok:true,items:r,stock:r};
        }
        case "api_saveFoodStock9":{
          const p=args[0]||{}, body={athlete_id:uid,food_id:p.foodId||null,name:p.name||p.nome||"Alimento",quantity:n_(p.quantity??p.quantita,0),unit:p.unit||p.unita||"g",expires_on:p.expiresOn||p.scadenza||null};
          const r=p.id?await cpatch_("pantry_stock",{id:"eq."+p.id},body):await cpost_("pantry_stock",body); return {ok:true,item:r[0]};
        }
        case "api_getNotifications9":{
          const r=await cget_("notifications",{select:"*",athlete_id:"eq."+uid,archived_at:"is.null",order:"created_at.desc",limit:100}).catch(()=>[]);
          return {ok:true,notifications:r};
        }
        case "api_archiveNotification9": await cpatch_("notifications",{id:"eq."+args[0]},{archived_at:isoNow_()}); return {ok:true};
        case "api_getQuickActions9":{
          const r=await cget_("user_preferences",{select:"preferences",athlete_id:"eq."+uid,limit:1}); return {ok:true,actions:r[0]?.preferences?.quickActions||[]};
        }
        case "api_saveQuickActions9": return {ok:true,actions:(args[0]||{}).actions||args[0]||[]};
        case "api_getTechLog9":{
          const r=await cget_("tech_logs",{select:"*",athlete_id:"eq."+uid,order:"created_at.desc",limit:100}).catch(()=>[]); return {ok:true,logs:r};
        }
        case "api_logTech9":{
          const p=args[0]||{}; await cpost_("tech_logs",{athlete_id:uid,level:p.level||"info",source:p.source||"client",message:p.message||"",details:p.details||{}}).catch(()=>{}); return {ok:true};
        }
        case "api_checkDatabaseIntegrity9":{
          const h=await cloudFetch_("/rest/v1/rpc/ptpro_healthcheck",{method:"POST",body:{}}); return {ok:true,health:h,issues:[]};
        }
        case "api_getCoachNotes9":{
          const athlete=args[0]||uid; const r=await cget_("coach_notes",{select:"*",coach_id:"eq."+uid,athlete_id:"eq."+athlete,order:"created_at.desc",limit:100}).catch(()=>[]);
          return {ok:true,notes:r};
        }
        case "api_saveCoachNote9":{
          const p=args[0]||{}; const r=await cpost_("coach_notes",{coach_id:uid,athlete_id:p.athleteUserId||p.athlete_id||uid,note:p.note||p.text||"",category:p.category||"general"}); return {ok:true,note:r[0]};
        }
        case "api_getCoachPermissions9":{
          const athlete=args[0]||uid; const r=await cget_("coach_athletes",{select:"*",coach_id:"eq."+uid,athlete_id:"eq."+athlete,limit:1}).catch(()=>[]);
          return {ok:true,permissions:r[0]||{}};
        }
        case "api_coachDashboard9":{
          const rel=await cget_("coach_athletes",{select:"*",coach_id:"eq."+uid}).catch(()=>[]); return {ok:true,athletes:rel,counts:{athletes:rel.length}};
        }
        case "api_adminSnapshot":{
          const [plans,days,ex,diets]=await Promise.all([
            cget_("workout_plans",{select:"*",athlete_id:"eq."+uid,order:"created_at.desc"}),
            cget_("workout_days",{select:"*",athlete_id:"eq."+uid,order:"sort_order.asc"}),
            cget_("exercises",{select:"*",or:"(owner_id.eq."+uid+",is_global.eq.true)",order:"name.asc",limit:500}),
            cget_("nutrition_plans",{select:"*",athlete_id:"eq."+uid,order:"created_at.desc"})
          ]);
          return {ok:true,plans:plans.map(planLegacy_),days:days.map(dayLegacy_),exercises:ex.map(exLegacy_),diets:diets.map(dietLegacy_)};
        }
        case "api_adminSetActivePlan":{
          const p=await resolvePlan_(args[0]); if(!p)throw new Error("Scheda non trovata");
          await cpatch_("workout_plans",{athlete_id:"eq."+uid,active:"eq.true"},{active:false});
          await cpatch_("workout_plans",{id:"eq."+p.id},{active:true}); return {ok:true};
        }
        case "api_adminSaveExercise":{
          const p=args[0]||{}, body={owner_id:uid,name:p.nome||p.name||"Esercizio",muscle_group:p.gruppo||p.muscle_group||null,equipment:p.attrezzo||p.equipment||null,instructions:p.istruzioni||p.instructions||null,image_url:p.immagine||p.image_url||null,video_url:p.video||p.video_url||null,active:p.active!==false,is_global:false};
          let ex=p.exId?await resolveExercise_(p.exId):null; const r=ex?await cpatch_("exercises",{id:"eq."+ex.id},body):await cpost_("exercises",body); return {ok:true,exercise:exLegacy_(r[0])};
        }
        case "api_adminDeleteExercise":{
          const p=args[0]||{}, ex=await resolveExercise_(p.exId||p); if(ex)await cpatch_("exercises",{id:"eq."+ex.id},{active:false}); return {ok:true};
        }
        case "api_adminSavePlan":{
          const p=args[0]||{}, body={athlete_id:uid,title:p.titolo||p.title||"Scheda",phase:p.fase||null,goal:p.obiettivo||p.goal||null,level:p.livello||null,days_per_week:n_(p.giorniSett,0)||null,session_minutes:n_(p.durataMin,0)||null,cycle_weeks:n_(p.settimane,0)||null,notes:p.note||p.notes||null,active:!!p.attiva};
          let pl=p.schedaId?await resolvePlan_(p.schedaId):null; const r=pl?await cpatch_("workout_plans",{id:"eq."+pl.id},body):await cpost_("workout_plans",body); return {ok:true,plan:planLegacy_(r[0])};
        }
        case "api_adminDeletePlan":{
          const p=args[0]||{}, pl=await resolvePlan_(p.schedaId||p); if(pl)await cpatch_("workout_plans",{id:"eq."+pl.id},{archived_at:isoNow_(),active:false}); return {ok:true};
        }
        case "api_adminSaveDay":{
          const p=args[0]||{}, pl=await resolvePlan_(p.schedaId), body={athlete_id:uid,plan_id:pl.id,name:p.nomeGiorno||p.name||"Giorno",focus:p.focus||null,sort_order:n_(p.ordine,0),notes:p.note||p.notes||null};
          let d=p.giornoId?await resolveDay_(p.giornoId):null; const r=d?await cpatch_("workout_days",{id:"eq."+d.id},body):await cpost_("workout_days",body); return {ok:true,day:dayLegacy_(r[0])};
        }
        case "api_adminDeleteDay":{
          const d=await resolveDay_(args[0]); if(d)await cpatch_("workout_days",{id:"eq."+d.id},{archived_at:isoNow_()}); return {ok:true};
        }
        case "api_adminSaveWorkoutRow":{
          const p=args[0]||{}, d=await resolveDay_(p.giornoId), ex=await resolveExercise_(p.exId), body={athlete_id:uid,day_id:d.id,exercise_id:ex.id,sort_order:n_(p.ordine,0),sets:n_(p.serie,3),reps_text:String(p.ripetizioni||""),target_load:p.carico===""?null:n_(p.carico),rest_seconds:n_(p.recuperoSec||p.recupero,0)||null,tempo:p.tempo||null,target_rir:p.rir===""?null:n_(p.rir),target_rpe:p.rpe===""?null:n_(p.rpe),notes:p.note||p.notes||null};
          let wi=[]; if(p.rowId)wi=await cget_("workout_items",{select:"*",or:"(id.eq."+p.rowId+",legacy_id.eq."+p.rowId+")",limit:1}).catch(()=>[]);
          const r=wi[0]?await cpatch_("workout_items",{id:"eq."+wi[0].id},body):await cpost_("workout_items",body); return {ok:true,row:itemLegacy_(r[0],ex)};
        }
        case "api_adminDeleteWorkoutRow":{
          let wi=await cget_("workout_items",{select:"*",or:"(id.eq."+args[0]+",legacy_id.eq."+args[0]+")",limit:1}).catch(()=>[]); if(wi[0])await cpatch_("workout_items",{id:"eq."+wi[0].id},{archived_at:isoNow_()}); return {ok:true};
        }
        case "api_adminGetPlan":{
          const pl=await resolvePlan_(args[0]); const days=pl?await cget_("workout_days",{select:"*",plan_id:"eq."+pl.id,archived_at:"is.null",order:"sort_order.asc"}):[];
          return {ok:true,plan:planLegacy_(pl),days:days.map(dayLegacy_)};
        }
        case "api_getAnalyticsPro9":{
          const [sets,sessions,measures]=await Promise.all([
            cget_("workout_sets",{select:"*",athlete_id:"eq."+uid,order:"logged_at.desc",limit:1000}),
            cget_("workout_sessions",{select:"*",athlete_id:"eq."+uid,order:"started_at.desc",limit:365}),
            cget_("measurements",{select:"*",athlete_id:"eq."+uid,order:"measured_on.asc",limit:365})
          ]);
          const volume=sets.reduce((a,s)=>a+n_(s.volume,n_(s.load)*n_(s.reps)),0);
          return {ok:true,summary:{sessions:sessions.length,sets:sets.length,totalVolume:volume},sessions:sessions.map(sessionLegacy_),measures:measures.map(measureLegacy_),sets};
        }
        case "api_globalSearch9":{
          const p=args[0]||{}, term=String(p.q||p.query||p||"").trim().toLowerCase();
          const [ex,plans,foods]=await Promise.all([
            cget_("exercises",{select:"id,legacy_id,name,muscle_group",or:"(owner_id.eq."+uid+",is_global.eq.true)",limit:300}),
            cget_("workout_plans",{select:"id,legacy_id,title,goal",athlete_id:"eq."+uid,limit:100}),
            cget_("foods",{select:"id,legacy_id,name,category",or:"(owner_id.eq."+uid+",is_global.eq.true)",limit:300})
          ]);
          const results=[
            ...ex.filter(x=>x.name?.toLowerCase().includes(term)).slice(0,10).map(x=>({type:"exercise",id:x.legacy_id||x.id,title:x.name,subtitle:x.muscle_group||""})),
            ...plans.filter(x=>x.title?.toLowerCase().includes(term)).slice(0,10).map(x=>({type:"plan",id:x.legacy_id||x.id,title:x.title,subtitle:x.goal||""})),
            ...foods.filter(x=>x.name?.toLowerCase().includes(term)).slice(0,10).map(x=>({type:"food",id:x.legacy_id||x.id,title:x.name,subtitle:x.category||""}))
          ];
          return {ok:true,results};
        }
        case "api_getTemplates9": return {ok:true,templates:[
          {key:"strength-3",title:"Forza 3 giorni",days:3,goal:"Forza"},
          {key:"hypertrophy-4",title:"Ipertrofia 4 giorni",days:4,goal:"Ipertrofia"},
          {key:"fullbody-3",title:"Full Body 3 giorni",days:3,goal:"Ricondizionamento"}
        ]};
        case "api_getTrash9":{
          const r=await cget_("trash",{select:"*",athlete_id:"eq."+uid,order:"deleted_at.desc",limit:100}).catch(()=>[]); return {ok:true,items:r,trash:r};
        }
        case "api_emptyExpiredTrash9": return {ok:true,deleted:0};
        case "api_exportAllData":{
          const tables=["profiles","workout_plans","workout_days","workout_items","workout_sessions","workout_sets","measurements","goals","weekly_checkins","nutrition_plans","nutrition_days","meals","foods","supplements","calendar_events"];
          const out={}; for(const t of tables){out[t]=await cget_(t,{select:"*",limit:5000}).catch(()=>[])}
          return {ok:true,data:out,json:JSON.stringify(out,null,2)};
        }
        case "api_getControlCenter": return cloudBootstrap_();
        case "api_getAdaptiveHome":{
          const b=await cloudBootstrap_(); const sc=await smartCoach4_(); const next=b.days?.[0]||null;
          return {ok:true,today:b.today,mode:sc.deloadGlobal?"deload":"training",icon:sc.deloadGlobal?"⚠️":"🏋️",title:sc.deloadGlobal?"Gestisci la fatica":(next?.nomeGiorno||"Prossimo workout"),text:sc.deloadGlobal?"Smart Coach suggerisce recupero/deload.":(next?.focus||"Continua la programmazione."),action:sc.deloadGlobal?"coach":"workout",giornoId:next?.giornoId||"",nextDay:next,readiness:sc.readiness,fatigue:sc.fatigue,reminders:[]};
        }
        default:
          console.warn("PT-PRO Cloud API non ancora specializzata:",name,args);
          return {ok:true,cloud:true,compatibility:true,message:"Funzione disponibile nella UI; adattatore Cloud generico attivo.",items:[],data:[],results:[]};
      }
    }


    function gas(functionName,...args){ return cloudGas_(functionName,...args); }



    function toast(
      message
    ){

      const el =
        $("#toast");

      el.textContent =
        message;

      el.classList.add(
        "show"
      );

      setTimeout(
        () =>
          el.classList.remove(
            "show"
          ),
        2300
      );

    }


    function showPR(title, text){

      const box = $("#prToast");
      const titleEl = $("#prTitle");
      const textEl = $("#prText");

      if(!box || !titleEl || !textEl){
        return;
      }

      titleEl.textContent = title;
      textEl.textContent = text;

      box.classList.add("show");

      if(navigator.vibrate){
        navigator.vibrate([120,80,120,80,180]);
      }

      setTimeout(
        () => box.classList.remove("show"),
        3200
      );

    }


    function fmtNum(
      value,
      suffix=""
    ){

      if(
        value === 0 ||
        value
      ){

        return (
          String(value)
            .replace(".",",")
          +
          suffix
        );

      }

      return "—";

    }


    function fmtDate(
      value
    ){

      if(!value){
        return "—";
      }


      const date =
        new Date(value);


      if(
        isNaN(
          date.getTime()
        )
      ){

        return String(value);

      }


      return date
        .toLocaleDateString(
          "it-IT",
          {
            day:"2-digit",
            month:"short"
          }
        );

    }



    function imageSrc(value){
      const v=String(value||"").trim();
      if(!v) return "";
      if(/^https?:\/\//i.test(v) || /^data:image\//i.test(v) || /^blob:/i.test(v)) return v;
      if(v.length>500 && /^[A-Za-z0-9+/=\s]+$/.test(v)) return "data:image/jpeg;base64,"+v.replace(/\s+/g,"");
      return v;
    }

    function imageTag(value, cls, alt){
      const src=imageSrc(value);
      if(!src) return "";
      return `<img class="${cls||""}" loading="lazy" src="${esc(src)}" alt="${esc(alt||"Esercizio")}" onerror="this.style.display='none'">`;
    }

    function todayLabel(){

      return new Date()
        .toLocaleDateString(
          "it-IT",
          {
            weekday:"long",
            day:"numeric",
            month:"long"
          }
        );

    }




    function parseSessionDate(value){
      if(!value) return null;
      const d=new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }

    function sessionMetrics(sessions){
      const list=(sessions||[]).filter(Boolean);
      const completed=list.filter(s=>s.dataOraEnd || Number(s.durataMin)>0);
      const durations=completed.map(s=>Number(s.durataMin||0)).filter(n=>Number.isFinite(n)&&n>0);
      const completions=completed.map(s=>Number(s.completamento||0)).filter(Number.isFinite);
      const avgDuration=durations.length ? Math.round(durations.reduce((a,b)=>a+b,0)/durations.length) : 0;
      const avgCompletion=completions.length ? Math.round(completions.reduce((a,b)=>a+b,0)/completions.length) : 0;

      const now=new Date();
      const monday=new Date(now);
      const dow=(monday.getDay()+6)%7;
      monday.setHours(0,0,0,0); monday.setDate(monday.getDate()-dow);
      const thisWeek=completed.filter(s=>{ const d=parseSessionDate(s.dataOraStart); return d && d>=monday; });
      const weekMinutes=thisWeek.reduce((sum,s)=>sum+Number(s.durataMin||0),0);

      const dateSet=new Set(completed.map(s=>String(s.dataOraStart||'').slice(0,10)).filter(Boolean));
      let streak=0;
      const cursor=new Date(); cursor.setHours(0,0,0,0);
      const todayKey=cursor.toISOString().slice(0,10);
      if(!dateSet.has(todayKey)){ cursor.setDate(cursor.getDate()-1); }
      while(dateSet.has(cursor.toISOString().slice(0,10))){ streak++; cursor.setDate(cursor.getDate()-1); }

      return {completed,avgDuration,avgCompletion,thisWeek,weekMinutes,streak};
    }

    function weightDelta(measures){
      const valid=(measures||[]).filter(m=>Number.isFinite(Number(String(m.peso_kg||'').replace(',','.'))));
      if(valid.length<2) return null;
      const latest=Number(String(valid[0].peso_kg).replace(',','.'));
      const oldest=Number(String(valid[Math.min(valid.length-1,7)].peso_kg).replace(',','.'));
      return Math.round((latest-oldest)*10)/10;
    }

    function deltaHtml(value,suffix=''){
      if(value===null || value===undefined || !Number.isFinite(Number(value))) return '<span class="deltaPill trendFlat">—</span>';
      const n=Number(value);
      const cls=n>0?'trendUp':n<0?'trendDown':'trendFlat';
      const sign=n>0?'+':'';
      return `<span class="deltaPill ${cls}">${sign}${String(n).replace('.',',')}${suffix}</span>`;
    }

    function weeklyBars(sessions){
      const now=new Date();
      const monday=new Date(now);
      const dow=(monday.getDay()+6)%7;
      monday.setHours(0,0,0,0); monday.setDate(monday.getDate()-dow);
      const counts=Array(7).fill(0);
      (sessions||[]).forEach(s=>{
        const d=parseSessionDate(s.dataOraStart); if(!d || d<monday) return;
        const idx=(d.getDay()+6)%7; if(idx>=0&&idx<7) counts[idx]++;
      });
      const max=Math.max(1,...counts);
      const labels=['L','M','M','G','V','S','D'];
      return `<div class="weekBars">${counts.map((c,i)=>`<div class="weekBarCol"><div class="weekBarTrack"><div class="weekBar" style="height:${Math.max(3,Math.round(c/max*100))}%"></div></div><b style="font-size:10px">${c}</b><span class="weekBarLabel">${labels[i]}</span></div>`).join('')}</div>`;
    }


    