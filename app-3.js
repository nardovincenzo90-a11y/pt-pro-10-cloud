/* =========================================================
       MISURE
       ========================================================= */

    function measureForm(){

      layout(`

        <div class="viewTitle">

          <h1>
            Nuova misurazione
          </h1>

          <div class="muted">
            Registra solo ciò che vuoi monitorare.
          </div>

        </div>


        <div class="card">

          <div class="grid2">

            <div class="field">

              <label>
                Peso (kg)
              </label>

              <input
                id="mPeso"
                inputmode="decimal"
              >

            </div>


            <div class="field">

              <label>
                Vita (cm)
              </label>

              <input
                id="mVita"
                inputmode="decimal"
              >

            </div>


            <div class="field">

              <label>
                Petto (cm)
              </label>

              <input
                id="mPetto"
                inputmode="decimal"
              >

            </div>


            <div class="field">

              <label>
                Braccio (cm)
              </label>

              <input
                id="mBraccio"
                inputmode="decimal"
              >

            </div>


            <div class="field">

              <label>
                Fianchi (cm)
              </label>

              <input
                id="mFianchi"
                inputmode="decimal"
              >

            </div>


            <div class="field">

              <label>
                Coscia (cm)
              </label>

              <input
                id="mCoscia"
                inputmode="decimal"
              >

            </div>

          </div>


          <button
            class="primary big"
            id="saveMeasure"
          >
            Salva misurazione
          </button>

        </div>

      `);


      $("#saveMeasure").onclick =
        async () => {

          try{

            await gas(
              "api_addMeasure",
              {

                peso_kg:
                  $("#mPeso")
                    .value,

                vita_cm:
                  $("#mVita")
                    .value,

                petto_cm:
                  $("#mPetto")
                    .value,

                braccio_cm:
                  $("#mBraccio")
                    .value,

                fianchi_cm:
                  $("#mFianchi")
                    .value,

                coscia_cm:
                  $("#mCoscia")
                    .value

              }
            );


            toast(
              "Misurazione salvata"
            );


            await refresh();


            go(
              "progress"
            );


          }catch(error){

            toast(
              error.message
            );

          }

        };

    }


    /* =========================================================
       PROGRESSI
       ========================================================= */

    async function progress(){
      layout(`<div class="loading"><div><div class="spinner"></div>Carico Progressi PRO…</div></div>`);
      try{
        const response=await gas('api_getProgress');
        const measures=response.measures||[];
        const sessions=response.sessions||[];
        const latest=measures[0];
        const metrics=sessionMetrics(sessions);
        const delta=weightDelta(measures);
        const recent=metrics.completed.slice(0,12);

        layout(`
          <div class="viewTitle"><h1>Progressi PRO</h1><div class="muted">Allenamenti, misure, costanza e trend.</div></div>

          <div class="proGrid">
            <div class="proKpi"><b>${metrics.thisWeek.length}</b><span>Workout questa settimana</span></div>
            <div class="proKpi"><b>${metrics.streak}</b><span>Streak allenamento</span></div>
            <div class="proKpi"><b>${metrics.avgDuration ? metrics.avgDuration+'′' : '—'}</b><span>Durata media</span></div>
            <div class="proKpi"><b>${metrics.avgCompletion ? metrics.avgCompletion+'%' : '—'}</b><span>Completamento medio</span></div>
          </div>

          <div class="sectionTitle"><h2>Questa settimana</h2><span>${metrics.weekMinutes} minuti totali</span></div>
          <div class="card">${weeklyBars(sessions)}</div>

          <div class="sectionTitle"><h2>Composizione</h2><button class="secondary" id="addMeasure">+ Misura</button></div>
          <div class="smartRow">
            <div class="card">
              <div class="sessionHero"><div><div class="eyebrow">PESO</div><div class="bigValue">${fmtNum(latest?.peso_kg,' kg')}</div></div><div>${deltaHtml(delta,' kg')}</div></div>
              <div class="chart" style="margin-top:12px">${spark([...measures].reverse().map(x=>x.peso_kg))}</div>
            </div>
            <div class="card">
              <div class="metricLine"><span class="muted">BMI</span><b>${fmtNum(latest?.bmi)}</b></div>
              <div class="metricLine"><span class="muted">Vita</span><b>${fmtNum(latest?.vita_cm,' cm')}</b></div>
              <div class="metricLine"><span class="muted">Petto</span><b>${fmtNum(latest?.petto_cm,' cm')}</b></div>
              <div class="metricLine"><span class="muted">Braccio</span><b>${fmtNum(latest?.braccio_cm,' cm')}</b></div>
              <div class="metricLine"><span class="muted">Coscia</span><b>${fmtNum(latest?.coscia_cm,' cm')}</b></div>
            </div>
          </div>

          ${(state.boot?.coach?.recentPRs||[]).length ? `<div class="sectionTitle"><h2>PR recenti</h2><span>${state.boot.coach.recentPRs.length}</span></div><div class="card prList">${state.boot.coach.recentPRs.map(pr=>`<div class="historyRow"><div style="display:flex;align-items:center;gap:10px"><div class="prIcon">🏆</div><div><b>${esc(pr.exNome)}</b><div class="muted">${fmtDate(pr.date)} · ${pr.type==='load'?'Record carico':'Record e1RM'}</div></div></div><div style="text-align:right"><b>${esc(pr.load)} kg × ${esc(pr.reps)}</b><div class="muted">e1RM ${esc(pr.e1rm)} kg</div></div></div>`).join('')}</div>` : ''}

          <div class="sectionTitle"><h2>Ultimi allenamenti</h2><span>${recent.length}</span></div>
          <div class="card">${recent.length ? recent.map(s=>{const score=Number(s.completamento||0);const cls=score>=90?'good':score>=60?'mid':'low';return `<div class="historyRow"><div><b>${fmtDate(s.dataOraStart)}</b><div class="muted">${esc(s.giornoId||'Workout')} • ${s.durataMin||'—'} min</div></div><div style="text-align:right"><div class="sessionScore ${cls}">${score}%</div><div class="muted">${s.eserciziLoggati||0}/${s.eserciziPrevisti||'—'} esercizi</div></div></div>`}).join('') : '<span class="muted">Nessun allenamento completato.</span>'}</div>

          <div class="sectionTitle"><h2>Storico misure</h2><span>${measures.length}</span></div>
          <div class="card">${measures.slice(0,20).map(item=>`<div class="historyRow"><div><b>${fmtDate(item.data)}</b><div class="muted">Vita ${fmtNum(item.vita_cm,' cm')} • Petto ${fmtNum(item.petto_cm,' cm')}</div></div><div style="text-align:right"><b>${fmtNum(item.peso_kg,' kg')}</b><div class="muted">BMI ${fmtNum(item.bmi)}</div></div></div>`).join('') || '<span class="muted">Nessuna misurazione.</span>'}</div>
        `);

        $('#addMeasure').onclick=measureForm;
      }catch(error){ toast(error.message); }
    }


    /* =========================================================
       NUTRIZIONE
       ========================================================= */

    let nutriPlan = null;
    let nutriWeek = null;
    let nutriMonth = null;
    let nutriActive = null;
    let nutriTab = "today";

    async function nutrition(){
      layout(`<div class="loading"><div><div class="spinner"></div>Carico Nutrizione Smart…</div></div>`);
      try{
        const data = await gas("api_getNutritionSmart", {dateStr:new Date().toISOString().slice(0,10)});
        try{ nutriActive = (await gas("api_getActiveNutritionSmart")).active; }catch(e){ nutriActive=null; }
        renderNutritionSmart(data);
      }catch(error){
        toast(error.message);
      }
    }

    function nutriDeltaClass(value, target){
      if(!target) return 'deltaOk';
      return Math.abs(Number(value||0))/Number(target||1) <= .08 ? 'deltaOk' : 'deltaWarn';
    }

    function nutriSigned(value,suffix=''){
      const n=Number(value||0);
      return `${n>0?'+':''}${String(Math.round(n*10)/10).replace('.',',')}${suffix}`;
    }

    function renderNutritionSmart(data){
      const saved = data.saved;
      const baseDiet = data.diet;
      const displayPlan = nutriPlan || saved;
      const totals = displayPlan?.totals || (baseDiet ? {kcal:baseDiet.kcal,p:baseDiet.proteine_g,c:baseDiet.carbo_g,f:baseDiet.grassi_g} : {kcal:0,p:0,c:0,f:0});
      const target = displayPlan?.target || null;
      const delta = displayPlan?.delta || null;
      const accuracy = displayPlan?.accuracy;
      const dayType = displayPlan?.dayType || 'AUTO';
      const meals = displayPlan?.meals || [];

      layout(`
        <div class="viewTitle"><h1>Nutrizione Smart</h1><div class="muted">Piani realistici, ON/OFF, rotazione alimenti, ricette e lista spesa.</div></div>
        <div class="smartTabs">
          <button class="smartTab ${nutriTab==='today'?'active':''}" data-ntab="today">Oggi</button>
          <button class="smartTab ${nutriTab==='week'?'active':''}" data-ntab="week">Settimana</button>
          <button class="smartTab ${nutriTab==='month'?'active':''}" data-ntab="month">Mese</button>
          <button class="smartTab ${nutriTab==='recipes'?'active':''}" data-ntab="recipes">Ricette</button>
          <button class="smartTab ${nutriTab==='shopping'?'active':''}" data-ntab="shopping">Lista spesa</button>
        </div>
        ${nutriActive ? `
          <div class="card activeDietCard" style="margin-bottom:12px">
            <span class="activeDietBadge">● DIETA SMART ATTIVA</span>
            <h3 style="margin:9px 0 4px">${esc(nutriActive.title||"Piano Smart")}</h3>
            <div class="muted">${esc(nutriActive.startDate||"")} → ${esc(nutriActive.endDate||"")} · ${esc(nutriActive.type||"")}</div>
            <div class="monthActions"><button class="secondary" id="deactivateSmart">Disattiva</button></div>
          </div>` : ''}
        <div id="nutriContent"></div>
      `);

      document.querySelectorAll('[data-ntab]').forEach(b=>b.onclick=()=>{nutriTab=b.dataset.ntab;renderNutritionSmart(data)});
      if($('#deactivateSmart')) $('#deactivateSmart').onclick=async()=>{try{await gas('api_deactivateNutritionSmart');nutriActive=null;toast('Dieta Smart disattivata');renderNutritionSmart(data)}catch(e){toast(e.message)}};
      const box = $('#nutriContent');

      if(nutriTab === 'today'){
        box.innerHTML = `
          <div class="card nutriHero">
            <div class="nutriTop">
              <div><div class="eyebrow">${esc(data.dateStr || '')}</div><div class="nutriKcal">${fmtNum(totals.kcal)} <small>kcal</small></div></div>
              <span class="dayBadge ${dayType==='OFF'?'off':''}">${dayType==='ON'?'🏋️ ON':dayType==='OFF'?'🌙 OFF':'⚙️ AUTO'}</span>
            </div>
            <div class="macroGrid">
              <div class="macroCard"><b>${fmtNum(totals.p,' g')}</b><span>Proteine</span></div>
              <div class="macroCard"><b>${fmtNum(totals.c,' g')}</b><span>Carbo</span></div>
              <div class="macroCard"><b>${fmtNum(totals.f,' g')}</b><span>Grassi</span></div>
            </div>
            ${target ? `
              <div class="targetGrid">
                <div class="targetMini"><b>${fmtNum(target.kcal)} kcal</b><span>Target calorie</span></div>
                <div class="targetMini"><b>${fmtNum(target.p)} g</b><span>Target proteine</span></div>
                <div class="targetMini"><b>${fmtNum(target.c)} g</b><span>Target carbo</span></div>
                <div class="targetMini"><b>${fmtNum(target.f)} g</b><span>Target grassi</span></div>
              </div>
              <div class="nutriQuality"><strong>${accuracy ?? '—'}%</strong><span>Aderenza del piano ai target${delta?` · kcal <span class="${nutriDeltaClass(delta.kcal,target.kcal)}">${nutriSigned(delta.kcal)}</span> · P ${nutriSigned(delta.p,'g')} · C ${nutriSigned(delta.c,'g')} · F ${nutriSigned(delta.f,'g')}`:''}</span></div>
            `:''}
          </div>

          <div class="sectionTitle"><h2>Generatore</h2><span>personalizza la giornata</span></div>
          <div class="card">
            <div class="nutriControls">
              <div class="field"><label>Obiettivo</label><select id="nGoal"><option value="mantenimento">Mantenimento</option><option value="dimagrire">Dimagrire</option><option value="ricomposizione">Ricomposizione</option><option value="massa">Massa</option><option value="lean_bulk">Lean bulk</option><option value="performance">Performance</option></select></div>
              <div class="field"><label>Attività</label><select id="nActivity"><option value="basso">Bassa</option><option value="medio" selected>Media</option><option value="alto">Alta</option></select></div>
              <div class="field"><label>Giorno</label><select id="nDay"><option value="AUTO">AUTO</option><option value="ON">ON</option><option value="OFF">OFF</option></select></div>
              <div class="field"><label>Giorni ON</label><input id="nOnDays" value="1,3,5" placeholder="1,3,5"></div>
            </div>
            <div class="nutriActions">
              <button class="primary" id="nGenerate">✨ ${nutriPlan?'Rigenera':'Genera'} giornata</button>
              <button class="secondary" id="nSave" ${nutriPlan?'':'disabled'}>💾 Salva giornata</button>
              <button class="secondary" id="nActivateDay" ${nutriPlan?'':'disabled'}>✅ Attiva giornata</button>
              <button class="secondary" id="nWeek">📅 Genera settimana</button>
              <button class="secondary" id="nMonth">🗓️ Genera mese</button>
            </div>
          </div>

          <div class="sectionTitle"><h2>Pasti</h2><span>${meals.length || 0}</span></div>
          <div id="nMeals">${meals.length ? renderNutriMeals(meals) : `<div class="card"><span class="muted">Genera una giornata oppure usa un piano salvato.</span></div>`}</div>
        `;

        $('#nGenerate').onclick = async ()=>{
          try{
            const payload={goal:$('#nGoal').value,activity:$('#nActivity').value,dayMode:$('#nDay').value,onDays:$('#nOnDays').value,dateStr:data.dateStr,seedOffset:Date.now()%100000};
            $('#nGenerate').textContent='Genero…';
            nutriPlan=await gas('api_generateNutritionSmart',payload);
            toast('Nuova giornata generata ✨');
            renderNutritionSmart(data);
          }catch(e){toast(e.message)}
        };
        $('#nSave').onclick = async ()=>{
          if(!nutriPlan) return;
          try{await gas('api_saveNutritionSmartDay',nutriPlan);toast('Giornata salvata ✓');nutriPlan=null;const fresh=await gas('api_getNutritionSmart',{dateStr:data.dateStr});renderNutritionSmart(fresh)}catch(e){toast(e.message)}
        };
        $('#nActivateDay').onclick = async ()=>{
          if(!nutriPlan) return;
          try{
            await gas('api_activateNutritionSmartPlan',{type:'day',title:'Dieta Smart · '+nutriPlan.dateStr,plan:nutriPlan});
            nutriActive=(await gas('api_getActiveNutritionSmart')).active;
            toast('Dieta giornaliera attivata ✓');
            renderNutritionSmart(data);
          }catch(e){toast(e.message)}
        };
        $('#nWeek').onclick = async ()=>{
          try{
            const payload={goal:$('#nGoal').value,activity:$('#nActivity').value,dayMode:'AUTO',onDays:$('#nOnDays').value,dateStr:data.dateStr};
            $('#nWeek').textContent='Genero 7 giorni…';
            nutriWeek=await gas('api_generateNutritionSmartWeek',payload);nutriTab='week';toast('Settimana variata generata');renderNutritionSmart(data);
          }catch(e){toast(e.message)}
        };
        $('#nMonth').onclick = async ()=>{
          try{
            const payload={goal:$('#nGoal').value,activity:$('#nActivity').value,dayMode:'AUTO',onDays:$('#nOnDays').value,dateStr:data.dateStr};
            $('#nMonth').textContent='Genero il mese…';
            nutriMonth=await gas('api_generateNutritionSmartMonth',payload);
            nutriTab='month';
            toast('Piano mensile generato ✨');
            renderNutritionSmart(data);
          }catch(e){toast(e.message)}
        };
      }

      if(nutriTab === 'week'){
        if(!nutriWeek){
          box.innerHTML=`<div class="card"><b>Nessuna settimana generata</b><p class="muted">Vai su Oggi e premi “Genera settimana”.</p></div>`;
        }else{
          box.innerHTML=`
            <div class="card"><div class="eyebrow">${esc(nutriWeek.weekStart)} → ${esc(nutriWeek.weekEnd)}</div><h2 style="margin:7px 0">Settimana Smart</h2><div class="muted">Rotazione automatica degli alimenti · aderenza media ${esc(nutriWeek.accuracy || '—')}%</div><div class="nutriActions"><button class="primary" id="saveWeek">💾 Salva settimana</button><button class="secondary" id="activateWeek">✅ Attiva settimana</button><button class="secondary" id="regenWeek">🔄 Rigenera</button><button class="secondary" id="weekShop">🛒 Lista spesa</button></div></div>
            <div class="sectionTitle"><h2>7 giorni</h2><span>ON/OFF automatici</span></div>
            ${nutriWeek.days.map(d=>`<details class="card mealCard"><summary class="mealHead" style="cursor:pointer;list-style:none"><div><b>${fmtDate(d.dateStr)}</b><div class="muted">${d.dayType} · aderenza ${d.accuracy || '—'}%</div></div><div style="text-align:right"><b>${fmtNum(d.totals.kcal)} kcal</b><div class="muted">P ${fmtNum(d.totals.p)} · C ${fmtNum(d.totals.c)} · F ${fmtNum(d.totals.f)}</div></div></summary><div class="weekMealNames">${d.meals.map(m=>`<b>${esc(m.pasto)}</b>: ${(m.items||[]).map(i=>esc(i.nome)).join(', ')}`).join('<br>')}</div></details>`).join('')}
          `;
          $('#saveWeek').onclick=async()=>{try{await gas('api_saveNutritionSmartWeek',nutriWeek);toast('Settimana salvata ✓')}catch(e){toast(e.message)}};
          $('#activateWeek').onclick=async()=>{try{await gas('api_activateNutritionSmartPlan',{type:'week',title:'Dieta Smart Settimanale',plan:nutriWeek});nutriActive=(await gas('api_getActiveNutritionSmart')).active;toast('Settimana attivata ✓');renderNutritionSmart(data)}catch(e){toast(e.message)}};
          $('#regenWeek').onclick=()=>{nutriTab='today';renderNutritionSmart(data);setTimeout(()=>$('#nWeek')?.click(),50)};
          $('#weekShop').onclick=()=>{nutriTab='shopping';renderNutritionSmart(data)};
        }
      }


      if(nutriTab === 'month'){
        if(!nutriMonth){
          box.innerHTML=`
            <div class="card monthHero">
              <div class="eyebrow">Piano mensile</div>
              <h2 style="margin:7px 0">Nessun mese generato</h2>
              <p class="muted">Vai su Oggi e premi “Genera mese”. PT-PRO creerà automaticamente 28–31 giornate con rotazione alimentare e giorni ON/OFF.</p>
              <button class="secondary" id="monthGoToday">Vai al generatore</button>
            </div>`;
          $('#monthGoToday').onclick=()=>{nutriTab='today';renderNutritionSmart(data)};
        }else{
          const avg=nutriMonth.average||{};
          box.innerHTML=`
            <div class="card monthHero">
              <div class="eyebrow">${esc(nutriMonth.monthStart)} → ${esc(nutriMonth.monthEnd)}</div>
              <h2 style="margin:7px 0">Piano mensile Smart</h2>
              <div class="muted">${nutriMonth.daysCount} giorni · aderenza media ${esc(nutriMonth.accuracy||'—')}% · ON: ${esc(nutriMonth.onDays||'')}</div>
              <div class="targetGrid" style="margin-top:12px">
                <div class="targetMini"><b>${fmtNum(avg.kcal)} kcal</b><span>Media giorno</span></div>
                <div class="targetMini"><b>${fmtNum(avg.p)} g</b><span>Proteine</span></div>
                <div class="targetMini"><b>${fmtNum(avg.c)} g</b><span>Carbo</span></div>
                <div class="targetMini"><b>${fmtNum(avg.f)} g</b><span>Grassi</span></div>
              </div>
              <div class="monthActions">
                <button class="primary" id="saveMonth">💾 Salva mese</button>
                <button class="secondary" id="activateMonth">✅ Rendi dieta attiva</button>
                <button class="secondary" id="monthShop">🛒 Lista spesa mese</button>
                <button class="secondary" id="regenMonth">🔄 Rigenera</button>
              </div>
            </div>

            <div class="sectionTitle"><h2>${nutriMonth.daysCount} giorni</h2><span>tocca un giorno per i dettagli</span></div>
            <div class="monthGrid">
              ${nutriMonth.days.map(d=>{
                const dayNum=Number(String(d.dateStr).slice(-2));
                return `<button class="monthDay ${d.dayType==='ON'?'on':'off'}" data-mday="${esc(d.dateStr)}"><b>${dayNum} · ${esc(d.dayType)}</b><span>${fmtNum(d.totals.kcal)} kcal</span><span>P ${fmtNum(d.totals.p)} · C ${fmtNum(d.totals.c)}</span></button>`;
              }).join('')}
            </div>
            <div id="monthDayDetail" style="margin-top:12px"></div>
          `;

          $('#saveMonth').onclick=async()=>{try{await gas('api_saveNutritionSmartMonth',nutriMonth);toast('Mese salvato ✓')}catch(e){toast(e.message)}};
          $('#activateMonth').onclick=async()=>{try{
            await gas('api_activateNutritionSmartPlan',{type:'month',title:'Dieta Smart Mensile',plan:nutriMonth});
            nutriActive=(await gas('api_getActiveNutritionSmart')).active;
            toast('Dieta mensile attivata ✓');
            renderNutritionSmart(data);
          }catch(e){toast(e.message)}};
          $('#monthShop').onclick=()=>{nutriTab='shopping';renderNutritionSmart(data)};
          $('#regenMonth').onclick=()=>{nutriTab='today';renderNutritionSmart(data);setTimeout(()=>$('#nMonth')?.click(),60)};
          document.querySelectorAll('[data-mday]').forEach(b=>b.onclick=()=>{
            const d=nutriMonth.days.find(x=>String(x.dateStr)===String(b.dataset.mday));
            if(!d)return;
            $('#monthDayDetail').innerHTML=`
              <div class="card">
                <div class="mealHead"><div><b>${fmtDate(d.dateStr)} · ${esc(d.dayType)}</b><div class="muted">Aderenza ${d.accuracy||'—'}%</div></div><div style="text-align:right"><b>${fmtNum(d.totals.kcal)} kcal</b><div class="muted">P ${fmtNum(d.totals.p)} · C ${fmtNum(d.totals.c)} · F ${fmtNum(d.totals.f)}</div></div></div>
              </div>
              ${renderNutriMeals(d.meals||[])}`;
            $('#monthDayDetail').scrollIntoView({behavior:'smooth',block:'start'});
          });
        }
      }

      if(nutriTab === 'shopping'){
        const source = nutriMonth || nutriWeek || nutriPlan || saved;
        if(!source){box.innerHTML=`<div class="card"><b>Nessun piano disponibile</b><p class="muted">Genera prima una giornata o una settimana.</p></div>`;}
        else{
          box.innerHTML=`<div class="loading"><div><div class="spinner"></div>Creo lista spesa…</div></div>`;
          gas('api_getNutritionShopping',source).then(r=>{
            box.innerHTML=`<div class="card"><div class="eyebrow">Lista spesa</div><h2 style="margin:7px 0 5px">${r.items.length} alimenti</h2><div class="muted">Quantità aggregate dal piano selezionato.</div></div><div class="sectionTitle"><h2>Da comprare</h2></div><div class="card">${r.items.map(x=>`<div class="shoppingRow"><span>${esc(x.nome)}</span><b>${esc(x.qty)} ${esc(x.um)}</b></div>`).join('')}</div>`;
          }).catch(e=>{box.innerHTML=`<div class="card">${esc(e.message)}</div>`});
        }
      }

      if(nutriTab === 'recipes'){
        box.innerHTML=`
          <div class="card"><div class="grid2"><div class="field"><label>Cerca</label><input id="rSearch" placeholder="es. avena, salmone…"></div><div class="field"><label>Tipo giorno</label><select id="rDay"><option value="">Tutti</option><option value="ON">ON</option><option value="OFF">OFF</option></select></div></div></div>
          <div class="sectionTitle"><h2>Ricette</h2><span id="rCount"></span></div><div id="rGrid" class="recipeGrid"></div>`;
        const loadRecipes=async()=>{
          try{
            const r=await gas('api_listNutritionRecipes',{q:$('#rSearch').value,dayType:$('#rDay').value,limit:30});
            $('#rCount').textContent=r.recipes.length;
            $('#rGrid').innerHTML=r.recipes.map(x=>`<div class="recipeCard"><div class="eyebrow">${esc(x.pasto)} ${x.dayType?'• '+esc(x.dayType):''}</div><h3>${esc(x.nome)}</h3><div class="recipeMeta">${fmtNum(x.kcal)} kcal · P ${fmtNum(x.p)} · C ${fmtNum(x.c)} · F ${fmtNum(x.f)}</div><div class="recipeIngredients">${(x.ingredients||[]).map(i=>`${esc(i.nome)} ${esc(i.qty||'')}${esc(i.um||'')}`).join(' · ')}</div></div>`).join('') || `<div class="card"><span class="muted">Nessuna ricetta trovata.</span></div>`;
          }catch(e){toast(e.message)}
        };
        $('#rSearch').oninput=loadRecipes;$('#rDay').onchange=loadRecipes;loadRecipes();
      }
    }

    function renderNutriMeals(meals){
      return meals.map(m=>`
        <div class="card mealCard">
          <div class="mealHead"><div><b>${esc(m.pasto || 'Pasto')}</b></div><div class="mealMacro">${fmtNum(m.macro?.kcal)} kcal · P ${fmtNum(m.macro?.p)} · C ${fmtNum(m.macro?.c)} · F ${fmtNum(m.macro?.f)}</div></div>
          <div>${(m.items||[]).map(i=>`<div class="foodItem"><div><b>${esc(i.nome)}</b><div class="foodMacro">${fmtNum(i.kcal)} kcal · P ${fmtNum(i.p)} · C ${fmtNum(i.c)} · F ${fmtNum(i.f)}</div>${(i.alt||[]).length?`<div class="altLine">Alternative: ${(i.alt||[]).map(esc).join(' · ')}</div>`:''}</div><div class="foodQty">${esc(i.qty)} ${esc(i.um||'g')}</div></div>`).join('')}</div>
          ${m.consiglio?`<div class="mealTip">💡 ${esc(m.consiglio)}</div>`:''}
        </div>`).join('');
    }

    /* =========================================================
       ALTRO — CONTROL CENTER
       ========================================================= */

    async function more(){

      state.view = "more";

      layout(`
        <div class="loading">
          <div><div class="spinner"></div>Carico centro controllo…</div>
        </div>
      `);

      try{
        const c = await gas("api_getControlCenter");
        renderControlCenter(c);
      }catch(error){
        toast(error.message);
        layout(`<div class="card"><h2>Centro controllo</h2><p style="color:#ff9aaa">${esc(error.message)}</p></div>`);
      }
    }

    function renderControlCenter(c){
      const p = c.profile || {};
      const m = c.latestMeasure || {};
      const plan = c.plan;
      const integration = c.integration || [];
      const done = Number(c.integrationDone || 0);
      const total = integration.length;
      const intPct = total ? Math.round(done / total * 100) : 0;
      const letter = String(p.nome || "V").slice(0,1).toUpperCase();
      const photo = p.fotoUrl
        ? `<img class="profilePhoto" src="${esc(p.fotoUrl)}" alt="Profilo" onerror="this.outerHTML='<div class=&quot;profilePhotoFallback&quot;>${esc(letter)}</div>'">`
        : `<div class="profilePhotoFallback">${esc(letter)}</div>`;

      layout(`
        <div class="viewTitle">
          <h1>Centro controllo</h1>
          <div class="muted">Profilo, scheda, integrazione e strumenti PT-PRO.</div>
        </div>

        <section class="controlHero">
          <div class="card profileCard">
            ${photo}
            <div class="profileMeta">
              <div class="eyebrow">Profilo atleta</div>
              <h2>${esc(p.nome || "Vincenzo")}</h2>
              <div class="muted">
                ${p.altezza_cm ? esc(p.altezza_cm)+" cm" : "Altezza —"}
                ${m.peso_kg ? " · "+esc(m.peso_kg)+" kg" : ""}
                ${m.bmi ? " · BMI "+esc(m.bmi) : ""}
              </div>
              <button class="secondary" id="editProfile" style="margin-top:11px">✏️ Modifica profilo</button>
            </div>
          </div>

          <div class="controlStats">
            <div class="controlStat"><b>${c.counts?.sessions || 0}</b><span>Sessioni</span></div>
            <div class="controlStat"><b>${c.counts?.sets || 0}</b><span>Serie salvate</span></div>
            <div class="controlStat"><b>${c.counts?.exercises || 0}</b><span>Esercizi DB</span></div>
            <div class="controlStat"><b>${c.counts?.measures || 0}</b><span>Misurazioni</span></div>
          </div>
        </section>

        <div class="sectionTitle"><h2>Scheda attiva</h2><span>${c.days?.length || 0} giorni</span></div>
        <div class="card planCard">
          <div>
            <span class="statusPill">● ATTIVA</span>
            <h3>${plan ? esc(plan.titolo || "Scheda") : "Nessuna scheda"}</h3>
            <div class="muted">${plan ? esc([plan.fase, plan.obiettivo].filter(Boolean).join(" · ")) : "Nessun piano attivo rilevato."}</div>
          </div>
          <button class="primary" id="controlWorkout" ${plan ? "" : "disabled"}>🏋 Apri workout</button>
        </div>

        <div class="sectionTitle"><h2>Integrazione oggi</h2><span>${done}/${total} prese</span></div>
        <div class="card">
          <div class="integrationProgress"><span style="width:${intPct}%"></span></div>
          ${integration.length ? integration.map(item=>`
            <div class="suppRow">
              <div><b>${esc(item.nome || "")}</b><div class="muted">${esc(item.dose || "")}${item.quando ? " • "+esc(item.quando) : ""}</div></div>
              <button class="toggle ${item.presa ? "on" : ""}" data-supp="${esc(item.intId)}"><span></span></button>
            </div>`).join("") : `<span class="muted">Nessun integratore configurato.</span>`}
        </div>

        <div class="sectionTitle"><h2>Strumenti</h2><span>Gestione rapida</span></div>
        <section class="controlGrid">
          <button class="controlAction" id="ccMeasure"><i>⚖️</i><b>Nuova misura</b><span>Peso e circonferenze</span></button>
          <button class="controlAction" id="ccProgress"><i>📈</i><b>Progressi</b><span>Storico e trend</span></button>
          <button class="controlAction" id="ccExercises"><i>📚</i><b>Esercizi</b><span>${c.counts?.exercises || 0} nel database</span></button>
          <button class="controlAction" id="ccNutrition"><i>🥗</i><b>Nutrizione</b><span>Dieta Smart 3.0</span></button>
          <button class="controlAction" id="ccCalendar"><i>📅</i><b>Attività</b><span>Calendario recente</span></button>
          <button class="controlAction" id="ccSystem"><i>⚙️</i><b>Sistema</b><span>Versione e database</span></button>
          <button class="controlAction" id="ccCoach2"><i>🧠</i><b>Smart Coach 3.0</b><span>Plateau, deload e recupero</span></button>
          <button class="controlAction" id="ccManage"><i>🛠️</i><b>Gestione dati</b><span>Schede, esercizi, integrazione, diete</span></button>
          <button class="controlAction" id="ccCalendar"><i>📅</i><b>Calendario</b><span>Programma allenamenti futuri</span></button>
          <button class="controlAction" id="ccBackups"><i>🛡️</i><b>Backup schede</b><span>Ripristina schede eliminate</span></button>
          <button class="controlAction" id="ccMonthlyReport"><i>📊</i><b>Report mensile</b><span>Riepilogo Smart Coach</span></button>
          <button class="controlAction" id="ccCoach3"><i>🧠</i><b>Smart Coach 3.0</b><span>Readiness, fatica e azioni</span></button>
          <button class="controlAction" id="ccGenerator"><i>✨</i><b>Generatore schede</b><span>Crea programmi automaticamente</span></button>
          <button class="controlAction" id="ccMuscles"><i>💪</i><b>Volume muscolare</b><span>Bilanciamento per gruppo</span></button>
          <button class="controlAction" id="ccPhotos"><i>📸</i><b>Foto progressi</b><span>Confronto fisico nel tempo</span></button>
          <button class="controlAction" id="ccAnnual"><i>📅</i><b>Dashboard annuale</b><span>12 mesi di allenamento</span></button>
          <button class="controlAction" id="ccAdaptive"><i>🥗</i><b>Nutrizione adattiva</b><span>Correzione kcal dal trend peso</span></button>
          <button class="controlAction" id="ccCoachMode"><i>👥</i><b>Modalità Coach</b><span>Gestisci più atleti</span></button>
          <button class="controlAction" id="ccInstall"><i>📱</i><b>Installa sul telefono</b><span>Uso rapido come app</span></button>
          <button class="controlAction" id="ccAppearance"><i>◐</i><b>Aspetto</b><span>Chiaro, scuro o automatico</span></button>
          <button class="controlAction" id="ccExport"><i>📦</i><b>Esporta i miei dati</b><span>Backup totale in ZIP</span></button>
          <button class="controlAction" id="ccProLab"><i>🚀</i><b>PT-PRO 10 Pro</b><span>Coach 4, recovery, obiettivi e strumenti</span></button>
          <button class="controlAction" id="ccAnalytics9"><i>📊</i><b>Analytics Pro</b><span>4 settimane vs precedenti</span></button>
          <button class="controlAction" id="ccCheckin9"><i>🌙</i><b>Check-in</b><span>Sonno, stress, DOMS ed energia</span></button>
          <button class="controlAction" id="ccGoals9"><i>🎯</i><b>Obiettivi</b><span>Forza, peso e misure</span></button>
          <button class="controlAction" id="ccNotifications9"><i>🔔</i><b>Centro notifiche</b><span>Reminder intelligenti</span></button>
          <button class="controlAction" id="ccIntegrity9"><i>🧪</i><b>Integrità database</b><span>Controllo errori e riferimenti</span></button>
        </section>

        <div class="sectionTitle"><h2>Ultime attività</h2><span>${(c.recentSessions||[]).length}</span></div>
        <div class="card">
          ${(c.recentSessions||[]).length ? c.recentSessions.slice(0,5).map(s=>`
            <div class="historyRow">
              <div><b>${fmtDate(s.dataOraStart)}</b><div class="muted">${esc(s.giornoId || "Workout")}</div></div>
              <div style="text-align:right"><b>${s.durataMin ? esc(s.durataMin)+" min" : "—"}</b><div class="muted">${esc(s.completamento || 0)}%</div></div>
            </div>`).join("") : `<span class="muted">Nessuna sessione recente.</span>`}
        </div>
      `);

      document.querySelectorAll("[data-supp]").forEach(button=>{
        button.onclick = async()=>{
          const item = integration.find(x=>String(x.intId)===String(button.dataset.supp));
          if(!item) return;
          const presa = !button.classList.contains("on");
          button.classList.toggle("on",presa);
          try{
            await gas("api_toggleSupplement",{...item,presa});
            item.presa=presa;
            await refresh();
            more();
          }catch(e){button.classList.toggle("on",!presa);toast(e.message)}
        };
      });

      $("#editProfile").onclick = ()=>profileEditor(c);
      $("#controlWorkout").onclick = ()=>go("workout");
      $("#ccMeasure").onclick = measureForm;
      $("#ccProgress").onclick = ()=>go("progress");
      $("#ccExercises").onclick = exercises;
      $("#ccNutrition").onclick = ()=>go("nutrition");
      $("#ccCalendar").onclick = ()=>controlCalendar(c);
      $("#ccSystem").onclick = ()=>systemInfo(c);
      $("#ccCoach2").onclick = smartCoach2;
      $("#ccManage").onclick = dataManager;
      $("#ccCalendar").onclick = calendarManager;
      $("#ccBackups").onclick = planBackups;
      $("#ccMonthlyReport").onclick = monthlyCoachReport;
      $("#ccCoach3").onclick = smartCoach3;
      $("#ccGenerator").onclick = workoutGenerator;
      $("#ccMuscles").onclick = muscleVolume;
      $("#ccPhotos").onclick = progressPhotos;
      $("#ccAnnual").onclick = () => annualDashboard();
      $("#ccAdaptive").onclick = adaptiveNutrition;
      $("#ccCoachMode").onclick = coachMode;
      $("#ccInstall").onclick = installGuide;
      $("#ccAppearance").onclick = appearanceSettings;
      $("#ccExport").onclick = exportDataCenter;
      $("#ccProLab").onclick = proLab9;
      $("#ccAnalytics9").onclick = analyticsPro9;
      $("#ccCheckin9").onclick = weeklyCheckin9;
      $("#ccGoals9").onclick = goals9;
      $("#ccNotifications9").onclick = notifications9;
      $("#ccIntegrity9").onclick = integrity9;
    }

    function profileEditor(c){
      const p=c.profile||{};
      layout(`
        <div class="viewTitle"><h1>Profilo</h1><div class="muted">Aggiorna i dati usati da PT-PRO.</div></div>
        <div class="card">
          <div class="grid2">
            <div class="field"><label>Nome</label><input id="pfNome" value="${esc(p.nome||"")}"></div>
            <div class="field"><label>Data di nascita</label><input id="pfBirth" type="date" value="${esc(String(p.dataNascita||"").slice(0,10))}"></div>
            <div class="field"><label>Altezza (cm)</label><input id="pfHeight" inputmode="decimal" value="${esc(p.altezza_cm||"")}"></div>
            <div class="field"><label>URL foto</label><input id="pfPhoto" value="${esc(p.fotoUrl||"")}" placeholder="https://..."></div>
          </div>
          <div class="field"><label>Note</label><textarea id="pfNotes" rows="4">${esc(p.note||"")}</textarea></div>
          <div class="profileFormActions"><button class="secondary" id="pfCancel">Annulla</button><button class="primary" id="pfSave">Salva profilo</button></div>
        </div>
      `);
      $("#pfCancel").onclick=more;
      $("#pfSave").onclick=async()=>{
        try{
          await gas("api_updateProfile",{nome:$("#pfNome").value,dataNascita:$("#pfBirth").value,altezza_cm:$("#pfHeight").value,fotoUrl:$("#pfPhoto").value,note:$("#pfNotes").value});
          toast("Profilo aggiornato ✓");
          await refresh();
          more();
        }catch(e){toast(e.message)}
      };
    }

    function controlCalendar(c){
      const events=c.recentCalendar||[];
      layout(`
        <div class="viewTitle"><h1>Attività</h1><div class="muted">Eventi recenti registrati in PT-PRO.</div></div>
        <div class="card">
          ${events.length ? events.map(e=>`
            <div class="calendarItem">
              <div class="calendarDate">${fmtDate(e.start || e.data || e.date)}</div>
              <div><b>${esc(e.title || e.titolo || e.tipo || "Attività")}</b><div class="muted">${esc(e.note || "")}</div></div>
              <span class="muted">${esc(e.tipo || "")}</span>
            </div>`).join("") : `<span class="muted">Nessun evento disponibile.</span>`}
        </div>
        <div style="margin-top:12px"><button class="secondary big" id="backCC">← Centro controllo</button></div>
      `);
      $("#backCC").onclick=more;
    }

    function systemInfo(c){
      layout(`
        <div class="viewTitle"><h1>Sistema</h1><div class="muted">Stato tecnico della tua PT-PRO.</div></div>
        <div class="card">
          <div class="systemRow"><span>Applicazione</span><b>${esc(c.app || "PT-PRO")}</b></div>
          <div class="systemRow"><span>Versione</span><b>${esc(c.version || "")}</b></div>
          <div class="systemRow"><span>Database</span><b style="color:var(--green)">● Collegato</b></div>
          <div class="systemRow"><span>Scheda attiva</span><b>${c.plan ? esc(c.plan.titolo || "Sì") : "No"}</b></div>
          <div class="systemRow"><span>Sessioni</span><b>${c.counts?.sessions || 0}</b></div>
          <div class="systemRow"><span>Serie workout</span><b>${c.counts?.sets || 0}</b></div>
          <div class="systemRow"><span>Misure</span><b>${c.counts?.measures || 0}</b></div>
          <div class="systemRow"><span>Esercizi</span><b>${c.counts?.exercises || 0}</b></div>
        </div>
        <div class="sectionTitle"><h2>Azioni</h2></div>
        <div class="card dangerZone"><b>Ricarica dati</b><p class="muted">Forza una nuova lettura del database senza cancellare nulla.</p><button class="secondary big" id="reloadData">↻ Ricarica PT-PRO</button></div>
        <div style="margin-top:12px"><button class="secondary big" id="backCC2">← Centro controllo</button></div>
      `);
      $("#reloadData").onclick=async()=>{try{await refresh();toast("Dati aggiornati ✓");more()}catch(e){toast(e.message)}};
      $("#backCC2").onclick=more;
    }


    