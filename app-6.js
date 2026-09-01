/* =========================================================
       PT-PRO 10 Cloud · CLOUD EVOLUTION
       ========================================================= */

    async function loadSuggestion(exId){
      const box=document.getElementById("suggest_"+exId);
      if(!box)return;
      const exercise=state.workout?.exercises?.find(x=>String(x.exId)===String(exId));
      if(!exercise)return;
      const range=String(exercise.ripetizioni||"").match(/(\d+)\s*[-–]\s*(\d+)/);
      const one=Number((String(exercise.ripetizioni||"").match(/\d+/)||[8])[0]);
      const minRep=range?Number(range[1]):one, maxRep=range?Number(range[2]):one;
      try{
        const r=await gas("api_getSmartPrescription9",{exId,sets:Number(exercise.serie)||3,minRep,maxRep,fallbackLoad:exercise.carico||0,step:1.25});
        box.innerHTML=`
          <div class="smartSetPlan">
            <strong>🧠 Smart Coach 4.0 · ${r.confidence}% affidabilità</strong>
            <div class="smartLine">${esc(r.reason)}</div>
            <div class="smartLine">e1RM ${r.latestE1rm||"—"} · trend ${r.trendPct>0?"+":""}${r.trendPct}% · RIR medio ${r.avgRir}</div>
            <div class="prescriptionSets">
              ${(r.prescription||[]).map(s=>`<div class="prescriptionSet"><b>Set ${s.set}</b><span>${s.load!==null?esc(s.load)+" kg":"carico libero"} × ${s.repsMin}${s.repsMax!==s.repsMin?"-"+s.repsMax:""} · RIR ${s.targetRir}</span></div>`).join("")}
            </div>
            <button class="secondary smartApply" data-apply-prescription>Applica ai set</button>
          </div>`;
        box.querySelector("[data-apply-prescription]")?.addEventListener("click",()=>{
          const detail=box.closest(".exercise");
          detail?.querySelectorAll("[data-setrow]").forEach((row,i)=>{
            const p=r.prescription[i]; if(!p)return;
            const l=row.querySelector("[data-load]"), reps=row.querySelector("[data-reps]"), effort=row.querySelector("[data-rir]");
            if(l&&p.load!==null)l.value=p.load;
            if(reps)reps.value=p.repsMax;
            if(effort)effort.value=state.effortMode==="RPE"?(10-p.targetRir):p.targetRir;
          });
          toast("Prescrizione applicata ✓");
        });
      }catch(e){ box.textContent="Smart Coach non disponibile"; }
    }

    function bindProWorkoutTools9(){
      document.querySelectorAll("[data-warmup]").forEach(b=>b.onclick=()=>warmup9(b.dataset.warmup));
      document.querySelectorAll("[data-replace]").forEach(b=>b.onclick=()=>replaceExercise9(b.dataset.replace,b.dataset.rowid));
      document.querySelectorAll("[data-exnote]").forEach(b=>b.onclick=()=>exerciseNotes9(b.dataset.exnote));
      document.querySelectorAll("[data-media]").forEach(b=>b.onclick=()=>exerciseMedia9(b.dataset.media));
      document.querySelectorAll("[data-technique]").forEach(b=>b.onclick=()=>technique9(b.dataset.technique));
    }

    async function warmup9(exId){
      const ex=state.workout?.exercises?.find(x=>String(x.exId)===String(exId));
      const detail=document.querySelector(`[data-exercise="${CSS.escape(String(exId))}"]`);
      const load=Number(detail?.querySelector("[data-load]")?.value||ex?.carico||0);
      if(!load){toast("Inserisci prima il carico di lavoro");return}
      try{
        const r=await gas("api_getWarmup9",{workLoad:load,step:2.5});
        modal9("🔥 Warm-up automatico",`
          <div class="warmupBox">${(r.sets||[]).map(s=>`<div class="prescriptionSet"><b>${s.pct}%</b><span>${s.load} kg × ${s.reps}</span></div>`).join("")}</div>
          <p class="muted">Serie di avvicinamento: non vengono conteggiate nelle serie allenanti.</p>`);
      }catch(e){toast(e.message)}
    }

    async function replaceExercise9(exId,rowId){
      try{
        const r=await gas("api_getExerciseAlternatives9",{exId});
        modal9("🔁 Sostituisci esercizio",`
          <p class="muted">Alternative compatibili con ${esc(r.source?.nome||"l'esercizio")}.</p>
          ${(r.alternatives||[]).map(x=>`<button class="searchResult" data-alt="${esc(x.exId)}"><b>${esc(x.nome)}</b><span>${esc(x.gruppo||"")} · ${esc(x.attrezzatura||"")} · compatibilità ${x.score}</span></button>`).join("")||'<span class="muted">Nessuna alternativa trovata.</span>'}
          <label class="field" style="margin-top:10px"><span>Applica</span><select id="replaceMode9"><option value="today">Solo oggi</option><option value="plan">Anche nella scheda</option></select></label>`);
        document.querySelectorAll("[data-alt]").forEach(btn=>btn.onclick=async()=>{
          const newId=btn.dataset.alt;
          if($("#replaceMode9")?.value==="plan"&&rowId) await gas("api_replaceWorkoutExercise9",{rowId,newExId:newId});
          const alt=r.alternatives.find(x=>String(x.exId)===String(newId));
          const idx=state.workout.exercises.findIndex(x=>String(x.exId)===String(exId));
          if(idx>=0) state.workout.exercises[idx]=Object.assign({},state.workout.exercises[idx],alt,{exNome:alt.nome,exId:alt.exId});
          closeModal9();renderWorkout();toast("Esercizio sostituito ✓");
        });
      }catch(e){toast(e.message)}
    }

    async function exerciseNotes9(exId){
      try{
        const r=await gas("api_getExerciseNotes9",exId), n=r.note||{};
        modal9("📝 Note rapide esercizio",`
          <div class="formGrid">
            <label class="field"><span>Dolore / fastidio</span><input id="nPain" value="${esc(n.pain||"")}"></label>
            <label class="field"><span>Macchina</span><input id="nMachine" value="${esc(n.machine||"")}"></label>
            <label class="field"><span>Altezza sedile</span><input id="nSeat" value="${esc(n.seat||"")}"></label>
            <label class="field"><span>Impugnatura</span><input id="nGrip" value="${esc(n.grip||"")}"></label>
          </div>
          <label class="field"><span>Tecnica / cue</span><textarea id="nTechnique">${esc(n.technique||"")}</textarea></label>
          <label class="field"><span>Nota libera</span><textarea id="nText">${esc(n.note||"")}</textarea></label>
          <button class="primary big" id="saveExNote9">Salva note</button>`);
        $("#saveExNote9").onclick=async()=>{
          await gas("api_saveExerciseNotes9",{exId,pain:$("#nPain").value,machine:$("#nMachine").value,seat:$("#nSeat").value,grip:$("#nGrip").value,technique:$("#nTechnique").value,note:$("#nText").value});
          closeModal9();toast("Note salvate ✓");
        };
      }catch(e){toast(e.message)}
    }

    function exerciseMedia9(exId){
      const ex=state.workout?.exercises?.find(x=>String(x.exId)===String(exId)); if(!ex)return;
      modal9("🎬 Tecnica esercizio",`
        ${ex.imgUrl?`<img src="${esc(exerciseImageSrc(ex.imgUrl))}" style="width:100%;max-height:300px;object-fit:contain;border-radius:14px">`:""}
        ${ex.videoUrl?`<a class="primary big" target="_blank" href="${esc(ex.videoUrl)}" style="display:block;text-align:center;margin-top:10px">Apri video tecnico →</a>`:""}
        <p>${esc(ex.tecnica||ex.descrizione||"")}</p>`);
    }

    async function technique9(rowId){
      const current=state.workoutAdvanced?.[String(rowId)]||{};
      modal9("⚡ Tecnica avanzata",`
        <label class="field"><span>Tecnica</span><select id="techType9">
          ${["standard","superset","dropset","rest-pause"].map(x=>`<option value="${x}" ${current.technique===x?"selected":""}>${x}</option>`).join("")}
        </select></label>
        <label class="field"><span>Gruppo superset (es. A1)</span><input id="techGroup9" value="${esc(current.groupId||"")}"></label>
        <label class="field"><span>Drop %</span><input id="techDrop9" inputmode="decimal" value="${esc(current.dropPercent||20)}"></label>
        <label class="field"><span>Rest-pause sec</span><input id="techRP9" inputmode="numeric" value="${esc(current.restPauseSec||20)}"></label>
        <button class="primary big" id="saveTech9">Salva</button>`);
      $("#saveTech9").onclick=async()=>{
        const r=await gas("api_saveWorkoutAdvanced9",{rowId,technique:$("#techType9").value,groupId:$("#techGroup9").value,dropPercent:$("#techDrop9").value,restPauseSec:$("#techRP9").value,warmup:true});
        state.workoutAdvanced[String(rowId)]=r.data;closeModal9();toast("Tecnica aggiornata ✓");
      };
    }

    function modal9(title,body){
      closeModal9();
      const d=document.createElement("div");d.id="modal9";d.className="searchOverlay";
      d.innerHTML=`<div class="searchPanel"><div class="card"><div class="sectionTitle" style="margin:0 0 10px"><h2>${title}</h2><button class="iconBtn" id="closeModal9">✕</button></div>${body}</div></div>`;
      document.body.appendChild(d);$("#closeModal9").onclick=closeModal9;
    }
    function closeModal9(){document.getElementById("modal9")?.remove()}

    async function globalSearch9(){
      modal9("⌕ Ricerca globale",`<input class="searchInput" id="search9" placeholder="Esercizi, schede, giorni, pasti…"><div id="searchResults9"></div>`);
      const input=$("#search9"), box=$("#searchResults9"); input.focus();
      let timer; input.oninput=()=>{clearTimeout(timer);timer=setTimeout(async()=>{
        const q=input.value.trim(); if(q.length<2){box.innerHTML="";return}
        const r=await gas("api_globalSearch9",{q});
        box.innerHTML=(r.results||[]).map((x,i)=>`<button class="searchResult" data-sr="${i}"><b>${esc(x.title)}</b><span>${esc(x.type)} · ${esc(x.sub||"")}</span></button>`).join("")||'<span class="muted">Nessun risultato.</span>';
        document.querySelectorAll("[data-sr]").forEach(b=>b.onclick=()=>{
          const x=r.results[Number(b.dataset.sr)];closeModal9();
          if(x.action==="day")openWorkout(x.data.giornoId);
          else if(x.action==="exercise")exerciseLibrary();
          else if(x.action==="nutrition")go("nutrition");
          else if(x.action==="plan")dataManager();
        });
      },250)};
    }


    async function loadQuickActions9(){
      try{
        const r=await gas("api_getQuickActions9"), actions=r.actions||[];
        const buttons=[$("#quickWorkout"),$("#quickWeight"),$("#quickProgress"),$("#quickNutrition")].filter(Boolean);
        const run=a=>{
          if(a.action==="workout")go("workout");
          else if(a.action==="measure")measureForm();
          else if(a.action==="progress")go("progress");
          else if(a.action==="nutrition")go("nutrition");
          else if(a.action==="checkin")weeklyCheckin9();
          else if(a.action==="search")globalSearch9();
          else if(a.action==="goals")goals9();
          else if(a.action==="notifications")notifications9();
        };
        buttons.forEach((b,i)=>{
          const a=actions[i]; if(!a)return;
          b.innerHTML=`<i>${esc(a.icon||"•")}</i><b>${esc(a.label||"Azione")}</b>`;
          b.onclick=()=>run(a);
        });
      }catch(e){}
    }

    async function quickActionsEditor9(){
      const current=(await gas("api_getQuickActions9")).actions||[];
      const options=[
        ["workout","🏋️","Allenamento"],["measure","⚖️","Nuova misura"],["progress","📈","Progressi"],
        ["nutrition","🥗","Nutrizione"],["checkin","🌙","Check-in"],["search","⌕","Ricerca"],
        ["goals","🎯","Obiettivi"],["notifications","🔔","Notifiche"]
      ];
      modal9("⚡ Azioni rapide Home",`
        ${[0,1,2,3].map(i=>`<label class="field"><span>Posizione ${i+1}</span><select id="qa${i}">${options.map(o=>`<option value="${o[0]}" ${(current[i]?.action||"")===o[0]?"selected":""}>${o[1]} ${o[2]}</option>`).join("")}</select></label>`).join("")}
        <button class="primary big" id="saveQA9">Salva Home</button>`);
      $("#saveQA9").onclick=async()=>{
        const acts=[0,1,2,3].map(i=>{const v=$("#qa"+i).value,o=options.find(x=>x[0]===v);return{action:v,icon:o[1],label:o[2]}});
        await gas("api_saveQuickActions9",{actions:acts});closeModal9();toast("Azioni Home aggiornate ✓");
      };
    }

    /* ---------- PRO LAB ---------- */
    function proLab9(){
      state.view="more";
      layout(`
        <div class="viewTitle"><h1>PT-PRO 10 Pro</h1><div class="muted">Il centro delle funzioni avanzate.</div></div>
        <div class="proGrid">
          <button class="proTile" id="pCoach"><i>🧠</i><b>Smart Coach 4.0</b><span>3–5 sedute, e1RM, RIR e recupero</span></button>
          <button class="proTile" id="pRecovery"><i>💪</i><b>Recupero muscolare</b><span>Pronto, recupero o affaticato</span></button>
          <button class="proTile" id="pCheck"><i>🌙</i><b>Check-in settimanale</b><span>Sonno, stress, DOMS, energia</span></button>
          <button class="proTile" id="pGoals"><i>🎯</i><b>Obiettivi</b><span>Forza, peso, vita e target</span></button>
          <button class="proTile" id="pAnalytics"><i>📊</i><b>Analytics Pro</b><span>4 settimane vs 4 precedenti</span></button>
          <button class="proTile" id="pNutrition"><i>🥗</i><b>Nutrizione Pro</b><span>Preferenze, sostituzioni, scorte, spesa</span></button>
          <button class="proTile" id="pNotifications"><i>🔔</i><b>Notifiche</b><span>Reminder con priorità</span></button>
          <button class="proTile" id="pPlans"><i>🧬</i><b>Schede Pro</b><span>Import, export, progressione, template</span></button>
          <button class="proTile" id="pSafety"><i>🛡️</i><b>Sicurezza dati</b><span>Integrità, cestino e log tecnico</span></button>
          <button class="proTile" id="pCoachPro"><i>👥</i><b>Coach Pro</b><span>Atleti, alert, note e permessi</span></button>
          <button class="proTile" id="pPrefs"><i>⚙️</i><b>Preferenze Pro</b><span>RIR/RPE e preferenze alimentari</span></button>
          <button class="proTile" id="pSearch"><i>⌕</i><b>Ricerca globale</b><span>Cerca in tutta PT-PRO</span></button>
          <button class="proTile" id="pQuick"><i>⚡</i><b>Azioni Home</b><span>Personalizza i 4 collegamenti rapidi</span></button>
        </div>
        <button class="secondary big" style="margin-top:14px" id="pBack">← Centro controllo</button>`);
      $("#pCoach").onclick=smartCoach4_9;$("#pRecovery").onclick=recovery9;$("#pCheck").onclick=weeklyCheckin9;
      $("#pGoals").onclick=goals9;$("#pAnalytics").onclick=analyticsPro9;$("#pNutrition").onclick=nutritionPro9;
      $("#pNotifications").onclick=notifications9;$("#pPlans").onclick=plansPro9;$("#pSafety").onclick=safety9;
      $("#pCoachPro").onclick=coachPro9;$("#pPrefs").onclick=prefsPro9;$("#pSearch").onclick=globalSearch9;$("#pQuick").onclick=quickActionsEditor9;$("#pBack").onclick=more;
    }

    async function smartCoach4_9(){
      layout(`<div class="loading"><div><div class="spinner"></div>Smart Coach 4.0…</div></div>`);
      try{
        const r=await gas("api_getSmartCoach4");
        const c=r.base||{};
        layout(`<div class="viewTitle"><h1>Smart Coach 4.0</h1><div class="muted">Coach contestuale basato su performance e recupero.</div></div>
          <div class="card"><div class="coachMetrics"><div class="coachMetric"><b>${c.readiness??"—"}%</b><span>Readiness</span></div><div class="coachMetric"><b>${c.fatigue??"—"}%</b><span>Fatica</span></div><div class="coachMetric"><b>${r.checkIn?.score??"—"}%</b><span>Check-in</span></div></div>
          ${(r.alerts||[]).map(a=>`<div class="adminNotice" style="margin-top:8px">${esc(a)}</div>`).join("")||'<p class="muted">Nessun alert importante.</p>'}</div>
          <div class="card" style="margin-top:10px"><h3>Recupero muscolare</h3>${renderRecovery9(r.recovery?.muscles||[])}</div>
          <button class="secondary big" style="margin-top:12px" onclick="proLab9()">← PT-PRO 10 Pro</button>`);
      }catch(e){toast(e.message);proLab9()}
    }

    function renderRecovery9(muscles){return `<div class="recoveryList">${muscles.map(m=>`<div class="recoveryRow"><b>${esc(m.group)}</b><div class="recoveryBar"><i style="width:${m.pct}%"></i></div><span>${esc(m.status)}</span></div>`).join("")||'<span class="muted">Servono allenamenti registrati.</span>'}</div>`}
    async function recovery9(){try{const r=await gas("api_getMuscleRecovery9");layout(`<div class="viewTitle"><h1>Recupero muscolare</h1><div class="muted">Stima basata sull'ultima esposizione di ogni gruppo.</div></div><div class="card">${renderRecovery9(r.muscles||[])}</div><button class="secondary big" style="margin-top:12px" onclick="proLab9()">← PT-PRO 10 Pro</button>`)}catch(e){toast(e.message)}}

    async function weeklyCheckin9(){
      let r=await gas("api_getWeeklyCheckIn9"), n=r.latest||{};
      layout(`<div class="viewTitle"><h1>Check-in settimanale</h1><div class="muted">1 = basso · 5 = ottimo, tranne stress e DOMS dove 5 = alto.</div></div>
        <div class="card"><div class="formGrid">
        ${["sleep:Sonno","stress:Stress","energy:Energia","doms:DOMS","motivation:Motivazione"].map(x=>{const [k,l]=x.split(":");return `<label class="field"><span>${l}</span><select id="ci_${k}">${[1,2,3,4,5].map(v=>`<option value="${v}" ${Number(n[k]||3)===v?"selected":""}>${v}</option>`).join("")}</select></label>`}).join("")}
        </div><label class="field"><span>Note</span><textarea id="ci_notes">${esc(n.notes||"")}</textarea></label><button class="primary big" id="saveCheck9">Salva check-in</button></div>
        ${r.score!==null?`<div class="card" style="margin-top:10px"><b>Recovery score: ${r.score}%</b></div>`:""}
        <button class="secondary big" style="margin-top:12px" onclick="proLab9()">← PT-PRO 10 Pro</button>`);
      $("#saveCheck9").onclick=async()=>{r=await gas("api_saveWeeklyCheckIn9",{sleep:$("#ci_sleep").value,stress:$("#ci_stress").value,energy:$("#ci_energy").value,doms:$("#ci_doms").value,motivation:$("#ci_motivation").value,notes:$("#ci_notes").value});toast("Check-in salvato ✓");weeklyCheckin9()};
    }

    async function goals9(){
      const r=await gas("api_getGoals9"), goals=r.goals||[];
      layout(`<div class="viewTitle"><h1>Obiettivi</h1><div class="muted">Target misurabili con avanzamento automatico.</div></div>
        <button class="primary big" id="newGoal9">+ Nuovo obiettivo</button>
        <div style="margin-top:10px">${goals.map(g=>`<div class="goalCard"><div class="sectionTitle" style="margin:0"><h3>${esc(g.label)}</h3><span>${g.progressPct}%</span></div><div class="muted">${g.currentValue} ${esc(g.unit||"")} → ${g.target} ${esc(g.unit||"")}${g.targetDate?" · entro "+esc(g.targetDate):""}</div><div class="goalBar"><i style="width:${g.progressPct}%"></i></div><button class="secondary" data-delgoal="${esc(g.goalId)}" style="margin-top:8px">Elimina</button></div>`).join("")||'<div class="card muted">Nessun obiettivo.</div>'}</div>
        <button class="secondary big" style="margin-top:12px" onclick="proLab9()">← PT-PRO 10 Pro</button>`);
      $("#newGoal9").onclick=()=>goalEditor9();
      document.querySelectorAll("[data-delgoal]").forEach(b=>b.onclick=async()=>{await gas("api_deleteGoal9",b.dataset.delgoal);goals9()});
    }
    async function goalEditor9(){
      const ex=(await gas("api_adminSnapshot")).exercises||[];
      modal9("🎯 Nuovo obiettivo",`
        <label class="field"><span>Tipo</span><select id="gType"><option value="strength">Forza/e1RM</option><option value="weight">Peso</option><option value="waist">Vita</option><option value="custom">Personalizzato</option></select></label>
        <label class="field"><span>Nome</span><input id="gLabel" placeholder="Es. Panca 100 kg"></label>
        <label class="field"><span>Esercizio (se forza)</span><select id="gEx"><option value="">—</option>${ex.map(e=>`<option value="${esc(e.exId)}">${esc(e.nome)}</option>`).join("")}</select></label>
        <div class="formGrid"><label class="field"><span>Valore iniziale</span><input id="gStart" inputmode="decimal"></label><label class="field"><span>Target</span><input id="gTarget" inputmode="decimal"></label></div>
        <div class="formGrid"><label class="field"><span>Unità</span><input id="gUnit" value="kg"></label><label class="field"><span>Data target</span><input id="gDate" type="date"></label></div>
        <button class="primary big" id="gSave">Salva</button>`);
      $("#gSave").onclick=async()=>{await gas("api_saveGoal9",{type:$("#gType").value,label:$("#gLabel").value,exerciseId:$("#gEx").value,startValue:$("#gStart").value,target:$("#gTarget").value,unit:$("#gUnit").value,targetDate:$("#gDate").value});closeModal9();goals9()};
    }

    async function analyticsPro9(){
      const r=await gas("api_getAnalyticsPro9"), c=r.current,p=r.previous,ch=r.change;
      const metric=(label,val,delta)=>`<div class="analyticsMetric"><b>${val}</b><span>${label}${delta!==null&&delta!==undefined?` · ${delta>0?"+":""}${delta}%`:""}</span></div>`;
      layout(`<div class="viewTitle"><h1>Analytics Pro</h1><div class="muted">Ultime 4 settimane contro le 4 precedenti.</div></div>
        <div class="card"><div class="analyticsCompare">${metric("Sessioni",c.sessions,ch.sessions)}${metric("Serie",c.sets,ch.sets)}${metric("Minuti",c.minutes,ch.minutes)}${metric("Volume",formatVolume(c.volume),ch.volume)}</div></div>
        <div class="card" style="margin-top:10px"><h3>PR periodo</h3><span class="miniTag">Load ${c.prs.load} kg</span><span class="miniTag">e1RM ${c.prs.e1rm} kg</span><span class="miniTag">Reps ${c.prs.reps}</span><span class="miniTag">Set volume ${c.prs.volume}</span></div>
        <div class="card" style="margin-top:10px"><h3>Volume per gruppo</h3>${Object.entries(c.groups||{}).sort((a,b)=>b[1]-a[1]).map(([g,v])=>`<div class="recoveryRow"><b>${esc(g)}</b><div class="recoveryBar"><i style="width:${Math.min(100,v/Math.max(...Object.values(c.groups||{x:1}))*100)}%"></i></div><span>${formatVolume(v)}</span></div>`).join("")}</div>
        <button class="secondary big" style="margin-top:12px" onclick="proLab9()">← PT-PRO 10 Pro</button>`);
    }

    async function prefsPro9(){
      const r=await gas("api_pt9GetPrefs"), p=r.prefs||{};
      layout(`<div class="viewTitle"><h1>Preferenze Pro</h1><div class="muted">Impostazioni usate da workout e nutrizione.</div></div>
        <div class="card"><label class="field"><span>Sforzo durante workout</span><select id="prefEffort"><option value="RIR" ${p.effortMode!=="RPE"?"selected":""}>RIR</option><option value="RPE" ${p.effortMode==="RPE"?"selected":""}>RPE</option></select></label>
        <label class="field"><span>Alimenti preferiti</span><textarea id="prefLikes" placeholder="riso, pollo, yogurt…">${esc(p.foodLikes||"")}</textarea></label>
        <label class="field"><span>Alimenti da evitare</span><textarea id="prefAvoid">${esc(p.foodAvoid||"")}</textarea></label>
        <button class="primary big" id="savePrefs9">Salva preferenze</button></div><button class="secondary big" style="margin-top:12px" onclick="proLab9()">← PT-PRO 10 Pro</button>`);
      $("#savePrefs9").onclick=async()=>{await gas("api_pt9SavePrefs",{effortMode:$("#prefEffort").value,foodLikes:$("#prefLikes").value,foodAvoid:$("#prefAvoid").value});localStorage.setItem("ptpro_effort_mode",$("#prefEffort").value);toast("Preferenze salvate ✓")};
    }

    async function nutritionPro9(){
      const pref=(await gas("api_pt9GetPrefs")).prefs||{}, stock=(await gas("api_getFoodStock9")).stock||[];
      layout(`<div class="viewTitle"><h1>Nutrizione Pro</h1><div class="muted">Preferenze, sostituzioni, scorte e lista spesa intelligente.</div></div>
        <div class="card"><h3>Preferenze attive</h3><p class="muted">Preferiti: ${esc(pref.foodLikes||"—")}<br>Evita: ${esc(pref.foodAvoid||"—")}</p><button class="secondary" onclick="prefsPro9()">Modifica</button></div>
        <div class="card" style="margin-top:10px"><div class="sectionTitle" style="margin:0"><h3>Scorte</h3><button class="secondary" id="addStock9">+ Aggiungi</button></div>${stock.map(s=>`<div class="dayDetailItem"><div>📦</div><div><b>${esc(s.name)}</b><span>${esc(s.qty)} ${esc(s.unit)}</span></div></div>`).join("")||'<span class="muted">Nessuna scorta registrata.</span>'}</div>
        <div class="card" style="margin-top:10px"><h3>Sostituzione alimento</h3><div class="formGrid"><label class="field"><span>Alimento</span><input id="altFoodName"></label><label class="field"><span>Kcal circa</span><input id="altFoodKcal" inputmode="decimal"></label></div><button class="secondary big" id="findFoodAlt9">Trova equivalenti</button><div id="foodAltResults9"></div></div>
        <button class="secondary big" style="margin-top:12px" onclick="proLab9()">← PT-PRO 10 Pro</button>`);
      $("#addStock9").onclick=()=>modal9("📦 Aggiungi scorta",`<label class="field"><span>Alimento</span><input id="stkName"></label><div class="formGrid"><label class="field"><span>Quantità</span><input id="stkQty" inputmode="decimal"></label><label class="field"><span>Unità</span><input id="stkUnit" value="g"></label></div><button class="primary big" id="saveStock">Salva</button>`);
      document.addEventListener("click",async function one(e){if(e.target?.id==="saveStock"){document.removeEventListener("click",one);await gas("api_saveFoodStock9",{name:$("#stkName").value,qty:$("#stkQty").value,unit:$("#stkUnit").value});closeModal9();nutritionPro9()}},{once:false});
      $("#findFoodAlt9").onclick=async()=>{const r=await gas("api_getMealAlternatives9",{name:$("#altFoodName").value,kcal:$("#altFoodKcal").value,qty:100});$("#foodAltResults9").innerHTML=(r.alternatives||[]).map(x=>`<div class="dayDetailItem"><div>🥣</div><div><b>${esc(x.nome)}</b><span>${x.kcal100} kcal/100g · P ${x.p100}</span></div></div>`).join("")};
    }

    async function notifications9(){
      const r=await gas("api_refreshSmartNotifications9"), arr=r.notifications||[];
      layout(`<div class="viewTitle"><h1>Centro notifiche</h1><div class="muted">Reminder intelligenti ordinati per priorità.</div></div>
        ${arr.map(n=>`<div class="card priority-${esc(n.priority||"medium")}" style="margin-bottom:8px"><div class="sectionTitle" style="margin:0"><h3>${esc(n.title)}</h3><button class="secondary" data-archive-n="${esc(n.notificationId)}">Archivia</button></div><p class="muted">${esc(n.body||"")}</p></div>`).join("")||'<div class="card muted">Nessuna notifica attiva.</div>'}
        <button class="secondary big" style="margin-top:12px" onclick="proLab9()">← PT-PRO 10 Pro</button>`);
      document.querySelectorAll("[data-archive-n]").forEach(b=>b.onclick=async()=>{await gas("api_archiveNotification9",b.dataset.archiveN);notifications9()});
    }

    async function integrity9(){
      layout(`<div class="loading"><div><div class="spinner"></div>Controllo database…</div></div>`);
      const r=await gas("api_checkDatabaseIntegrity9");
      layout(`<div class="viewTitle"><h1>Integrità database</h1><div class="muted">Controllo struttura, riferimenti e duplicati.</div></div>
        <div class="card"><div class="heroValue">${r.score}/100</div><span class="muted">Database health score</span></div>
        <div style="margin-top:10px">${r.issues.map(i=>`<div class="card" style="margin-bottom:7px"><b>${i.level==="error"?"❌":"⚠️"} ${esc(i.area)}</b><div class="muted">${esc(i.message)}</div></div>`).join("")||'<div class="card">✅ Nessun problema rilevato.</div>'}</div>
        <button class="secondary big" style="margin-top:12px" onclick="safety9()">← Sicurezza dati</button>`);
    }

    async function safety9(){
      const trash=(await gas("api_getTrash9")).items||[], logs=(await gas("api_getTechLog9")).logs||[];
      layout(`<div class="viewTitle"><h1>Sicurezza dati</h1><div class="muted">Controlli tecnici e protezione modifiche.</div></div>
        <div class="proGrid"><button class="proTile" onclick="integrity9()"><i>🧪</i><b>Controllo integrità</b><span>Verifica fogli e riferimenti</span></button><button class="proTile" id="cleanTrash9"><i>🗑️</i><b>Cestino 30 giorni</b><span>${trash.length} elementi protetti</span></button></div>
        ${trash.length?`<div class="card" style="margin-top:10px"><h3>Elementi recuperabili</h3>${trash.slice(0,20).map(t=>`<div class="dayDetailItem"><div>🗑️</div><div style="flex:1"><b>${esc(t.entityType)} · ${esc(t.entityId)}</b><span>Scade ${esc(t.expiresAt)}</span></div><button class="secondary" data-restore-trash="${esc(t.trashId)}">Ripristina</button></div>`).join("")}</div>`:""}
        <div class="card" style="margin-top:10px"><h3>Log tecnico</h3>${logs.slice(0,10).map(l=>`<div class="dayDetailItem"><div>🧾</div><div><b>${esc(l.area)} · ${esc(l.level)}</b><span>${esc(l.message)} · ${esc(l.date)}</span></div></div>`).join("")||'<span class="muted">Nessun errore registrato.</span>'}</div>
        <button class="secondary big" style="margin-top:12px" onclick="proLab9()">← PT-PRO 10 Pro</button>`);
      $("#cleanTrash9").onclick=async()=>{await gas("api_emptyExpiredTrash9");toast("Cestino scaduto ripulito ✓");safety9()};
      document.querySelectorAll("[data-restore-trash]").forEach(b=>b.onclick=async()=>{try{await gas("api_restoreTrash9",b.dataset.restoreTrash);toast("Elemento ripristinato ✓");safety9()}catch(e){toast(e.message)}});
    }

    async function plansPro9(){
      const snap=await gas("api_adminSnapshot"), templates=(await gas("api_getTemplates9")).templates||[];
      layout(`<div class="viewTitle"><h1>Schede Pro</h1><div class="muted">Import/export, duplicazione progressiva e template.</div></div>
        <div class="card"><h3>Duplica con progressione</h3><label class="field"><span>Scheda</span><select id="dpPlan">${(snap.plans||[]).map(p=>`<option value="${esc(p.schedaId)}">${esc(p.titolo)}</option>`).join("")}</select></label><div class="formGrid"><label class="field"><span>Carico +%</span><input id="dpLoad" value="2.5"></label><label class="field"><span>Serie +/-</span><input id="dpSets" value="0"></label></div><button class="primary big" id="dupPlan9">Crea fase successiva</button></div>
        <div class="card" style="margin-top:10px"><h3>Template</h3>${templates.map(t=>`<button class="searchResult" data-template9="${t.id}"><b>${esc(t.name)}</b><span>${t.days.length} giorni · ${esc(t.days.join(" · "))}</span></button>`).join("")}</div>
        <div class="card" style="margin-top:10px"><h3>Import / Export JSON</h3><label class="field"><span>Scheda da esportare</span><select id="expPlan9">${(snap.plans||[]).map(p=>`<option value="${esc(p.schedaId)}">${esc(p.titolo)}</option>`).join("")}</select></label><button class="secondary big" id="exportPlan9">Esporta JSON</button><label class="field" style="margin-top:10px"><span>Importa JSON</span><textarea id="importJson9" rows="8"></textarea></label><button class="secondary big" id="importPlan9">Importa scheda</button></div>
        <button class="secondary big" style="margin-top:12px" onclick="proLab9()">← PT-PRO 10 Pro</button>`);
      $("#dupPlan9").onclick=async()=>{await gas("api_duplicatePlanProgression9",{schedaId:$("#dpPlan").value,loadPct:$("#dpLoad").value,setAdd:$("#dpSets").value});toast("Fase successiva creata ✓")};
      document.querySelectorAll("[data-template9]").forEach(b=>b.onclick=async()=>{await gas("api_createTemplatePlan9",{templateId:b.dataset.template9});toast("Template creato ✓")});
      $("#exportPlan9").onclick=async()=>{const r=await gas("api_exportPlan9",$("#expPlan9").value);const blob=new Blob([r.json],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=r.fileName;a.click();URL.revokeObjectURL(a.href)};
      $("#importPlan9").onclick=async()=>{await gas("api_importPlan9",{json:$("#importJson9").value});toast("Scheda importata ✓")};
    }

    async function coachPro9(){
      const r=await gas("api_coachDashboard9"), a=r.athletes||[];
      layout(`<div class="viewTitle"><h1>Coach Pro</h1><div class="muted">Ultima attività, alert e controllo atleta.</div></div>
        ${a.map(x=>`<div class="card" style="margin-bottom:8px"><div class="sectionTitle" style="margin:0"><h3>${esc(x.nome||x.name||x.userId||"Atleta")}</h3><span>${x.alert?esc(x.alert):"Attivo"}</span></div><div class="muted">Ultimo workout: ${esc(x.lastWorkout||"—")}</div><div class="workoutTools"><button class="secondary" data-coachnote="${esc(x.userId||x.athleteUserId||"")}">Nota privata</button><button class="secondary" data-coachperm="${esc(x.userId||x.athleteUserId||"")}">Permessi</button></div></div>`).join("")||'<div class="card muted">Nessun atleta configurato.</div>'}
        <button class="secondary big" style="margin-top:12px" onclick="proLab9()">← PT-PRO 10 Pro</button>`);
      document.querySelectorAll("[data-coachnote]").forEach(b=>b.onclick=()=>coachNoteEditor9(b.dataset.coachnote));
      document.querySelectorAll("[data-coachperm]").forEach(b=>b.onclick=()=>coachPermEditor9(b.dataset.coachperm));
    }
    function coachNoteEditor9(aid){modal9("📝 Nota privata Coach",`<textarea id="coachNoteText9" rows="7" placeholder="Nota visibile solo al coach"></textarea><button class="primary big" id="saveCoachNote9">Salva nota</button>`);$("#saveCoachNote9").onclick=async()=>{await gas("api_saveCoachNote9",{athleteUserId:aid,note:$("#coachNoteText9").value,private:true});closeModal9();toast("Nota Coach salvata ✓")}}
    async function coachPermEditor9(aid){const r=await gas("api_getCoachPermissions9",aid),p=r.permissions||{};modal9("🔐 Permessi atleta",`${[["canEditPlan","Modifica scheda"],["canEditNutrition","Modifica nutrizione"],["canEditExercises","Modifica esercizi"],["canDelete","Eliminazioni"]].map(([k,l])=>`<label class="field"><span>${l}</span><select id="${k}"><option value="1" ${String(p[k])==="TRUE"?"selected":""}>Consentito</option><option value="0" ${String(p[k])!=="TRUE"?"selected":""}>Bloccato</option></select></label>`).join("")}<button class="primary big" id="savePerm9">Salva permessi</button>`);$("#savePerm9").onclick=async()=>{await gas("api_saveCoachPermissions9",{athleteUserId:aid,canEditPlan:$("#canEditPlan").value==="1",canEditNutrition:$("#canEditNutrition").value==="1",canEditExercises:$("#canEditExercises").value==="1",canDelete:$("#canDelete").value==="1"});closeModal9();toast("Permessi salvati ✓")}}

    // Ricerca globale disponibile da qualsiasi schermata con Ctrl/Cmd+K.
    document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==="k"){e.preventDefault();globalSearch9()}});
    document.addEventListener("click",e=>{if(e.target?.id==="globalSearchBtn")globalSearch9()});


    /* =========================================================
       CALENDARIO SMART COMPLETO
       ========================================================= */
    let smartCalendarMonth=null;
    let smartCalendarDate=null;

    async function calendarManager(dateStr){
      state.view="more";
      if(dateStr) smartCalendarDate=String(dateStr).slice(0,7)+"-01";
      if(!smartCalendarDate) smartCalendarDate=new Date().toISOString().slice(0,7)+"-01";
      layout(`<div class="loading"><div><div class="spinner"></div>Compongo Calendario Smart…</div></div>`);
      try{
        smartCalendarMonth=await gas("api_getSmartCalendarMonth",{dateStr:smartCalendarDate});
        renderSmartCalendar();
      }catch(e){toast(e.message);more()}
    }

    function shiftSmartCalendarMonth(delta){
      const p=smartCalendarDate.split("-").map(Number);
      const d=new Date(p[0],p[1]-1+delta,1);
      smartCalendarDate=calendarYmdLocal(d);
      calendarManager(smartCalendarDate);
    }

    function renderSmartCalendar(){
      const r=smartCalendarMonth;
      const today=new Date().toISOString().slice(0,10);
      const monthDate=new Date(r.year,r.month-1,1);
      const title=monthDate.toLocaleDateString("it-IT",{month:"long",year:"numeric"});
      layout(`
        <div class="viewTitle"><h1>Calendario Smart</h1><div class="muted">Allenamenti, programmazione, misure, nutrizione, foto e segnali Coach in un'unica agenda.</div></div>
        <div class="card">
          <div class="smartCalendarHead">
            <button class="secondary" id="scPrev">←</button>
            <div style="text-align:center"><b style="text-transform:capitalize">${esc(title)}</b><div class="muted">tocca un giorno per vedere tutto</div></div>
            <button class="secondary" id="scNext">→</button>
          </div>
          <div class="smartCalGrid">
            ${r.days.map(d=>{
              const types=[...new Set(d.items.map(x=>x.type==="coach"?"deload":x.type))];
              const label=d.items[0]?.title||"";
              return `<button class="smartCalDay ${d.date===today?"today":""}" data-smart-day="${d.date}"><b>${d.day}</b><div class="smartCalDots">${types.slice(0,6).map(t=>`<i class="smartDot ${esc(t)}"></i>`).join("")}</div>${label?`<span class="smartCalLabel">${esc(label)}</span>`:""}</button>`;
            }).join("")}
          </div>
          <div class="monthActions" style="margin-top:12px"><button class="secondary" id="scAdd">+ Programma workout</button><button class="primary" id="scAuto">✨ Auto programma</button></div>
        </div>
        <div id="smartDayDetail" style="margin-top:12px"></div>
        <div style="margin-top:12px"><button class="secondary big" id="scBack">← Centro controllo</button></div>`);
      $("#scPrev").onclick=()=>shiftSmartCalendarMonth(-1);
      $("#scNext").onclick=()=>shiftSmartCalendarMonth(1);
      $("#scAdd").onclick=()=>calendarEventEditor(null);
      $("#scAuto").onclick=calendarAutoEditor;
      $("#scBack").onclick=more;
      document.querySelectorAll("[data-smart-day]").forEach(b=>b.onclick=()=>showSmartCalendarDay(b.dataset.smartDay));
    }

    function showSmartCalendarDay(date){
      const d=smartCalendarMonth?.days?.find(x=>String(x.date)===String(date));
      const box=$("#smartDayDetail"); if(!box||!d)return;
      box.innerHTML=`
        <div class="card">
          <div class="sectionTitle" style="margin:0 0 6px"><h2>${new Date(date+"T12:00:00").toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}</h2><span>${d.items.length} elementi</span></div>
          ${d.items.length?d.items.map(x=>`<div class="dayDetailItem"><div class="dayDetailIcon">${x.icon||"•"}</div><div><b>${esc(x.title||"")}</b><span>${esc(x.subtitle||"")}</span></div></div>`).join(""):`<span class="muted">Nessuna attività registrata.</span>`}
        </div>`;
      box.scrollIntoView({behavior:"smooth",block:"nearest"});
    }

    /* =========================================================
       EXPORT / BACKUP TOTALE
       ========================================================= */
    function exportDataCenter(){
      state.view="more";
      layout(`
        <div class="viewTitle"><h1>Esporta i miei dati</h1><div class="muted">Crea un backup completo e leggibile di PT-PRO.</div></div>
        <div class="card exportHero">
          <div class="eyebrow">BACKUP TOTALE</div>
          <h2 style="margin:8px 0">Un archivio ZIP con tutti i tuoi dati</h2>
          <p class="muted">Include profilo, misure, sessioni, serie, schede, esercizi, integrazione, dieta, calendario, foto e piani Smart. Troverai un JSON completo e diversi CSV.</p>
          <button class="primary big" id="exportNow">📦 Crea esportazione</button>
        </div>
        <div id="exportResult" style="margin-top:12px"></div>
        <div style="margin-top:12px"><button class="secondary big" id="exportBack">← Centro controllo</button></div>`);
      $("#exportBack").onclick=more;
      $("#exportNow").onclick=async()=>{
        try{
          $("#exportNow").disabled=true;$("#exportNow").textContent="Creo il backup…";
          const r=await gas("api_exportAllData");
          $("#exportResult").innerHTML=`<div class="card"><b>✅ Esportazione pronta</b><p class="muted">${esc(r.name)} · ${Math.round((r.size||0)/1024)} KB</p><button class="primary big" id="openExport">Apri in Google Drive →</button></div>`;
          $("#openExport").onclick=()=>window.open(r.url,"_blank");
          toast("Backup completo creato ✓");
        }catch(e){toast(e.message);$("#exportNow").disabled=false;$("#exportNow").textContent="📦 Crea esportazione"}
      };
    }


    /* =========================================================
       ESERCIZI
       ========================================================= */

    async function exercises(){

      layout(`

        <div class="loading">

          <div>

            <div class="spinner"></div>

            Carico esercizi…

          </div>

        </div>

      `);


      try{

        const response =
          await gas(
            "api_getExercises"
          );


        const exercises =
          response.exercises ||
          [];


        layout(`

          <div class="viewTitle">

            <h1>
              Esercizi
            </h1>

            <div class="muted">

              ${exercises.length}
              esercizi nel database.

            </div>

          </div>


          <div class="field">

            <input
              id="exerciseSearch"
              placeholder="
                Cerca esercizio
                o gruppo muscolare…
              "
            >

          </div>


          <div id="exerciseResults" class="exerciseLibraryGrid"></div>

        `);


        function render(
          query
        ){

          const q =
            String(
              query ||
              ""
            )
            .toLowerCase();


          const filtered =
            exercises
              .filter(
                exercise => {

                  if(!q){
                    return true;
                  }


                  const text =

                    (
                      exercise.nome ||
                      ""
                    )

                    +

                    " "

                    +

                    (
                      exercise.gruppo ||
                      ""
                    )

                    +

                    " "

                    +

                    (
                      exercise.attrezzatura ||
                      ""
                    );


                  return text
                    .toLowerCase()
                    .includes(q);

                }
              )
              .slice(
                0,
                70
              );


          $("#exerciseResults")
            .innerHTML =

            filtered
              .map(
                exercise => `
                  <div class="exerciseLibraryCard">
                    ${exercise.imgUrl ? imageTag(exercise.imgUrl,"",exercise.nome) : `<div class="exerciseThumb" style="display:grid;place-items:center">🏋️</div>`}
                    <div class="exerciseLibraryText">
                      <b>${esc(exercise.nome || "")}</b>
                      <span>${esc(exercise.gruppo || "")}${exercise.attrezzatura ? " • "+esc(exercise.attrezzatura) : ""}</span>
                      ${exercise.tecnica ? `<div class="muted" style="font-size:9px;margin-top:5px">${esc(String(exercise.tecnica).slice(0,100))}</div>` : ""}
                    </div>
                  </div>
                `
              )
              .join("");

        }


        render("");


        $("#exerciseSearch")
          .oninput =
            event =>
              render(
                event.target.value
              );


      }catch(error){

        toast(
          error.message
        );

      }

    }


    /* =========================================================
       BOOT
       ========================================================= */

    async function refresh(){

      state.boot =
        await gas(
          "api_bootstrap"
        );

    }


    async function init(){

      $("#app").innerHTML = `

        <main class="app">

          <div class="loading">

            <div>

              <div class="spinner"></div>

              Avvio PT-PRO…

            </div>

          </div>

        </main>

      `;


      try{

        await refresh();

        home();


      }catch(error){

        console.error(
          error
        );


        $("#app").innerHTML = `

          <main class="app">

            <div class="card">

              <h2>
                PT-PRO
              </h2>

              <p class="muted">
                Errore durante il caricamento.
              </p>

              <p
                style="
                  color:#ff9aaa
                "
              >

                ${esc(
                  error.message
                )}

              </p>

            </div>

          </main>

        `;

      }

    }


    init();

  