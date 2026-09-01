/* =========================================================
       BACKUP SCHEDE
       ========================================================= */

    async function planBackups(){
      state.view="more";
      layout(`<div class="loading"><div><div class="spinner"></div>Carico backup…</div></div>`);
      try{
        const r=await gas("api_listPlanBackups");
        layout(`
          <div class="viewTitle"><h1>Backup schede</h1><div class="muted">Ogni scheda eliminata viene salvata automaticamente prima della cancellazione.</div></div>
          <div class="manageList">${(r.backups||[]).map(b=>`
            <div class="backupItem"><div><b>${esc(b.titolo||"Scheda")}</b><div class="muted">${fmtDate(b.createdAt)} · ${esc(b.reason||"backup")}</div></div><div class="manageActions"><button class="primary" data-brestore="${esc(b.backupId)}">Ripristina</button><button class="secondary manageDanger" data-bdel="${esc(b.backupId)}">Elimina backup</button></div></div>`).join("")||`<div class="card"><span class="muted">Nessun backup disponibile.</span></div>`}</div>
          <div style="margin-top:12px"><button class="secondary big" id="backupBack">← Centro controllo</button></div>`);
        $("#backupBack").onclick=more;
        document.querySelectorAll("[data-brestore]").forEach(b=>b.onclick=async()=>{try{const x=await gas("api_restorePlanBackup",b.dataset.brestore);toast(`Scheda ripristinata · ${x.days} giorni`);await refresh();planBackups()}catch(e){toast(e.message)}});
        document.querySelectorAll("[data-bdel]").forEach(b=>b.onclick=async()=>{if(!confirm("Eliminare definitivamente questo backup?"))return;try{await gas("api_deletePlanBackup",b.dataset.bdel);toast("Backup eliminato");planBackups()}catch(e){toast(e.message)}})
      }catch(e){toast(e.message);more()}
    }

    /* =========================================================
       REPORT MENSILE SMART COACH
       ========================================================= */

    async function monthlyCoachReport(dateStr){
      state.view="more";
      const d=dateStr||new Date().toISOString().slice(0,10);
      layout(`<div class="loading"><div><div class="spinner"></div>Genero report mensile…</div></div>`);
      try{
        const r=await gas("api_getMonthlyCoachReport",{dateStr:d});
        renderMonthlyReport(r,d);
      }catch(e){toast(e.message);more()}
    }

    function renderMonthlyReport(r,dateStr){
      const s=r.stats||{};
      layout(`
        <div class="viewTitle"><h1>Report mensile</h1><div class="muted">${esc(r.monthStart)} → ${esc(r.monthEnd)}</div></div>
        <div class="card reportHero">
          <div class="eyebrow">SMART COACH · REPORT</div>
          <h2 style="margin:8px 0">${esc(r.status||"Mese")}</h2>
          <p class="muted">${esc(r.recommendation||"")}</p>
          <div class="field" style="margin:12px 0 0"><label>Cambia mese</label><input id="reportMonth" type="month" value="${String(dateStr).slice(0,7)}"></div>
        </div>
        <div class="sectionTitle"><h2>Numeri del mese</h2></div>
        <div class="reportStats">
          <div class="reportStat"><b>${s.sessions||0}</b><span>WORKOUT</span></div>
          <div class="reportStat"><b>${s.minutes||0}′</b><span>MINUTI</span></div>
          <div class="reportStat"><b>${formatVolume(s.volume||0)}</b><span>VOLUME</span></div>
          <div class="reportStat"><b>${s.avgCompletion||0}%</b><span>COMPLETAMENTO</span></div>
          <div class="reportStat"><b>${s.prs||0}</b><span>PR</span></div>
          <div class="reportStat"><b>${s.weightDelta===null||s.weightDelta===undefined?"—":(s.weightDelta>0?"+":"")+fmtNum(s.weightDelta," kg")}</b><span>Δ PESO</span></div>
        </div>
        <div class="sectionTitle"><h2>Esercizi principali</h2><span>per volume</span></div>
        <div class="card">${(r.topExercises||[]).map((x,i)=>`<div class="historyRow"><div><b>${i+1}. ${esc(x.nome)}</b><div class="muted">${x.sets} serie · max ${fmtNum(x.maxLoad," kg")}</div></div><div style="text-align:right"><b>${formatVolume(x.volume)}</b><div class="muted">e1RM ${fmtNum(x.bestE1rm," kg")}</div></div></div>`).join("")||`<span class="muted">Nessun dato.</span>`}</div>
        <div style="margin-top:12px"><button class="secondary big" id="reportBack">← Centro controllo</button></div>
      `);
      $("#reportBack").onclick=more;
      $("#reportMonth").onchange=e=>monthlyCoachReport(e.target.value+"-01");
    }



    /* =========================================================
       SMART COACH 3.0
       ========================================================= */
    async function smartCoach3(){
      state.view="more";
      layout(`<div class="loading"><div><div class="spinner"></div>Smart Coach 3.0 sta analizzando i dati…</div></div>`);
      try{
        const r=await gas("api_getSmartCoach3");
        const base=r.base||{}, s=base.summary||{};
        layout(`
          <div class="viewTitle"><h1>Smart Coach 3.0</h1><div class="muted">Readiness, fatica, deload e prossime azioni.</div></div>
          <div class="card coach2Main">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
              <div><div class="eyebrow">READINESS</div><h2 style="margin:7px 0">${esc(r.headline)}</h2><p class="muted">${esc(s.globalAdvice||"")}</p></div>
              <div class="readinessRing" style="--p:${Math.max(0,Math.min(100,r.readiness||0))}"><b>${r.readiness||0}%</b></div>
            </div>
            ${r.deloadGlobal?`<div class="adminNotice" style="margin-top:12px">⚠️ Deload globale suggerito: riduci per una settimana volume del 30–40% e carichi del 5–10%, poi rivaluta performance e RIR.</div>`:""}
          </div>
          <div class="ultimateGrid" style="margin-top:10px">
            <div class="ultimateCard"><b>${r.fatigue||0}%</b><span>FATICA STIMATA</span></div>
            <div class="ultimateCard"><b>${esc(r.readinessLabel||"—")}</b><span>PRONTEZZA</span></div>
            <div class="ultimateCard"><b>${s.progressCount||0}</b><span>ESERCIZI IN PROGRESSO</span></div>
            <div class="ultimateCard"><b>${s.plateauCount||0}</b><span>PLATEAU</span></div>
            <div class="ultimateCard"><b>${s.deloadCount||0}</b><span>DELOAD ESERCIZI</span></div>
            <div class="ultimateCard"><b>${s.volumeTrend===null||s.volumeTrend===undefined?"—":(s.volumeTrend>0?"+":"")+s.volumeTrend+"%"}</b><span>VOLUME VS SETT. PREC.</span></div>
          </div>
          <div class="sectionTitle"><h2>Prossime azioni</h2><span>per esercizio</span></div>
          <div class="manageList">${(r.nextActions||[]).map(x=>`
            <div class="manageItem">
              <div class="manageItemMain"><b>${esc(x.nome)}</b><span>${esc(x.statusLabel||"")} · recupero ${esc(x.recoveryLabel||"—")}${x.trend!==null&&x.trend!==undefined?" · trend "+(x.trend>0?"+":"")+x.trend+"%":""}</span><div class="muted" style="margin-top:5px">${esc(x.recommendation||"")}</div></div>
              <div style="text-align:right"><b>${x.suggestedLoad!==null&&x.suggestedLoad!==undefined?fmtNum(x.suggestedLoad," kg"):"—"}</b><div class="muted">prossimo carico</div></div>
            </div>`).join("")}</div>
          <div style="margin-top:12px"><button class="secondary big" id="sc3Back">← Centro controllo</button></div>`);
        $("#sc3Back").onclick=more;
      }catch(e){toast(e.message);more()}
    }

    /* =========================================================
       GENERATORE AUTOMATICO SCHEDE
       ========================================================= */
    let generatedWorkout=null;

    function workoutGenerator(){
      state.view="more";
      layout(`
        <div class="viewTitle"><h1>Generatore schede</h1><div class="muted">Crea automaticamente una base completa usando il tuo database esercizi.</div></div>
        <div class="card">
          <div class="grid2">
            <div class="field"><label>Obiettivo</label><select id="wgGoal"><option value="ipertrofia">Ipertrofia</option><option value="forza">Forza</option><option value="resistenza">Resistenza muscolare</option></select></div>
            <div class="field"><label>Giorni a settimana</label><select id="wgDays"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option></select></div>
            <div class="field"><label>Livello</label><select id="wgLevel"><option value="principiante">Principiante</option><option value="intermedio" selected>Intermedio</option><option value="avanzato">Avanzato</option></select></div>
            <div class="field"><label>Attrezzatura (facoltativa)</label><input id="wgEquip" placeholder="bilanciere, manubri, cavi"></div>
          </div>
          <button class="primary big" id="wgGenerate">✨ Genera anteprima</button>
        </div>
        <div id="wgPreview" style="margin-top:12px"></div>
        <div style="margin-top:12px"><button class="secondary big" id="wgBack">← Centro controllo</button></div>`);
      $("#wgBack").onclick=more;
      $("#wgGenerate").onclick=async()=>{
        try{
          $("#wgGenerate").textContent="Genero…";
          generatedWorkout=await gas("api_generateWorkoutPlan",{goal:$("#wgGoal").value,days:$("#wgDays").value,level:$("#wgLevel").value,equipment:$("#wgEquip").value});
          renderGeneratedWorkout();
        }catch(e){toast(e.message);$("#wgGenerate").textContent="✨ Genera anteprima"}
      };
    }

    function renderGeneratedWorkout(){
      if(!generatedWorkout)return;
      $("#wgPreview").innerHTML=`
        <div class="card">
          <div class="eyebrow">ANTEPRIMA · ${generatedWorkout.days} GIORNI</div>
          <h2 style="margin:7px 0">${esc(generatedWorkout.goal)} · ${esc(generatedWorkout.level)}</h2>
          ${(generatedWorkout.preview||[]).map(d=>`
            <div class="genDay"><b>${esc(d.name)}</b><div class="muted">${esc(d.focus)}</div>
              <div style="margin-top:7px">${(d.exercises||[]).map(e=>`<div class="genExercise"><span>${esc(e.nome)}</span><span class="muted">${e.serie}×${esc(e.ripetizioni)} · ${e.recupero_sec}s</span></div>`).join("")}</div>
            </div>`).join("")}
          <div class="field"><label>Titolo nuova scheda</label><input id="wgTitle" value="Scheda Auto · ${esc(generatedWorkout.goal)}"></div>
          <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="wgActive"> Rendi subito attiva</label>
          <div class="formActions"><button class="secondary" id="wgRedo">Rigenera</button><button class="primary" id="wgSave">Salva scheda</button></div>
        </div>`;
      $("#wgRedo").onclick=()=>$("#wgGenerate").click();
      $("#wgSave").onclick=async()=>{try{const r=await gas("api_saveGeneratedWorkoutPlan",{generated:generatedWorkout,title:$("#wgTitle").value,attiva:$("#wgActive").checked});toast("Scheda generata e salvata ✓");await refresh();dataManager("plans")}catch(e){toast(e.message)}};
    }

    /* =========================================================
       VOLUME MUSCOLARE
       ========================================================= */
    async function muscleVolume(){
      state.view="more";
      layout(`<div class="loading"><div><div class="spinner"></div>Calcolo volume muscolare…</div></div>`);
      try{
        const r=await gas("api_getMuscleVolume",{weeks:8});
        const max=Math.max(1,...(r.groups||[]).map(x=>x.volume||0));
        layout(`
          <div class="viewTitle"><h1>Volume muscolare</h1><div class="muted">Media e bilanciamento delle ultime ${r.weeks} settimane.</div></div>
          <div class="card">
            ${(r.groups||[]).map(g=>`
              <div class="muscleRow">
                <div><b style="text-transform:capitalize">${esc(g.group)}</b><div class="muted">${g.weeklySets} serie/settimana · ${g.exercises} esercizi</div></div>
                <div class="muscleBar"><span style="width:${Math.max(3,Math.round(g.volume/max*100))}%"></span></div>
                <span class="coachBadge ${g.status==="high"?"deload":g.status==="low"?"plateau":"progress"}">${esc(g.label)}</span>
              </div>`).join("")||`<span class="muted">Servono allenamenti registrati.</span>`}
          </div>
          <div class="adminNotice" style="margin-top:12px">Le soglie sono indicative: PT-PRO segnala meno di 6 o più di 20 serie settimanali per gruppo, ma il volume ideale dipende da esercizi, intensità e recupero.</div>
          <div style="margin-top:12px"><button class="secondary big" id="mvBack">← Centro controllo</button></div>`);
        $("#mvBack").onclick=more;
      }catch(e){toast(e.message);more()}
    }

    /* =========================================================
       FOTO PROGRESSI
       ========================================================= */
    async function progressPhotos(){
      state.view="more";
      layout(`<div class="loading"><div><div class="spinner"></div>Carico foto progressi…</div></div>`);
      try{
        const r=await gas("api_getProgressPhotos");
        layout(`
          <div class="viewTitle"><h1>Foto progressi</h1><div class="muted">Confronta il fisico nel tempo insieme a peso e misure.</div></div>
          <div class="card">
            <div class="grid2">
              <div class="field"><label>Data</label><input id="phDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
              <div class="field"><label>Posa</label><select id="phType"><option value="front">Frontale</option><option value="side">Laterale</option><option value="back">Posteriore</option><option value="other">Altro</option></select></div>
              <div class="field"><label>Peso (facoltativo)</label><input id="phWeight" inputmode="decimal"></div>
              <div class="field"><label>Foto</label><input id="phFile" type="file" accept="image/*"></div>
            </div>
            <div class="field"><label>Note</label><input id="phNote"></div>
            <button class="primary big" id="phUpload">📸 Carica foto</button>
          </div>
          <div class="sectionTitle"><h2>Storico</h2><span>${(r.photos||[]).length} foto</span></div>
          <div class="photoGrid">${(r.photos||[]).map(p=>`
            <div class="photoCard">
              <img loading="lazy" src="${esc(p.thumbUrl||p.url||"")}" alt="Progressi" onerror="this.style.display='none'">
              <div class="photoMeta"><b>${fmtDate(p.data)} · ${esc(p.tipo||"")}</b><span>${p.peso_kg?fmtNum(p.peso_kg," kg")+" · ":""}${esc(p.note||"")}</span><button class="secondary manageDanger" data-phdel="${esc(p.photoId)}" style="margin-top:7px">Elimina</button></div>
            </div>`).join("")||`<div class="card"><span class="muted">Nessuna foto caricata.</span></div>`}</div>
          <div style="margin-top:12px"><button class="secondary big" id="phBack">← Centro controllo</button></div>`);
        $("#phBack").onclick=more;
        $("#phUpload").onclick=async()=>{
          const file=$("#phFile").files[0]; if(!file){toast("Seleziona una foto");return}
          if(file.size>8*1024*1024){toast("Foto troppo grande · max 8 MB");return}
          const reader=new FileReader();
          reader.onload=async()=>{try{$("#phUpload").textContent="Carico…";await gas("api_uploadProgressPhoto",{dataUrl:reader.result,data:$("#phDate").value,tipo:$("#phType").value,peso_kg:$("#phWeight").value,note:$("#phNote").value});toast("Foto salvata ✓");progressPhotos()}catch(e){toast(e.message);$("#phUpload").textContent="📸 Carica foto"}};
          reader.readAsDataURL(file);
        };
        document.querySelectorAll("[data-phdel]").forEach(b=>b.onclick=async()=>{if(!confirm("Eliminare questa foto?"))return;try{await gas("api_deleteProgressPhoto",b.dataset.phdel);toast("Foto eliminata");progressPhotos()}catch(e){toast(e.message)}})
      }catch(e){toast(e.message);more()}
    }

    /* =========================================================
       NUTRIZIONE ADATTIVA
       ========================================================= */
    async function adaptiveNutrition(){
      state.view="more";
      layout(`
        <div class="viewTitle"><h1>Nutrizione adattiva</h1><div class="muted">PT-PRO confronta il trend del peso con l'obiettivo e suggerisce una piccola correzione calorica.</div></div>
        <div class="card">
          <div class="field"><label>Obiettivo</label><select id="anGoal"><option value="mantenimento">Mantenimento</option><option value="massa">Massa controllata</option><option value="definizione">Definizione</option></select></div>
          <button class="primary big" id="anRun">Analizza trend</button>
        </div>
        <div id="anResult" style="margin-top:12px"></div>
        <div style="margin-top:12px"><button class="secondary big" id="anBack">← Centro controllo</button></div>`);
      $("#anBack").onclick=more;
      $("#anRun").onclick=async()=>{try{
        const r=await gas("api_getAdaptiveNutritionAdvice",{goal:$("#anGoal").value});
        if(!r.enoughData){$("#anResult").innerHTML=`<div class="card"><b>Dati insufficienti</b><p class="muted">${esc(r.reason)}</p></div>`;return}
        $("#anResult").innerHTML=`
          <div class="card">
            <span class="coach2Status ${r.kcalDelta===0?"good":"mid"}">${esc(r.status)}</span>
            <h2 style="margin:10px 0">${r.kcalDelta>0?"+":""}${r.kcalDelta} kcal/die</h2>
            <p class="muted">${esc(r.reason)}</p>
            <div class="ultimateGrid">
              <div class="ultimateCard"><b>${fmtNum(r.startWeight," kg")}</b><span>PESO INIZIALE</span></div>
              <div class="ultimateCard"><b>${fmtNum(r.endWeight," kg")}</b><span>PESO ATTUALE</span></div>
              <div class="ultimateCard"><b>${r.weeklyPct>0?"+":""}${r.weeklyPct}%</b><span>VARIAZIONE/SETT.</span></div>
              <div class="ultimateCard"><b>${r.suggestedKcal?fmtNum(r.suggestedKcal)+" kcal":"—"}</b><span>NUOVO TARGET</span></div>
            </div>
          </div>
          <div class="adminNotice" style="margin-top:10px">Modifiche piccole e progressive. La funzione non sostituisce il parere di un professionista della nutrizione.</div>`;
      }catch(e){toast(e.message)}};
    }

    /* =========================================================
       DASHBOARD ANNUALE
       ========================================================= */
    async function annualDashboard(year){
      state.view="more";
      const y=year||new Date().getFullYear();
      layout(`<div class="loading"><div><div class="spinner"></div>Costruisco dashboard ${y}…</div></div>`);
      try{
        const r=await gas("api_getAnnualDashboard",{year:y});
        const max=Math.max(1,...r.months.map(m=>m.workouts));
        layout(`
          <div class="viewTitle"><h1>Dashboard annuale</h1><div class="muted">Tutto il tuo ${r.year} in una schermata.</div></div>
          <div class="card">
            <div class="grid2"><div class="field"><label>Anno</label><input id="adYear" type="number" value="${r.year}"></div><div class="field"><label>Variazione peso</label><div style="padding:12px 0;font-weight:850">${r.weightDelta===null?"—":(r.weightDelta>0?"+":"")+fmtNum(r.weightDelta," kg")}</div></div></div>
            <div class="ultimateGrid">
              <div class="ultimateCard"><b>${r.total.workouts}</b><span>WORKOUT</span></div>
              <div class="ultimateCard"><b>${r.total.minutes}′</b><span>MINUTI</span></div>
              <div class="ultimateCard"><b>${formatVolume(r.total.volume)}</b><span>VOLUME</span></div>
              <div class="ultimateCard"><b>${r.total.sets}</b><span>SERIE</span></div>
              <div class="ultimateCard"><b>${r.total.prs}</b><span>PR</span></div>
              <div class="ultimateCard"><b>${r.weightEnd?fmtNum(r.weightEnd," kg"):"—"}</b><span>PESO FINALE</span></div>
            </div>
          </div>
          <div class="sectionTitle"><h2>Workout per mese</h2></div>
          <div class="card"><div class="yearBars">${r.months.map(m=>`<div class="yearBarCol"><div class="yearBar" style="height:${Math.max(3,Math.round(m.workouts/max*140))}px" title="${m.workouts} workout"></div><span>${esc(m.label)}</span></div>`).join("")}</div></div>
          <div class="sectionTitle"><h2>Dettaglio mesi</h2></div>
          <div class="card">${r.months.map(m=>`<div class="historyRow"><div><b>${esc(m.label)}</b><div class="muted">${m.workouts} workout · ${m.minutes}′ · ${m.sets} serie</div></div><div style="text-align:right"><b>${formatVolume(m.volume)}</b><div class="muted">${m.prs} PR</div></div></div>`).join("")}</div>
          <div style="margin-top:12px"><button class="secondary big" id="annualBack">← Centro controllo</button></div>`);
        $("#annualBack").onclick=more;
        $("#adYear").onchange=e=>annualDashboard(Number(e.target.value));
      }catch(e){toast(e.message);more()}
    }

    /* =========================================================
       MODALITÀ COACH
       ========================================================= */
    async function coachMode(){
      state.view="more";
      layout(`<div class="loading"><div><div class="spinner"></div>Carico atleti…</div></div>`);
      try{
        const r=await gas("api_coachListAthletes");
        layout(`
          <div class="viewTitle"><h1>Modalità Coach</h1><div class="muted">Gestisci più atleti dallo stesso PT-PRO.</div></div>
          <div class="manageToolbar"><div><b>${r.athletes.length} atleti</b><div class="muted">${r.currentUserId===r.personalUserId?"Stai usando il profilo personale":"Stai lavorando su un atleta"}</div></div><div class="manageActions"><button class="secondary" id="coachPersonal">👤 Mio profilo</button><button class="primary" id="coachAdd">+ Atleta</button></div></div>
          <div class="athleteGrid">${r.athletes.map(a=>`
            <div class="athleteCard">
              <div class="athleteTop">${a.fotoUrl?`<img class="athleteAvatar" src="${esc(a.fotoUrl)}" onerror="this.style.display='none'">`:`<div class="athleteAvatar">${esc((a.nome||"A")[0].toUpperCase())}</div>`}<div><b>${esc(a.nome)}</b><div class="muted">${esc(a.planTitle||"Nessuna scheda")} · ${a.totalSessions} sessioni</div></div></div>
              <div class="formActions"><button class="secondary" data-athassign="${esc(a.userId)}">Scheda</button><button class="secondary" data-athswitch="${esc(a.userId)}">Apri atleta</button><button class="secondary manageDanger" data-athdel="${esc(a.userId)}">Elimina</button></div>
            </div>`).join("")||`<div class="card"><span class="muted">Nessun atleta. Crea il primo.</span></div>`}</div>
          <div style="margin-top:12px"><button class="secondary big" id="coachBack">← Centro controllo</button></div>`);
        $("#coachBack").onclick=more;
        $("#coachPersonal").onclick=async()=>{try{await gas("api_switchAthlete",r.personalUserId);await refresh();toast("Profilo personale attivo");home()}catch(e){toast(e.message)}};
        $("#coachAdd").onclick=()=>coachAthleteEditor(null,r);
        document.querySelectorAll("[data-athswitch]").forEach(b=>b.onclick=async()=>{try{await gas("api_switchAthlete",b.dataset.athswitch);await refresh();toast("Atleta selezionato ✓");home()}catch(e){toast(e.message)}});
        document.querySelectorAll("[data-athassign]").forEach(b=>b.onclick=()=>coachAssignEditor(b.dataset.athassign,r));
        document.querySelectorAll("[data-athdel]").forEach(b=>b.onclick=async()=>{if(!confirm("Eliminare questo atleta?"))return;try{const x=await gas("api_coachDeleteAthlete",b.dataset.athdel);if(x.blocked){alert(x.reason);return}toast("Atleta eliminato");coachMode()}catch(e){toast(e.message)}})
      }catch(e){toast(e.message);more()}
    }

    function coachAthleteEditor(a,r){
      a=a||{};
      layout(`<div class="viewTitle"><h1>Nuovo atleta</h1></div><div class="card">
        <div class="field"><label>Nome</label><input id="athName" value="${esc(a.nome||"")}"></div>
        <div class="grid2"><div class="field"><label>Altezza cm</label><input id="athHeight" inputmode="decimal"></div><div class="field"><label>Data nascita</label><input id="athBirth" type="date"></div></div>
        <div class="field"><label>Foto URL</label><input id="athPhoto"></div><div class="field"><label>Note</label><textarea id="athNotes" rows="3"></textarea></div>
        <div class="formActions"><button class="secondary" id="athCancel">Annulla</button><button class="primary" id="athSave">Salva atleta</button></div></div>`);
      $("#athCancel").onclick=coachMode;
      $("#athSave").onclick=async()=>{try{await gas("api_coachSaveAthlete",{nome:$("#athName").value,altezza_cm:$("#athHeight").value,dataNascita:$("#athBirth").value,fotoUrl:$("#athPhoto").value,note:$("#athNotes").value});toast("Atleta creato ✓");coachMode()}catch(e){toast(e.message)}};
    }

    function coachAssignEditor(athleteId,r){
      const athlete=r.athletes.find(a=>String(a.userId)===String(athleteId));
      layout(`<div class="viewTitle"><h1>Assegna scheda</h1><div class="muted">${esc(athlete?.nome||"Atleta")}</div></div><div class="card">
        <div class="field"><label>Scheda</label><select id="athPlan">${r.plans.map(p=>`<option value="${esc(p.schedaId)}" ${String(p.schedaId)===String(athlete?.planId)?"selected":""}>${esc(p.titolo||p.schedaId)}</option>`).join("")}</select></div>
        <div class="formActions"><button class="secondary" id="aaCancel">Annulla</button><button class="primary" id="aaSave">Assegna</button></div></div>`);
      $("#aaCancel").onclick=coachMode;
      $("#aaSave").onclick=async()=>{try{await gas("api_coachAssignPlan",{athleteUserId:athleteId,schedaId:$("#athPlan").value});toast("Scheda assegnata ✓");coachMode()}catch(e){toast(e.message)}};
    }

    /* =========================================================
       INSTALLAZIONE / USO COME APP
       ========================================================= */
    function installGuide(){
      state.view="more";
      layout(`
        <div class="viewTitle"><h1>PT-PRO sul telefono</h1><div class="muted">Puoi aprirla dalla schermata Home quasi come un'app nativa.</div></div>
        <div class="installBox">
          <h2>📱 Aggiungi alla schermata Home</h2>
          <p class="muted"><b>Android / Chrome:</b> apri il menu ⋮ e scegli “Aggiungi a schermata Home” o “Installa app”.</p>
          <p class="muted"><b>iPhone / Safari:</b> premi Condividi ⎋ e poi “Aggiungi alla schermata Home”.</p>
          <p class="muted">PT-PRO mantiene già un'interfaccia mobile-first. La Web App Apps Script non garantisce un vero funzionamento offline, quindi i salvataggi workout richiedono connessione.</p>
        </div>
        <div class="sectionTitle"><h2>Consigli</h2></div>
        <div class="card"><div class="historyRow"><div><b>Schermo intero</b><div class="muted">L'icona Home riduce la sensazione di usare il browser.</div></div><span>✓</span></div><div class="historyRow"><div><b>Connessione</b><div class="muted">Mantienila durante workout e salvataggi.</div></div><span>☁️</span></div><div class="historyRow"><div><b>Backup schede</b><div class="muted">PT-PRO protegge automaticamente le schede prima dell'eliminazione.</div></div><span>🛡️</span></div></div>
        <div style="margin-top:12px"><button class="secondary big" id="installBack">← Centro controllo</button></div>`);
      $("#installBack").onclick=more;
    }



    /* =========================================================
       HOME ADATTIVA
       ========================================================= */
    async function loadAdaptiveHome(){
      const box=$("#adaptiveHome");
      if(!box)return;
      box.innerHTML=`<div class="card adaptiveHome"><span class="muted">PT-PRO sta adattando la Home a oggi…</span></div>`;
      try{
        const r=await gas("api_getAdaptiveHome");
        box.innerHTML=`
          <div class="card adaptiveHome">
            <div class="adaptiveTop">
              <div class="adaptiveMain">
                <div class="adaptiveIcon">${r.icon||"✦"}</div>
                <div><div class="eyebrow">OGGI · HOME ADATTIVA</div><h3>${esc(r.title||"PT-PRO")}</h3><div class="muted">${esc(r.text||"")}</div></div>
              </div>
              <button class="primary" id="adaptiveAction">${r.mode==="training"?"Apri →":r.mode==="recovery"?"Vai →":"Vedi →"}</button>
            </div>
            ${(r.readiness!==null&&r.readiness!==undefined)?`<div class="coachMetrics" style="margin-top:11px"><div class="coachMetric"><b>${r.readiness}%</b><span>Readiness</span></div><div class="coachMetric"><b>${r.fatigue??"—"}%</b><span>Fatica</span></div><div class="coachMetric"><b>${r.measureAge===null?"—":r.measureAge+"g"}</b><span>Ultima misura</span></div></div>`:""}
            ${(r.reminders||[]).length?`<div class="adaptiveReminders">${r.reminders.map((x,i)=>`<button class="adaptiveReminder" data-arem="${i}"><b>${x.icon||"•"} ${esc(x.title)}</b><span>${esc(x.text)}</span></button>`).join("")}</div>`:""}
          </div>`;
        $("#adaptiveAction").onclick=()=>{
          if(r.action==="workout"&&r.giornoId) openWorkout(r.giornoId);
          else if(r.action==="nutrition") go("nutrition");
          else more();
        };
        document.querySelectorAll("[data-arem]").forEach(b=>b.onclick=()=>{
          const x=r.reminders[Number(b.dataset.arem)];
          if(!x)return;
          if(x.action==="measure") measureForm();
          else if(x.action==="coach") smartCoach3();
          else more();
        });
      }catch(e){
        box.innerHTML="";
        console.log("Adaptive home:",e);
      }
    }

    /* =========================================================
       WORKOUT SMART · PRESCRIZIONE LIVE
       ========================================================= */
    function playRecoverySound(){
      try{
        const Ctx=window.AudioContext||window.webkitAudioContext;
        if(!Ctx)return;
        const ctx=new Ctx();
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);
        o.frequency.setValueAtTime(660,ctx.currentTime);
        o.frequency.setValueAtTime(880,ctx.currentTime+.12);
        g.gain.setValueAtTime(.08,ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.35);
        o.start();o.stop(ctx.currentTime+.36);
      }catch(e){}
    }

    // Sovrascrive la versione precedente con un riepilogo più diretto.
    async function loadSuggestion(exId){
      const box=document.getElementById("suggest_"+exId);
      if(!box)return;
      const exercise=state.workout?.exercises?.find(x=>String(x.exId)===String(exId));
      const previous=state.workout?.previous?.[String(exId)]||[];

      let targetMin=0,targetMax=0;
      const range=String(exercise?.ripetizioni||"").match(/(\d+)\s*[-–]\s*(\d+)/);
      if(range){targetMin=Number(range[1]);targetMax=Number(range[2])}
      else{
        const one=Number((String(exercise?.ripetizioni||"").match(/\d+/)||[0])[0]);
        targetMin=one;targetMax=one;
      }

      const prevText=previous.length
        ? previous.slice(0,4).map(s=>`${s.load||"—"}×${s.reps||"—"}${s.rir!==""&&s.rir!==undefined?" RIR"+s.rir:""}`).join(" · ")
        : "nessuno storico";

      try{
        const r=await gas("api_getSmartProgression",{exId,targetMin,targetMax,step:1.25});
        const targetText=targetMin&&targetMax?(targetMin===targetMax?String(targetMin):`${targetMin}-${targetMax}`):String(exercise?.ripetizioni||"");
        box.innerHTML=`
          <div class="smartSetPlan">
            <strong>🧠 Ultima volta: ${esc(prevText)}</strong>
            <div class="smartLine">Oggi suggerito: <b>${r.suggested!==null&&r.suggested!==undefined?esc(r.suggested)+" kg":"carico libero"}</b>${targetText?" × "+esc(targetText):""}${exercise?.rir?" · RIR "+esc(exercise.rir):""}</div>
            <div class="smartLine">${esc(r.reason||"Mantieni tecnica e margine.")}</div>
            ${r.suggested!==null&&r.suggested!==undefined?`<button class="secondary smartApply" data-smart-load="${esc(r.suggested)}">Usa ${esc(r.suggested)} kg</button>`:""}
          </div>`;

        const apply=box.querySelector("[data-smart-load]");
        if(apply) apply.onclick=()=>{
          const detail=box.closest(".exercise");
          detail?.querySelectorAll("[data-load]:not(:disabled)").forEach(inp=>inp.value=apply.dataset.smartLoad);
          toast("Carico suggerito applicato");
        };
      }catch(e){
        box.innerHTML=`<div class="smartSetPlan"><strong>🧠 Ultima volta: ${esc(prevText)}</strong><div class="smartLine">Suggerimento non disponibile.</div></div>`;
      }
    }


    