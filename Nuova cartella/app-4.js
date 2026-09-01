/* =========================================================
       SMART COACH 2.0
       ========================================================= */

    let coach2Cache = null;
    let coach2Filter = "all";

    async function smartCoach2(){
      state.view="more";
      layout(`<div class="loading"><div><div class="spinner"></div>Analizzo carichi, RIR e volume…</div></div>`);
      try{
        coach2Cache=await gas("api_getSmartCoach2");
        renderCoach2();
      }catch(e){
        toast(e.message);
        more();
      }
    }

    function renderCoach2(){
      const data=coach2Cache||{};
      const s=data.summary||{};
      let list=data.exercises||[];
      if(coach2Filter!=="all") list=list.filter(x=>x.status===coach2Filter || (coach2Filter==="attention" && ["deload","plateau","watch"].includes(x.status)));

      layout(`
        <div class="viewTitle"><h1>Smart Coach 3.0</h1><div class="muted">Analisi di performance, RIR, volume, recupero e progressione per esercizio.</div></div>

        <section class="coach2Hero">
          <div class="card coach2Main">
            <span class="coach2Status ${esc(s.tone||"good")}">● ${esc(s.globalStatus||"Equilibrato")}</span>
            <h2 style="margin:13px 0 7px">Indicazione del coach</h2>
            <p class="muted">${esc(s.globalAdvice||"Continua a registrare le sedute.")}</p>
            <div class="coachRecommendation">Il sistema usa i tuoi set realmente salvati. Le indicazioni sono suggerimenti di programmazione, non valutazioni mediche.</div>
          </div>
          <div class="coach2Summary">
            <div class="coach2Metric"><b>${s.progressCount||0}</b><span>IN PROGRESSO</span></div>
            <div class="coach2Metric"><b>${s.plateauCount||0}</b><span>PLATEAU</span></div>
            <div class="coach2Metric"><b>${s.deloadCount||0}</b><span>DELOAD</span></div>
            <div class="coach2Metric"><b>${s.volumeTrend===null||s.volumeTrend===undefined?"—":(s.volumeTrend>0?"+":"")+s.volumeTrend+"%"}</b><span>VOLUME VS PREV.</span></div>
          </div>
        </section>

        <div class="sectionTitle"><h2>Esercizi</h2><span>${list.length}/${(data.exercises||[]).length}</span></div>
        <div class="coachFilter">
          <button class="${coach2Filter==="all"?"primary":"secondary"}" data-c2f="all">Tutti</button>
          <button class="${coach2Filter==="attention"?"primary":"secondary"}" data-c2f="attention">⚠️ Attenzione</button>
          <button class="${coach2Filter==="progress"?"primary":"secondary"}" data-c2f="progress">↗ Progresso</button>
          <button class="${coach2Filter==="plateau"?"primary":"secondary"}" data-c2f="plateau">Plateau</button>
          <button class="${coach2Filter==="deload"?"primary":"secondary"}" data-c2f="deload">Deload</button>
        </div>

        <div style="margin-top:12px">
          ${list.length ? list.map(x=>`
            <div class="coachEx">
              <div class="coachExTop">
                <div><h3>${esc(x.nome)}</h3><div class="muted">${esc(x.gruppo||"")}${x.prescription?.giornoNome?" · "+esc(x.prescription.giornoNome):""}</div></div>
                <span class="coachBadge ${esc(x.status)}">${esc(x.statusLabel)}</span>
              </div>
              <div class="coachMiniGrid">
                <div class="coachMini"><b>${x.latest?.maxLoad?fmtNum(x.latest.maxLoad," kg"):"—"}</b><span>ULTIMO CARICO</span></div>
                <div class="coachMini"><b>${x.avgRecentRir===null||x.avgRecentRir===undefined?"—":fmtNum(x.avgRecentRir)}</b><span>RIR MEDIO</span></div>
                <div class="coachMini"><b>${x.perfTrend===null||x.perfTrend===undefined?"—":(x.perfTrend>0?"+":"")+x.perfTrend+"%"}</b><span>TREND e1RM</span></div>
                <div class="coachMini"><b>${esc(x.recoveryLabel||"—")}</b><span>RECUPERO</span></div>
              </div>
              <div class="coachRecommendation">💡 ${esc(x.recommendation)}${x.suggestedLoad!==null&&x.suggestedLoad!==undefined?` <b>→ ${fmtNum(x.suggestedLoad," kg")}</b>`:""}</div>
              <div class="formActions"><button class="secondary" data-c2detail="${esc(x.exId)}">Dettaglio</button></div>
            </div>`).join("") : `<div class="card"><span class="muted">Nessun esercizio in questa categoria.</span></div>`}
        </div>
        <div style="margin-top:12px"><button class="secondary big" id="c2Back">← Centro controllo</button></div>
      `);

      document.querySelectorAll("[data-c2f]").forEach(b=>b.onclick=()=>{coach2Filter=b.dataset.c2f;renderCoach2()});
      document.querySelectorAll("[data-c2detail]").forEach(b=>b.onclick=()=>coach2Detail(b.dataset.c2detail));
      $("#c2Back").onclick=more;
    }

    function coach2Detail(exId){
      const x=(coach2Cache?.exercises||[]).find(e=>String(e.exId)===String(exId));
      if(!x) return;
      layout(`
        <div class="viewTitle"><h1>${esc(x.nome)}</h1><div class="muted">${esc(x.gruppo||"")} · Smart Coach 3.0</div></div>
        <div class="card">
          <div class="coachExTop"><div><span class="coachBadge ${esc(x.status)}">${esc(x.statusLabel)}</span><h2 style="margin:10px 0 5px">Prossima seduta</h2></div><b>${x.suggestedLoad!==null&&x.suggestedLoad!==undefined?fmtNum(x.suggestedLoad," kg"):"—"}</b></div>
          <div class="coachRecommendation">${esc(x.recommendation)}</div>
          ${x.deload?`<div class="adminNotice" style="margin-top:10px">Deload suggerito: una seduta più leggera può aiutare a riprendere progressione. Riduci volume e carico come indicato, poi rivaluta i dati.</div>`:""}
          ${x.plateau&&!x.deload?`<div class="adminNotice" style="margin-top:10px">Plateau: il sistema ha rilevato poca variazione di performance nelle ultime sedute.</div>`:""}
        </div>

        <div class="sectionTitle"><h2>Indicatori</h2></div>
        <div class="coach2Summary">
          <div class="coach2Metric"><b>${x.latest?.bestE1rm?fmtNum(x.latest.bestE1rm," kg"):"—"}</b><span>e1RM ULTIMO</span></div>
          <div class="coach2Metric"><b>${x.latest?.volume?formatVolume(x.latest.volume):"—"}</b><span>VOLUME ULTIMO</span></div>
          <div class="coach2Metric"><b>${x.avgRecentRir===null||x.avgRecentRir===undefined?"—":fmtNum(x.avgRecentRir)}</b><span>RIR RECENTE</span></div>
          <div class="coach2Metric"><b>${x.hoursSince===null||x.hoursSince===undefined?"—":x.hoursSince+"h"}</b><span>DA ULTIMA SEDUTA</span></div>
        </div>

        <div class="sectionTitle"><h2>Ultime sedute</h2><span>${(x.recent||[]).length}</span></div>
        <div class="card">
          ${(x.recent||[]).length ? x.recent.map(r=>`
            <div class="insightSession">
              <div style="display:flex;justify-content:space-between;gap:10px"><b>${fmtDate(r.date)}</b><span class="muted">${formatVolume(r.volume)} · e1RM ${fmtNum(r.bestE1rm," kg")}</span></div>
              <div>${(r.sets||[]).map(s=>`<span class="insightSet">${fmtNum(s.load," kg")} × ${fmtNum(s.reps)}${s.rir!==""&&s.rir!==undefined?" · RIR "+fmtNum(s.rir):""}</span>`).join("")}</div>
            </div>`).join("") : `<span class="muted">Nessuno storico.</span>`}
        </div>
        <div style="margin-top:12px"><button class="secondary big" id="c2DetailBack">← Smart Coach 3.0</button></div>
      `);
      $("#c2DetailBack").onclick=renderCoach2;
    }

    /* =========================================================
       GESTIONE DATI
       ========================================================= */

    let adminCache=null;
    let adminTab="plans";

    async function dataManager(tab){
      if(tab) adminTab=tab;
      layout(`<div class="loading"><div><div class="spinner"></div>Carico gestione dati…</div></div>`);
      try{
        adminCache=await gas("api_adminSnapshot");
        renderDataManager();
      }catch(e){toast(e.message);more()}
    }

    function managerTabs(){
      const tabs=[["plans","🏋️ Schede"],["exercises","📚 Esercizi"],["integration","💊 Integrazione"],["diets","🥗 Diete"]];
      return `<div class="managerTabs">${tabs.map(t=>`<button class="${adminTab===t[0]?"primary":"secondary"}" data-adtab="${t[0]}">${t[1]}</button>`).join("")}</div>`;
    }

    function renderDataManager(){
      layout(`
        <div class="viewTitle"><h1>Gestione dati</h1><div class="muted">Crea, modifica ed elimina i contenuti principali di PT-PRO.</div></div>
        <div class="adminNotice">Le eliminazioni sono definitive. Lo storico degli allenamenti già registrati viene mantenuto, mentre la struttura della scheda eliminata viene rimossa.</div>
        ${managerTabs()}
        <div id="adminBody"></div>
        <div style="margin-top:14px"><button class="secondary big" id="adminBack">← Centro controllo</button></div>
      `);
      document.querySelectorAll("[data-adtab]").forEach(b=>b.onclick=()=>{adminTab=b.dataset.adtab;renderDataManager()});
      $("#adminBack").onclick=more;
      if(adminTab==="plans") renderAdminPlans();
      if(adminTab==="exercises") renderAdminExercises();
      if(adminTab==="integration") renderAdminIntegration();
      if(adminTab==="diets") renderAdminDiets();
    }

    function renderAdminPlans(){
      const plans=(adminCache?.plans||[]).slice().sort((a,b)=>Number(!!b.attiva)-Number(!!a.attiva));
      $("#adminBody").innerHTML=`
        <div class="manageToolbar"><div><b>Schede</b><div class="muted">${plans.length} disponibili</div></div><div class="manageActions"><button class="secondary" id="openBackups">🛡️ Backup</button><button class="primary" id="addPlan">+ Nuova scheda</button></div></div>
        <div class="manageList">${plans.map(p=>`
          <div class="manageItem">
            <div class="manageItemMain"><b>${boolUi(p.attiva)?'<span class="activeDot">●</span> ':''}${esc(p.titolo||"Scheda")}</b><span>${esc(p.fase||"")}${p.obiettivo?" · "+esc(p.obiettivo):""}</span></div>
            <div class="manageActions">
              <button class="secondary" data-planstruct="${esc(p.schedaId)}">Struttura</button>
              <button class="secondary" data-planedit="${esc(p.schedaId)}">Modifica</button><button class="secondary" data-planbackup="${esc(p.schedaId)}">Backup</button>
              ${!boolUi(p.attiva)?`<button class="secondary" data-planactive="${esc(p.schedaId)}">Attiva</button>`:""}
              <button class="secondary manageDanger" data-plandel="${esc(p.schedaId)}">Elimina</button>
            </div>
          </div>`).join("") || `<div class="card"><span class="muted">Nessuna scheda.</span></div>`}
        </div>`;
      $("#addPlan").onclick=()=>planEditor(null);$("#openBackups").onclick=planBackups;
      document.querySelectorAll("[data-planedit]").forEach(b=>b.onclick=()=>planEditor(plans.find(x=>String(x.schedaId)===b.dataset.planedit)));
      document.querySelectorAll("[data-planstruct]").forEach(b=>b.onclick=()=>planStructure(b.dataset.planstruct));
      document.querySelectorAll("[data-planbackup]").forEach(b=>b.onclick=async()=>{try{await gas("api_backupPlan",{schedaId:b.dataset.planbackup,reason:"manuale"});toast("Backup creato ✓")}catch(e){toast(e.message)}});
      document.querySelectorAll("[data-planactive]").forEach(b=>b.onclick=async()=>{try{await gas("api_adminSetActivePlan",b.dataset.planactive);toast("Scheda attivata ✓");await refresh();dataManager("plans")}catch(e){toast(e.message)}});
      document.querySelectorAll("[data-plandel]").forEach(b=>b.onclick=async()=>{const p=plans.find(x=>String(x.schedaId)===b.dataset.plandel);if(!confirm(`Eliminare definitivamente “${p?.titolo||"scheda"}” e la sua struttura?`))return;try{await gas("api_adminDeletePlan",{schedaId:b.dataset.plandel});toast("Scheda eliminata");await refresh();dataManager("plans")}catch(e){toast(e.message)}});
    }

    function boolUi(v){return v===true || ["TRUE","VERO","SI","SÌ","1"].includes(String(v||"").toUpperCase())}

    function planEditor(p){
      p=p||{};
      layout(`
        <div class="viewTitle"><h1>${p.schedaId?"Modifica scheda":"Nuova scheda"}</h1><div class="muted">Impostazioni generali del programma.</div></div>
        <div class="card">
          <div class="field"><label>Titolo</label><input id="apTitle" value="${esc(p.titolo||"")}"></div>
          <div class="grid2"><div class="field"><label>Fase</label><input id="apPhase" value="${esc(p.fase||"")}"></div><div class="field"><label>Obiettivo</label><input id="apGoal" value="${esc(p.obiettivo||"")}"></div></div>
          <div class="field"><label>Note</label><textarea id="apNotes" rows="3">${esc(p.note||"")}</textarea></div>
          <label style="display:flex;gap:8px;align-items:center"><input id="apActive" type="checkbox" ${boolUi(p.attiva)?"checked":""}> Rendi questa scheda attiva</label>
          <div class="formActions"><button class="secondary" id="apCancel">Annulla</button><button class="primary" id="apSave">Salva</button></div>
        </div>`);
      $("#apCancel").onclick=()=>dataManager("plans");
      $("#apSave").onclick=async()=>{try{await gas("api_adminSavePlan",{schedaId:p.schedaId||"",titolo:$("#apTitle").value,fase:$("#apPhase").value,obiettivo:$("#apGoal").value,note:$("#apNotes").value,attiva:$("#apActive").checked});toast("Scheda salvata ✓");await refresh();dataManager("plans")}catch(e){toast(e.message)}};
    }

    async function planStructure(schedaId){
      layout(`<div class="loading"><div><div class="spinner"></div>Carico struttura scheda…</div></div>`);
      try{
        const d=await gas("api_adminGetPlan",schedaId);
        renderPlanStructure(d);
      }catch(e){toast(e.message);dataManager("plans")}
    }

    function renderPlanStructure(d){
      const plan=d.plan||{}, days=d.days||[], exercises=d.exercises||[];
      layout(`
        <div class="viewTitle"><h1>${esc(plan.titolo||"Scheda")}</h1><div class="muted">Giorni ed esercizi della scheda.</div></div>
        <div class="manageToolbar"><div><b>${days.length} giorni</b></div><button class="primary" id="addDay">+ Giorno</button></div>
        ${days.map(day=>`
          <div class="card planDay">
            <div class="planDayHead"><div><b>${esc(day.nomeGiorno||"Allenamento")}</b><div class="muted">${esc(day.focus||"")}</div></div><div class="manageActions"><button class="secondary" data-dayedit="${esc(day.giornoId)}">Modifica</button><button class="secondary" data-dayclone="${esc(day.giornoId)}">Duplica</button><button class="secondary manageDanger" data-daydel="${esc(day.giornoId)}">Elimina</button></div></div>
            ${(day.workout||[]).map(r=>`
              <div class="workoutManageRow"><div><b>${esc(r.exNome)}</b><div class="muted">${esc(r.serie)} × ${esc(r.ripetizioni)} · ${esc(r.recupero_sec||90)}s${r.rir?" · RIR "+esc(r.rir):""}</div></div><div class="manageActions"><span class="orderButtons"><button class="secondary" data-wmove="up" data-row="${esc(r.rowId)}" data-plan="${esc(plan.schedaId)}">↑</button><button class="secondary" data-wmove="down" data-row="${esc(r.rowId)}" data-plan="${esc(plan.schedaId)}">↓</button></span><button class="secondary" data-wedit="${esc(r.rowId)}" data-day="${esc(day.giornoId)}">✏️</button><button class="secondary manageDanger" data-wdel="${esc(r.rowId)}">×</button></div></div>`).join("") || `<div class="muted" style="padding:8px 0">Nessun esercizio.</div>`}
            <div class="builderToolbar"><button class="secondary" data-wadd="${esc(day.giornoId)}">+ Singolo esercizio</button><button class="primary" data-wbatch="${esc(day.giornoId)}">☑️ Abbina più esercizi</button></div>
          </div>`).join("") || `<div class="card"><span class="muted">Aggiungi il primo giorno.</span></div>`}
        <div style="margin-top:12px"><button class="secondary big" id="structBack">← Gestione schede</button></div>
      `);
      $("#addDay").onclick=()=>dayEditor(plan.schedaId,null);
      $("#structBack").onclick=()=>dataManager("plans");
      document.querySelectorAll("[data-dayedit]").forEach(b=>b.onclick=()=>dayEditor(plan.schedaId,days.find(x=>String(x.giornoId)===b.dataset.dayedit)));
      document.querySelectorAll("[data-daydel]").forEach(b=>b.onclick=async()=>{if(!confirm("Eliminare questo giorno e gli esercizi assegnati?"))return;try{await gas("api_adminDeleteDay",b.dataset.daydel);toast("Giorno eliminato");planStructure(plan.schedaId)}catch(e){toast(e.message)}});
      document.querySelectorAll("[data-dayclone]").forEach(b=>b.onclick=async()=>{const day=days.find(x=>String(x.giornoId)===String(b.dataset.dayclone));const nome=prompt("Nome del giorno duplicato:",(day?.nomeGiorno||"Giorno")+" copia");if(!nome)return;try{await gas("api_adminCloneDay",{giornoId:b.dataset.dayclone,nomeGiorno:nome});toast("Giorno duplicato ✓");planStructure(plan.schedaId)}catch(e){toast(e.message)}});
      document.querySelectorAll("[data-wadd]").forEach(b=>b.onclick=()=>workoutRowEditor(plan.schedaId,b.dataset.wadd,null,exercises));
      document.querySelectorAll("[data-wbatch]").forEach(b=>b.onclick=()=>batchExercisePicker(plan.schedaId,b.dataset.wbatch,exercises));
      document.querySelectorAll("[data-wmove]").forEach(b=>b.onclick=async()=>{try{await gas("api_adminMoveWorkoutRow",{rowId:b.dataset.row,direction:b.dataset.wmove});planStructure(plan.schedaId)}catch(e){toast(e.message)}});
      document.querySelectorAll("[data-wedit]").forEach(b=>{b.onclick=()=>{const day=days.find(x=>String(x.giornoId)===String(b.dataset.day));const row=(day?.workout||[]).find(x=>String(x.rowId)===String(b.dataset.wedit));workoutRowEditor(plan.schedaId,b.dataset.day,row,exercises)}});
      document.querySelectorAll("[data-wdel]").forEach(b=>b.onclick=async()=>{if(!confirm("Rimuovere l'esercizio da questo giorno?"))return;try{await gas("api_adminDeleteWorkoutRow",b.dataset.wdel);toast("Esercizio rimosso");planStructure(plan.schedaId)}catch(e){toast(e.message)}});
    }

    function dayEditor(schedaId,day){
      day=day||{};
      layout(`<div class="viewTitle"><h1>${day.giornoId?"Modifica giorno":"Nuovo giorno"}</h1></div><div class="card">
        <div class="field"><label>Nome giorno</label><input id="adName" value="${esc(day.nomeGiorno||"")}"></div>
        <div class="field"><label>Focus</label><input id="adFocus" value="${esc(day.focus||"")}"></div>
        <div class="grid2"><div class="field"><label>Ordine</label><input id="adOrder" type="number" value="${esc(day.ordine||1)}"></div><div class="field"><label>Note</label><input id="adNotes" value="${esc(day.note||"")}"></div></div>
        <div class="formActions"><button class="secondary" id="adCancel">Annulla</button><button class="primary" id="adSave">Salva</button></div></div>`);
      $("#adCancel").onclick=()=>planStructure(schedaId);
      $("#adSave").onclick=async()=>{try{await gas("api_adminSaveDay",{giornoId:day.giornoId||"",schedaId,nomeGiorno:$("#adName").value,focus:$("#adFocus").value,ordine:$("#adOrder").value,note:$("#adNotes").value});toast("Giorno salvato ✓");planStructure(schedaId)}catch(e){toast(e.message)}};
    }


    function batchExercisePicker(schedaId,giornoId,exercises){
      const list=(exercises||[]).slice().sort((a,b)=>String(a.nome||"").localeCompare(String(b.nome||""),"it"));
      layout(`
        <div class="viewTitle"><h1>Abbina esercizi</h1><div class="muted">Seleziona più esercizi e aggiungili insieme al giorno.</div></div>
        <div class="card">
          <div class="field"><label>Cerca</label><input id="batchSearch" placeholder="es. petto, panca, dorso…"></div>
          <div class="grid2">
            <div class="field"><label>Serie predefinite</label><input id="batchSets" type="number" value="3"></div>
            <div class="field"><label>Ripetizioni</label><input id="batchReps" value="8-10"></div>
            <div class="field"><label>Recupero sec</label><input id="batchRest" type="number" value="90"></div>
            <div class="field"><label>RIR</label><input id="batchRir" value="2"></div>
          </div>
          <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:8px"><button class="secondary" id="batchAll">Seleziona visibili</button><span class="muted" id="batchCount">0 selezionati</span></div>
          <div class="exPicker" id="batchList"></div>
          <div class="formActions"><button class="secondary" id="batchCancel">Annulla</button><button class="primary" id="batchSave">Aggiungi selezionati</button></div>
        </div>`);

      const selected=new Set();
      let visible=[];

      const draw=q=>{
        const query=String(q||"").toLowerCase();
        visible=list.filter(x=>!query||(`${x.nome||""} ${x.gruppo||""} ${x.attrezzatura||""}`).toLowerCase().includes(query)).slice(0,120);
        $('#batchList').innerHTML=visible.map(x=>`
          <div class="exPickRow">
            <input type="checkbox" id="bp_${esc(x.exId)}" data-bpex="${esc(x.exId)}" ${selected.has(String(x.exId))?'checked':''}>
            <label for="bp_${esc(x.exId)}"><b>${esc(x.nome)}</b><span>${esc(x.gruppo||"")}${x.attrezzatura?' · '+esc(x.attrezzatura):''}</span></label>
          </div>`).join('');
        document.querySelectorAll('[data-bpex]').forEach(c=>c.onchange=()=>{if(c.checked)selected.add(String(c.dataset.bpex));else selected.delete(String(c.dataset.bpex));$('#batchCount').textContent=selected.size+' selezionati'});
      };

      draw('');
      $('#batchSearch').oninput=e=>draw(e.target.value);
      $('#batchAll').onclick=()=>{visible.forEach(x=>selected.add(String(x.exId)));draw($('#batchSearch').value);$('#batchCount').textContent=selected.size+' selezionati'};
      $('#batchCancel').onclick=()=>planStructure(schedaId);
      $('#batchSave').onclick=async()=>{
        if(!selected.size){toast('Seleziona almeno un esercizio');return}
        try{
          const r=await gas('api_adminAddExercisesToDay',{
            giornoId,
            exIds:Array.from(selected),
            serie:$('#batchSets').value,
            ripetizioni:$('#batchReps').value,
            recupero_sec:$('#batchRest').value,
            rir:$('#batchRir').value
          });
          toast(`${r.added} esercizi aggiunti${r.skipped?' · '+r.skipped+' già presenti':''}`);
          planStructure(schedaId);
        }catch(e){toast(e.message)}
      };
    }

    function workoutRowEditor(schedaId,giornoId,row,exercises){
      row=row||{};
      layout(`<div class="viewTitle"><h1>${row.rowId?"Modifica esercizio":"Aggiungi esercizio"}</h1></div><div class="card">
        <div class="field"><label>Esercizio</label><select id="awEx">${(exercises||[]).slice().sort((a,b)=>String(a.nome||"").localeCompare(String(b.nome||""),"it")).map(e=>`<option value="${esc(e.exId)}" ${String(e.exId)===String(row.exId)?"selected":""}>${esc(e.nome)}</option>`).join("")}</select></div>
        <div class="grid2"><div class="field"><label>Serie</label><input id="awSets" type="number" value="${esc(row.serie||3)}"></div><div class="field"><label>Ripetizioni</label><input id="awReps" value="${esc(row.ripetizioni||"8-10")}"></div></div>
        <div class="grid2"><div class="field"><label>Recupero (sec)</label><input id="awRest" type="number" value="${esc(row.recupero_sec||90)}"></div><div class="field"><label>RIR target</label><input id="awRir" value="${esc(row.rir||"")}"></div></div>
        <div class="grid2"><div class="field"><label>Carico iniziale</label><input id="awLoad" inputmode="decimal" value="${esc(row.carico||"")}"></div><div class="field"><label>Ordine</label><input id="awOrder" type="number" value="${esc(row.ordine||1)}"></div></div>
        <div class="field"><label>Note</label><textarea id="awNotes" rows="2">${esc(row.note||"")}</textarea></div>
        <div class="formActions"><button class="secondary" id="awCancel">Annulla</button><button class="primary" id="awSave">Salva</button></div></div>`);
      $("#awCancel").onclick=()=>planStructure(schedaId);
      $("#awSave").onclick=async()=>{try{await gas("api_adminSaveWorkoutRow",{rowId:row.rowId||"",giornoId,exId:$("#awEx").value,serie:$("#awSets").value,ripetizioni:$("#awReps").value,recupero_sec:$("#awRest").value,rir:$("#awRir").value,carico:$("#awLoad").value,ordine:$("#awOrder").value,note:$("#awNotes").value});toast("Workout aggiornato ✓");planStructure(schedaId)}catch(e){toast(e.message)}};
    }

    function renderAdminExercises(){
      const list=(adminCache?.exercises||[]).slice().sort((a,b)=>String(a.nome||"").localeCompare(String(b.nome||""),"it"));
      $("#adminBody").innerHTML=`<div class="manageToolbar"><div><b>Esercizi</b><div class="muted">${list.length} nel database</div></div><button class="primary" id="addEx">+ Esercizio</button></div>
      <div class="field"><input id="adminExSearch" placeholder="Cerca esercizio…"></div><div id="adminExList" class="manageList"></div>`;
      const draw=q=>{$("#adminExList").innerHTML=list.filter(x=>!q||(`${x.nome||""} ${x.gruppo||""}`).toLowerCase().includes(q.toLowerCase())).slice(0,100).map(x=>`<div class="manageItem"><div class="manageItemMain"><b>${esc(x.nome)}</b><span>${esc(x.gruppo||"")}${x.attrezzatura?" · "+esc(x.attrezzatura):""}</span></div><div class="manageActions"><button class="secondary" data-exedit="${esc(x.exId)}">Modifica</button><button class="secondary manageDanger" data-exdel="${esc(x.exId)}">Elimina</button></div></div>`).join("")};
      draw("");$("#adminExSearch").oninput=e=>draw(e.target.value);$("#addEx").onclick=()=>exerciseEditor(null);
      $("#adminExList").onclick=async e=>{const edit=e.target.closest("[data-exedit]"),del=e.target.closest("[data-exdel]");if(edit)exerciseEditor(list.find(x=>String(x.exId)===edit.dataset.exedit));if(del){const x=list.find(y=>String(y.exId)===del.dataset.exdel);if(!confirm(`Eliminare “${x?.nome||"esercizio"}”?`))return;try{let r=await gas("api_adminDeleteExercise",{exId:del.dataset.exdel,force:false});if(r.blocked){if(!confirm(`È usato in ${r.references} righe di scheda. Rimuoverlo anche dalle schede?`))return;r=await gas("api_adminDeleteExercise",{exId:del.dataset.exdel,force:true})}toast("Esercizio eliminato");dataManager("exercises")}catch(err){toast(err.message)}}};
    }

    function exerciseEditor(x){
      x=x||{};
      layout(`<div class="viewTitle"><h1>${x.exId?"Modifica esercizio":"Nuovo esercizio"}</h1></div><div class="card">
      <div class="field"><label>Nome</label><input id="aeName" value="${esc(x.nome||"")}"></div>
      <div class="grid2"><div class="field"><label>Gruppo</label><input id="aeGroup" value="${esc(x.gruppo||"")}"></div><div class="field"><label>Attrezzatura</label><input id="aeEquip" value="${esc(x.attrezzatura||"")}"></div></div>
      <div class="field"><label>Descrizione</label><textarea id="aeDesc" rows="2">${esc(x.descrizione||"")}</textarea></div>
      <div class="field"><label>Tecnica</label><textarea id="aeTech" rows="2">${esc(x.tecnica||"")}</textarea></div>
      <div class="grid2"><div class="field"><label>Immagine URL</label><input id="aeImg" value="${esc(x.imgUrl||"")}"></div><div class="field"><label>Video URL</label><input id="aeVideo" value="${esc(x.videoUrl||"")}"></div></div>
      <div class="field"><label>Tag</label><input id="aeTags" value="${esc(x.tags||"")}"></div>
      <div class="formActions"><button class="secondary" id="aeCancel">Annulla</button><button class="primary" id="aeSave">Salva</button></div></div>`);
      $("#aeCancel").onclick=()=>dataManager("exercises");
      $("#aeSave").onclick=async()=>{try{await gas("api_adminSaveExercise",{exId:x.exId||"",nome:$("#aeName").value,gruppo:$("#aeGroup").value,attrezzatura:$("#aeEquip").value,descrizione:$("#aeDesc").value,tecnica:$("#aeTech").value,imgUrl:$("#aeImg").value,videoUrl:$("#aeVideo").value,tags:$("#aeTags").value});toast("Esercizio salvato ✓");dataManager("exercises")}catch(e){toast(e.message)}};
    }

    function renderAdminIntegration(){
      const list=adminCache?.integrations||[];
      $("#adminBody").innerHTML=`<div class="manageToolbar"><div><b>Integrazione</b><div class="muted">${list.length} elementi</div></div><button class="primary" id="addInt">+ Integratore</button></div><div class="manageList">${list.map(x=>`<div class="manageItem"><div class="manageItemMain"><b>${esc(x.nome)}</b><span>${esc(x.dose||"")}${x.quando?" · "+esc(x.quando):""}${x.fase?" · "+esc(x.fase):""}</span></div><div class="manageActions"><button class="secondary" data-intedit="${esc(x.intId)}">Modifica</button><button class="secondary manageDanger" data-intdel="${esc(x.intId)}">Elimina</button></div></div>`).join("")||`<div class="card"><span class="muted">Nessun integratore.</span></div>`}</div>`;
      $("#addInt").onclick=()=>integrationEditor(null);document.querySelectorAll("[data-intedit]").forEach(b=>b.onclick=()=>integrationEditor(list.find(x=>String(x.intId)===b.dataset.intedit)));document.querySelectorAll("[data-intdel]").forEach(b=>b.onclick=async()=>{if(!confirm("Eliminare questo integratore?"))return;try{await gas("api_adminDeleteIntegration",b.dataset.intdel);toast("Integratore eliminato");await refresh();dataManager("integration")}catch(e){toast(e.message)}})
    }

    function integrationEditor(x){
      x=x||{};
      layout(`<div class="viewTitle"><h1>${x.intId?"Modifica integratore":"Nuovo integratore"}</h1></div><div class="card">
      <div class="field"><label>Nome</label><input id="aiName" value="${esc(x.nome||"")}"></div><div class="grid2"><div class="field"><label>Dose</label><input id="aiDose" value="${esc(x.dose||"")}"></div><div class="field"><label>Quando</label><input id="aiWhen" value="${esc(x.quando||"")}"></div></div><div class="field"><label>Fase</label><input id="aiPhase" value="${esc(x.fase||"")}"></div><div class="field"><label>Note</label><textarea id="aiNotes" rows="3">${esc(x.note||"")}</textarea></div>
      <div class="formActions"><button class="secondary" id="aiCancel">Annulla</button><button class="primary" id="aiSave">Salva</button></div></div>`);
      $("#aiCancel").onclick=()=>dataManager("integration");$("#aiSave").onclick=async()=>{try{await gas("api_adminSaveIntegration",{intId:x.intId||"",nome:$("#aiName").value,dose:$("#aiDose").value,quando:$("#aiWhen").value,fase:$("#aiPhase").value,note:$("#aiNotes").value});toast("Integratore salvato ✓");await refresh();dataManager("integration")}catch(e){toast(e.message)}};
    }

    function renderAdminDiets(){
      const diets=adminCache?.diets||[], meals=adminCache?.meals||[];
      $("#adminBody").innerHTML=`<div class="manageToolbar"><div><b>Diete base</b><div class="muted">${diets.length} piani</div></div><button class="primary" id="addDiet">+ Dieta</button></div><div class="manageList">${diets.map(x=>`<div class="manageItem"><div class="manageItemMain"><b>${boolUi(x.attiva)?'<span class="activeDot">●</span> ':''}${esc(x.titolo)}</b><span>${fmtNum(x.kcal)} kcal · P ${fmtNum(x.proteine_g)} · C ${fmtNum(x.carbo_g)} · F ${fmtNum(x.grassi_g)} · ${(meals.filter(m=>String(m.dietaId)===String(x.dietaId))).length} pasti</span></div><div class="manageActions"><button class="secondary" data-dietmeal="${esc(x.dietaId)}">Pasti</button><button class="secondary" data-dietedit="${esc(x.dietaId)}">Modifica</button><button class="secondary manageDanger" data-dietdel="${esc(x.dietaId)}">Elimina</button></div></div>`).join("")||`<div class="card"><span class="muted">Nessuna dieta.</span></div>`}</div>`;
      $("#addDiet").onclick=()=>dietEditor(null);document.querySelectorAll("[data-dietedit]").forEach(b=>b.onclick=()=>dietEditor(diets.find(x=>String(x.dietaId)===b.dataset.dietedit)));document.querySelectorAll("[data-dietmeal]").forEach(b=>b.onclick=()=>mealManager(b.dataset.dietmeal));document.querySelectorAll("[data-dietdel]").forEach(b=>b.onclick=async()=>{if(!confirm("Eliminare questa dieta e i relativi pasti?"))return;try{await gas("api_adminDeleteDiet",b.dataset.dietdel);toast("Dieta eliminata");await refresh();dataManager("diets")}catch(e){toast(e.message)}})
    }

    function dietEditor(x){
      x=x||{};
      layout(`<div class="viewTitle"><h1>${x.dietaId?"Modifica dieta":"Nuova dieta"}</h1></div><div class="card">
      <div class="field"><label>Titolo</label><input id="diTitle" value="${esc(x.titolo||"")}"></div><div class="grid2"><div class="field"><label>Fase</label><input id="diPhase" value="${esc(x.fase||"")}"></div><div class="field"><label>Settimane</label><input id="diWeeks" type="number" value="${esc(x.settimane||"")}"></div></div>
      <div class="grid2"><div class="field"><label>kcal</label><input id="diKcal" type="number" value="${esc(x.kcal||"")}"></div><div class="field"><label>Proteine g</label><input id="diP" type="number" value="${esc(x.proteine_g||"")}"></div></div>
      <div class="grid2"><div class="field"><label>Carbo g</label><input id="diC" type="number" value="${esc(x.carbo_g||"")}"></div><div class="field"><label>Grassi g</label><input id="diF" type="number" value="${esc(x.grassi_g||"")}"></div></div>
      <div class="field"><label>Note</label><textarea id="diNotes" rows="3">${esc(x.note||"")}</textarea></div><label style="display:flex;gap:8px;align-items:center"><input id="diActive" type="checkbox" ${boolUi(x.attiva)?"checked":""}> Dieta attiva</label>
      <div class="formActions"><button class="secondary" id="diCancel">Annulla</button><button class="primary" id="diSave">Salva</button></div></div>`);
      $("#diCancel").onclick=()=>dataManager("diets");$("#diSave").onclick=async()=>{try{await gas("api_adminSaveDiet",{dietaId:x.dietaId||"",titolo:$("#diTitle").value,fase:$("#diPhase").value,settimane:$("#diWeeks").value,kcal:$("#diKcal").value,proteine_g:$("#diP").value,carbo_g:$("#diC").value,grassi_g:$("#diF").value,note:$("#diNotes").value,attiva:$("#diActive").checked});toast("Dieta salvata ✓");await refresh();dataManager("diets")}catch(e){toast(e.message)}};
    }

    function mealManager(dietaId){
      const diet=(adminCache?.diets||[]).find(x=>String(x.dietaId)===String(dietaId));
      const list=(adminCache?.meals||[]).filter(x=>String(x.dietaId)===String(dietaId)).sort((a,b)=>Number(a.ordine||999)-Number(b.ordine||999));
      layout(`<div class="viewTitle"><h1>${esc(diet?.titolo||"Dieta")}</h1><div class="muted">Gestione pasti base.</div></div><div class="manageToolbar"><div><b>${list.length} pasti</b></div><button class="primary" id="addMeal">+ Pasto</button></div><div class="manageList">${list.map(x=>`<div class="manageItem"><div class="manageItemMain"><b>${esc(x.nomePasto)}</b><span>${esc(x.alimenti||"")} · ${esc(x.quantita||"")} · ${fmtNum(x.kcal)} kcal</span></div><div class="manageActions"><button class="secondary" data-mealedit="${esc(x.pastoId)}">Modifica</button><button class="secondary manageDanger" data-mealdel="${esc(x.pastoId)}">Elimina</button></div></div>`).join("")||`<div class="card"><span class="muted">Nessun pasto.</span></div>`}</div><div style="margin-top:12px"><button class="secondary big" id="mealBack">← Diete</button></div>`);
      $("#addMeal").onclick=()=>mealEditor(dietaId,null);$("#mealBack").onclick=()=>dataManager("diets");document.querySelectorAll("[data-mealedit]").forEach(b=>b.onclick=()=>mealEditor(dietaId,list.find(x=>String(x.pastoId)===b.dataset.mealedit)));document.querySelectorAll("[data-mealdel]").forEach(b=>b.onclick=async()=>{if(!confirm("Eliminare questo pasto?"))return;try{await gas("api_adminDeleteMeal",b.dataset.mealdel);toast("Pasto eliminato");adminCache=await gas("api_adminSnapshot");mealManager(dietaId)}catch(e){toast(e.message)}})
    }

    function mealEditor(dietaId,x){
      x=x||{};
      layout(`<div class="viewTitle"><h1>${x.pastoId?"Modifica pasto":"Nuovo pasto"}</h1></div><div class="card">
      <div class="field"><label>Nome pasto</label><input id="meName" value="${esc(x.nomePasto||"")}"></div><div class="field"><label>Alimenti</label><textarea id="meFoods" rows="3">${esc(x.alimenti||"")}</textarea></div>
      <div class="grid2"><div class="field"><label>Quantità</label><input id="meQty" value="${esc(x.quantita||"")}"></div><div class="field"><label>kcal</label><input id="meKcal" type="number" value="${esc(x.kcal||"")}"></div></div><div class="grid2"><div class="field"><label>Ordine</label><input id="meOrder" type="number" value="${esc(x.ordine||1)}"></div><div class="field"><label>Note</label><input id="meNotes" value="${esc(x.note||"")}"></div></div>
      <div class="formActions"><button class="secondary" id="meCancel">Annulla</button><button class="primary" id="meSave">Salva</button></div></div>`);
      $("#meCancel").onclick=async()=>{adminCache=await gas("api_adminSnapshot");mealManager(dietaId)};$("#meSave").onclick=async()=>{try{await gas("api_adminSaveMeal",{pastoId:x.pastoId||"",dietaId,nomePasto:$("#meName").value,alimenti:$("#meFoods").value,quantita:$("#meQty").value,kcal:$("#meKcal").value,ordine:$("#meOrder").value,note:$("#meNotes").value});toast("Pasto salvato ✓");adminCache=await gas("api_adminSnapshot");mealManager(dietaId)}catch(e){toast(e.message)}};
    }



    /* =========================================================
       CALENDARIO PROGRAMMATO
       ========================================================= */

    let calendarCache=null;

    async function calendarManager(){
      state.view="more";
      layout(`<div class="loading"><div><div class="spinner"></div>Carico calendario…</div></div>`);
      try{
        const now=new Date();
        const from=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10);
        const to=new Date(now.getFullYear(),now.getMonth()+2,0).toISOString().slice(0,10);
        calendarCache=await gas("api_calendarList",{from,to});
        renderCalendarManager();
      }catch(e){toast(e.message);more()}
    }

    function calendarYmdLocal(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}

    function renderCalendarManager(){
      const events=calendarCache?.events||[];
      const now=new Date(), y=now.getFullYear(), m=now.getMonth();
      const first=new Date(y,m,1), last=new Date(y,m+1,0);
      const cells=[];
      for(let i=1;i<=last.getDate();i++){
        const d=new Date(y,m,i), ds=calendarYmdLocal(d);
        const ev=events.filter(x=>String(x.start||"").slice(0,10)===ds);
        cells.push(`<div class="calendarDay"><b>${i}</b>${ev.slice(0,3).map(x=>`<span class="calendarEvent" title="${esc(x.title)}">${esc(x.title)}</span>`).join("")}</div>`);
      }

      const upcoming=events.filter(e=>String(e.start||"").slice(0,10)>=calendarYmdLocal(now)).slice(0,20);

      layout(`
        <div class="viewTitle"><h1>Calendario allenamenti</h1><div class="muted">Programma manualmente o crea automaticamente le prossime settimane.</div></div>
        <div class="card">
          <div class="manageToolbar"><div><b>${now.toLocaleDateString('it-IT',{month:'long',year:'numeric'})}</b></div><div class="manageActions"><button class="secondary" id="calAdd">+ Evento</button><button class="primary" id="calAuto">✨ Auto programma</button></div></div>
          <div class="calendarGrid">${cells.join("")}</div>
        </div>
        <div class="sectionTitle"><h2>Prossimi allenamenti</h2><span>${upcoming.length}</span></div>
        <div class="calendarList">${upcoming.map(e=>`
          <div class="calendarItem">
            <div><b>${fmtDate(e.start)} · ${esc(e.title)}</b><div class="muted">${e.allDay?'Tutto il giorno':String(e.start||'').slice(11,16)} · ${esc(e.tipo||'')}</div></div>
            <div class="manageActions"><button class="secondary" data-caledit="${esc(e.id)}">Modifica</button><button class="secondary manageDanger" data-caldel="${esc(e.id)}">Elimina</button></div>
          </div>`).join("")||`<div class="card"><span class="muted">Nessun allenamento programmato.</span></div>`}</div>
        <div style="margin-top:12px"><button class="secondary big" id="calBack">← Centro controllo</button></div>
      `);
      $("#calAdd").onclick=()=>calendarEventEditor(null);
      $("#calAuto").onclick=calendarAutoEditor;
      $("#calBack").onclick=more;
      document.querySelectorAll("[data-caledit]").forEach(b=>b.onclick=()=>calendarEventEditor(events.find(x=>String(x.id)===String(b.dataset.caledit))));
      document.querySelectorAll("[data-caldel]").forEach(b=>b.onclick=async()=>{if(!confirm("Eliminare questo evento?"))return;try{await gas("api_calendarDelete",b.dataset.caldel);toast("Evento eliminato");calendarManager()}catch(e){toast(e.message)}})
    }

    function calendarEventEditor(e){
      e=e||{};
      const plans=(adminCache?.plans||state.boot?.plan?[state.boot.plan]:[]).filter(Boolean);
      const active=state.boot?.plan;
      const days=state.boot?.days||[];
      const date=String(e.start||new Date().toISOString()).slice(0,10);
      const time=String(e.start||"").includes("T")?String(e.start).slice(11,16):"18:00";
      layout(`
        <div class="viewTitle"><h1>${e.id?"Modifica evento":"Nuovo allenamento"}</h1></div>
        <div class="card">
          <div class="field"><label>Titolo</label><input id="ceTitle" value="${esc(e.title||"Allenamento")}"></div>
          <div class="grid2"><div class="field"><label>Data</label><input id="ceDate" type="date" value="${esc(date)}"></div><div class="field"><label>Ora</label><input id="ceTime" type="time" value="${esc(time)}"></div></div>
          <div class="field"><label>Giorno scheda attiva</label><select id="ceDay"><option value="">— Nessun collegamento —</option>${days.map(d=>`<option value="${esc(d.giornoId)}" ${String(e.giornoId)===String(d.giornoId)?'selected':''}>${esc(d.nomeGiorno||d.giornoId)}</option>`).join("")}</select></div>
          <div class="field"><label>Note</label><textarea id="ceNote" rows="3">${esc(String(e.note||"").replace(/Scheda:[^\n]*\n?/g,"").replace(/Giorno:[^\n]*\n?/g,""))}</textarea></div>
          <div class="formActions"><button class="secondary" id="ceCancel">Annulla</button><button class="primary" id="ceSave">Salva</button></div>
        </div>`);
      $("#ceCancel").onclick=calendarManager;
      $("#ceSave").onclick=async()=>{try{await gas("api_calendarSave",{id:e.id||"",title:$("#ceTitle").value,date:$("#ceDate").value,time:$("#ceTime").value,allDay:false,tipo:"PROGRAMMATO",schedaId:active?.schedaId||"",giornoId:$("#ceDay").value,note:$("#ceNote").value,color:"#7c9cff"});toast("Calendario aggiornato ✓");calendarManager()}catch(err){toast(err.message)}};
    }

    function calendarAutoEditor(){
      const plan=state.boot?.plan, days=state.boot?.days||[];
      if(!plan){toast("Nessuna scheda attiva");return}
      layout(`
        <div class="viewTitle"><h1>Programmazione automatica</h1><div class="muted">${esc(plan.titolo||"Scheda")} · ${days.length} giorni</div></div>
        <div class="card">
          <div class="grid2"><div class="field"><label>Data di partenza</label><input id="caStart" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Settimane</label><input id="caWeeks" type="number" min="1" max="12" value="4"></div></div>
          <div class="grid2"><div class="field"><label>Giorni settimana (lun=1 … dom=7)</label><input id="caDays" value="1,3,5,6"></div><div class="field"><label>Ora</label><input id="caTime" type="time" value="18:00"></div></div>
          <div class="adminNotice">PT-PRO ruoterà i giorni della scheda in ordine sui giorni della settimana selezionati.</div>
          <div class="formActions"><button class="secondary" id="caCancel">Annulla</button><button class="primary" id="caCreate">Crea calendario</button></div>
        </div>`);
      $("#caCancel").onclick=calendarManager;
      $("#caCreate").onclick=async()=>{try{const r=await gas("api_calendarAutoSchedule",{schedaId:plan.schedaId,startDate:$("#caStart").value,weeks:$("#caWeeks").value,weekdays:$("#caDays").value,time:$("#caTime").value});toast(`${r.created} allenamenti programmati ✓`);calendarManager()}catch(e){toast(e.message)}};
    }

    