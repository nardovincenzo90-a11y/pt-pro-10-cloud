/* =========================================================
       LAYOUT
       ========================================================= */

    function header(){

      const profile = state.boot?.profile || {};
      const name = profile.nome || "Vincenzo";
      const notifications = state.boot?.coach?.notifications || [];
      const count = notifications.length;

      return `
        <header class="topbar">
          <div class="brand">
            <div class="logo"></div>
            <div>
              <strong>PT-PRO</strong>
              <span>Smart Performance</span>
            </div>
          </div>

          <div class="topActions">
            <div class="themeClock"><b id="liveClock">--:--</b><span id="themeModeLabel">Auto</span></div>
            <button class="iconBtn" id="quickThemeBtn" aria-label="Tema">◐</button>
            <button class="iconBtn" id="notificationBtn" aria-label="Notifiche">
              🔔
              ${count ? `<span class="notifBadge">${count}</span>` : ''}
            </button>
            <div class="avatar">${esc(name.slice(0,1).toUpperCase())}</div>
          </div>
        </header>
      `;
    }


    function bottomNav(){

      const items = [

        [
          "home",
          "⌂",
          "Home"
        ],

        [
          "workout",
          "🏋",
          "Workout"
        ],

        [
          "progress",
          "↗",
          "Progressi"
        ],

        [
          "nutrition",
          "🥗",
          "Nutrizione"
        ],

        [
          "more",
          "☰",
          "Altro"
        ]

      ];


      return `

        <nav class="bottomNav">

          ${
            items.map(
              item => `

                <button
                  data-nav="${item[0]}"
                  class="${
                    state.view ===
                    item[0]
                      ? "active"
                      : ""
                  }"
                >

                  <b>
                    ${item[1]}
                  </b>

                  ${item[2]}

                </button>

              `
            )
            .join("")
          }

        </nav>

      `;

    }



    /* =========================================================
       ASPETTO · CHIARO / SCURO / AUTO + ORA
       ========================================================= */
    const THEME_KEY="ptpro_theme_mode";
    let clockTimer=null;

    function getThemeMode(){
      return localStorage.getItem(THEME_KEY)||"auto";
    }

    function resolvedTheme(mode){
      if(mode==="light"||mode==="dark") return mode;
      const h=new Date().getHours();
      return (h>=7 && h<19) ? "light" : "dark";
    }

    function applyTheme(mode){
      mode=mode||getThemeMode();
      localStorage.setItem(THEME_KEY,mode);
      document.documentElement.dataset.theme=resolvedTheme(mode);
      const label=$("#themeModeLabel");
      if(label) label.textContent=mode==="auto"?"Auto · "+(resolvedTheme(mode)==="light"?"Chiaro":"Scuro"):(mode==="light"?"Chiaro":"Scuro");
      document.querySelectorAll("[data-theme-mode]").forEach(b=>b.classList.toggle("active",b.dataset.themeMode===mode));
    }

    function updateClock(){
      const el=$("#liveClock");
      if(el) el.textContent=new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
      if(getThemeMode()==="auto") applyTheme("auto");
    }

    function initAppearanceUi(){
      applyTheme(getThemeMode());
      const qb=$("#quickThemeBtn");
      if(qb) qb.onclick=()=>{
        const current=getThemeMode();
        const next=current==="auto"?"dark":current==="dark"?"light":"auto";
        applyTheme(next);
        toast("Tema: "+(next==="auto"?"automatico":next==="dark"?"scuro":"chiaro"));
      };
      updateClock();
      if(clockTimer) clearInterval(clockTimer);
      clockTimer=setInterval(updateClock,30000);
    }

    function appearanceSettings(){
      state.view="more";
      const mode=getThemeMode();
      layout(`
        <div class="viewTitle"><h1>Aspetto</h1><div class="muted">Scegli il tema oppure lascia che PT-PRO cambi automaticamente in base all'ora.</div></div>
        <div class="card">
          <div class="eyebrow">TEMA</div>
          <div class="themeSegment" style="margin-top:10px">
            <button data-theme-mode="light">☀️ Chiaro</button>
            <button data-theme-mode="dark">🌙 Scuro</button>
            <button data-theme-mode="auto">◐ Auto</button>
          </div>
          <div class="adminNotice" style="margin-top:12px">In modalità Auto: tema chiaro dalle 07:00 alle 18:59 e tema scuro dalle 19:00 alle 06:59. L'ora mostrata in alto usa l'orologio del dispositivo.</div>
        </div>
        <div class="sectionTitle"><h2>Ora locale</h2></div>
        <div class="card" style="text-align:center"><div id="appearanceClock" style="font-size:42px;font-weight:900">--:--</div><div class="muted">${new Date().toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div></div>
        <div style="margin-top:12px"><button class="secondary big" id="appearanceBack">← Centro controllo</button></div>`);
      document.querySelectorAll("[data-theme-mode]").forEach(b=>b.onclick=()=>{applyTheme(b.dataset.themeMode);toast("Aspetto aggiornato ✓")});
      $("#appearanceBack").onclick=more;
      const tick=()=>{const e=$("#appearanceClock");if(e)e.textContent=new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit",second:"2-digit"})};
      tick();
      setTimeout(tick,500);
      applyTheme(mode);
    }


    function layout(
      content
    ){

      $("#app").innerHTML = `

        <main class="app">

          ${header()}

          ${content}

        </main>

        ${bottomNav()}

      `;

      setTimeout(initAppearanceUi,0);


      document
        .querySelectorAll(
          "[data-nav]"
        )
        .forEach(
          button => {

            button.onclick =
              () =>
                go(
                  button.dataset.nav
                );

          }
        );

      const notificationBtn = $("#notificationBtn");
      if(notificationBtn){ notificationBtn.onclick = showNotifications; }

    }


    function go(
      view
    ){

      state.view =
        view;


      if(
        view ===
        "home"
      ){

        home();

      }


      if(
        view ===
        "workout"
      ){

        workoutLanding();

      }


      if(
        view ===
        "progress"
      ){

        progress();

      }


      if(
        view ===
        "nutrition"
      ){

        nutrition();

      }


      if(
        view ===
        "more"
      ){

        more();

      }

    }


    /* =========================================================
       MINI GRAFICO
       ========================================================= */

    function spark(
      values
    ){

      const data =
        values
          .map(Number)
          .filter(
            Number.isFinite
          );


      if(
        data.length <
        2
      ){

        return `

          <div class="muted">
            Servono almeno due rilevazioni.
          </div>

        `;

      }


      const min =
        Math.min(
          ...data
        );


      const max =
        Math.max(
          ...data
        );


      const range =
        max -
        min ||
        1;


      const points =
        data.map(
          (
            value,
            index
          ) => {

            const x =
              index /
              (
                data.length -
                1
              )
              *
              100;


            const y =
              90 -
              (
                value -
                min
              )
              /
              range
              *
              70;


            return (
              x +
              "," +
              y
            );

          }
        )
        .join(" ");


      return `

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >

          <polyline
            points="${points}"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            vector-effect="non-scaling-stroke"
          />

          <line
            x1="0"
            y1="94"
            x2="100"
            y2="94"
            stroke="currentColor"
            opacity=".16"
          />

        </svg>

      `;

    }


    /* =========================================================
       HOME
       ========================================================= */

    function home(){
      const boot=state.boot;
      const profile=boot.profile||{};
      const plan=boot.plan;
      const days=boot.days||[];
      const measure=boot.measures?.[0];
      const metrics=sessionMetrics(boot.sessions||[]);
      const delta=weightDelta(boot.measures||[]);
      const last=metrics.completed[0]||null;
      const coach=boot.coach||{};
      const next=coach.nextDay||days[0]||null;
      const insights=coach.insights||[];
      const prs=coach.recentPRs||[];

      layout(`
        <section class="hero">
          <div class="card heroMain">
            <div>
              <div class="eyebrow">${esc(todayLabel())}</div>
              <h1>Ciao ${esc(profile.nome||'Vincenzo')}.</h1>
              <p>${plan ? `Scheda attiva: <b>${esc(plan.titolo||'Scheda')}</b>` : 'Nessuna scheda disponibile.'}</p>
            </div>
            <div>${days.length ? `<button class="primary big" id="startWorkout">▶ Inizia allenamento</button>` : `<button class="secondary big" id="goWorkout">Vai agli allenamenti</button>`}</div>
          </div>

          <div class="stats">
            <div class="stat"><b>${coach.workoutsWeek ?? metrics.thisWeek.length}</b><span>Workout settimana</span></div>
            <div class="stat"><b>${fmtNum(measure?.peso_kg,' kg')}</b><span>Peso</span></div>
            <div class="stat"><b>${coach.streak ?? metrics.streak}</b><span>Streak giorni</span></div>
            <div class="stat"><b>${(coach.weekMinutes ?? metrics.weekMinutes) ? (coach.weekMinutes ?? metrics.weekMinutes)+'′' : '—'}</b><span>Minuti settimana</span></div>
          </div>
        </section>

        <div id="adaptiveHome" style="margin-top:14px"></div>

        <div class="sectionTitle"><h2>Smart Coach</h2><span>Indicazioni dai tuoi dati</span></div>
        <div class="card coachCard">
          <div class="coachHead">
            <div class="coachTitle"><div class="coachOrb">✦</div><div><div class="eyebrow">PT-PRO COACH</div><b>Il tuo riepilogo di oggi</b></div></div>
            <span class="readiness ${esc(coach.readinessTone||'good')}">${esc(coach.readiness||'Pronto')}</span>
          </div>

          ${next ? `<div class="coachNext"><div><div class="eyebrow">PROSSIMO WORKOUT</div><h3>${esc(next.nomeGiorno||'Allenamento')}</h3><div class="muted">${esc(next.focus||'Continua la tua scheda attiva')}</div></div><button class="primary" id="coachStart">Apri →</button></div>` : `<div class="coachEmpty">Nessun workout programmato.</div>`}

          <div class="coachInsights">
            ${insights.length ? insights.map(x=>`<div class="coachInsight"><i>${x.icon||'•'}</i><b>${esc(x.title||'')}</b><span>${esc(x.text||'')}</span></div>`).join('') : `<div class="coachInsight"><i>📊</i><b>Dati in raccolta</b><span>Completa qualche workout per ricevere insight.</span></div>`}
          </div>

          <div class="coachMetrics">
            <div class="coachMetric"><b>${coach.adherence ?? 0}%</b><span>Aderenza</span></div>
            <div class="coachMetric"><b>${formatVolume(coach.weekVolume||0)}</b><span>Volume settimana</span></div>
            <div class="coachMetric"><b>${coach.integrationTotal ? `${coach.integrationTaken}/${coach.integrationTotal}` : '—'}</b><span>Integrazione</span></div>
          </div>
        </div>

        <div class="sectionTitle"><h2>Performance</h2><span>La situazione adesso</span></div>
        <div class="proGrid">
          <div class="proKpi"><b>${metrics.avgDuration ? metrics.avgDuration+'′' : '—'}</b><span>Durata media</span></div>
          <div class="proKpi"><b>${metrics.avgCompletion ? metrics.avgCompletion+'%' : '—'}</b><span>Completamento medio</span></div>
          <div class="proKpi"><b>${fmtNum(measure?.vita_cm,' cm')}</b><span>Vita attuale</span></div>
          <div class="proKpi"><b>${deltaHtml(delta,' kg')}</b><span>Trend peso ultime misure</span></div>
        </div>

        <div class="sectionTitle"><h2>Azioni rapide</h2><span>Tutto a portata di mano</span></div>
        <section class="quick">
          <button id="quickWorkout"><i>🏋️</i><b>Allenati</b></button>
          <button id="quickWeight"><i>⚖️</i><b>Nuova misura</b></button>
          <button id="quickProgress"><i>📈</i><b>Progressi</b></button>
          <button id="quickNutrition"><i>🥗</i><b>Nutrizione</b></button>
        </section>

        ${prs.length ? `<div class="sectionTitle"><h2>PR recenti</h2><span>${prs.length}</span></div><div class="card prList">${prs.slice(0,4).map(pr=>`<div class="historyRow"><div style="display:flex;align-items:center;gap:10px"><div class="prIcon">🏆</div><div><b>${esc(pr.exNome)}</b><div class="muted">${fmtDate(pr.date)} · ${pr.type==='load'?'Record carico':'Record e1RM'}</div></div></div><div style="text-align:right"><b>${esc(pr.load)} kg × ${esc(pr.reps)}</b><div class="muted">e1RM ${esc(pr.e1rm)} kg</div></div></div>`).join('')}</div>` : ''}

        ${last ? `<div class="sectionTitle"><h2>Ultimo allenamento</h2><span>${fmtDate(last.dataOraStart)}</span></div><div class="card sessionHero"><div><div class="eyebrow">SESSIONE</div><h2 style="margin:6px 0 4px">${esc(last.giornoId||'Workout')}</h2><div class="muted">${last.eserciziLoggati||0}/${last.eserciziPrevisti||'—'} esercizi registrati</div></div><div style="text-align:right"><div class="bigValue">${last.durataMin||'—'}′</div><div class="muted">${last.completamento||0}% completato</div></div></div>` : ''}

        ${days.length ? `<div class="sectionTitle"><h2>La tua scheda</h2><span>${days.length} giorni</span></div><div class="days">${days.map((day,index)=>`<button class="day ${index===0?'active':''}" data-day="${esc(day.giornoId)}"><b>${esc(day.nomeGiorno||'Allenamento')}</b><div class="muted" style="font-size:11px;margin-top:5px">${esc(day.focus||'')}</div></button>`).join('')}</div>` : ''}

        <div class="sectionTitle"><h2>Andamento peso</h2><span>Ultime misure</span></div>
        <div class="card chart">${spark([...(boot.measures||[])].reverse().map(item=>item.peso_kg))}</div>
      `);

      $('#quickWorkout').onclick=()=>go('workout');
      $('#quickWeight').onclick=measureForm;
      $('#quickProgress').onclick=()=>go('progress');
      $('#quickNutrition').onclick=()=>go('nutrition');
      loadQuickActions9();
      const startBtn=$('#startWorkout'); if(startBtn&&days[0]) startBtn.onclick=()=>chooseWorkoutDay(days);
      const coachStart=$('#coachStart'); if(coachStart&&next) coachStart.onclick=()=>openWorkout(next.giornoId);
      const goBtn=$('#goWorkout'); if(goBtn) goBtn.onclick=()=>go('workout');
      document.querySelectorAll('[data-day]').forEach(button=>button.onclick=()=>openWorkout(button.dataset.day));
      loadAdaptiveHome();
    }


    function showNotifications(){
      const notifications=state.boot?.coach?.notifications||[];
      layout(`
        <div class="viewTitle"><h1>Notifiche</h1><div class="muted">Promemoria e segnali utili da PT-PRO.</div></div>
        <div class="card">
          ${notifications.length ? notifications.map((n,i)=>`<div class="notificationItem" data-notification="${i}"><div class="notificationIcon">${n.icon||'🔔'}</div><div><b>${esc(n.title||'Notifica')}</b><span>${esc(n.text||'')}</span></div></div>`).join('') : `<div class="coachEmpty">Nessuna notifica al momento.</div>`}
        </div>
        <div style="margin-top:12px"><button class="secondary big" id="backHomeNotif">← Torna alla Home</button></div>
      `);
      $('#backHomeNotif').onclick=()=>go('home');
      document.querySelectorAll('[data-notification]').forEach(el=>el.onclick=()=>{
        const n=notifications[Number(el.dataset.notification)];
        if(!n) return;
        if(n.action==='workout' && n.giornoId) openWorkout(n.giornoId); else go(n.action||'home');
      });
    }


    /* =========================================================
       WORKOUT
       ========================================================= */

    function workoutLanding(){

      const days =
        state.boot.days ||
        [];


      const sessions =
        state.boot.sessions ||
        [];


      layout(`

        <div class="viewTitle">

          <h1>
            Allenamento
          </h1>

          <div class="muted">
            Scegli il giorno.
          </div>

        </div>


        ${
          days.length

            ? `

              <div class="days">

                ${
                  days.map(
                    day => `

                      <button
                        class="day"
                        data-day="${esc(
                          day.giornoId
                        )}"
                      >

                        <b>
                          ${esc(
                            day.nomeGiorno ||
                            "Allenamento"
                          )}
                        </b>

                        <div
                          class="muted"
                          style="
                            font-size:11px;
                            margin-top:5px
                          "
                        >

                          ${esc(
                            day.focus ||
                            ""
                          )}

                        </div>

                      </button>

                    `
                  )
                  .join("")
                }

              </div>

            `

            : `

              <div class="card">

                <b>
                  Nessuna scheda disponibile.
                </b>

                <p class="muted">
                  Non risultano giorni di allenamento.
                </p>

              </div>

            `
        }


        <div class="sectionTitle">

          <h2>
            Sessioni recenti
          </h2>

        </div>


        <div class="card">

          ${
            sessions
              .slice(
                0,
                8
              )
              .map(
                session => `

                  <div class="historyRow">

                    <div>

                      <b>
                        ${fmtDate(
                          session.dataOraStart
                        )}
                      </b>

                      <div class="muted">

                        ${esc(
                          session.giornoId ||
                          "Workout"
                        )}

                      </div>

                    </div>


                    <div
                      style="
                        text-align:right
                      "
                    >

                      <b>

                        ${
                          session.durataMin
                            ? esc(
                                session.durataMin
                              )
                              +
                              " min"
                            : "—"
                        }

                      </b>

                      <div class="muted">

                        ${esc(
                          session.completamento ||
                          0
                        )}%

                      </div>

                    </div>

                  </div>

                `
              )
              .join("")

            ||

            `
              <span class="muted">
                Nessuna sessione registrata.
              </span>
            `
          }

        </div>

      `);


      document
        .querySelectorAll(
          "[data-day]"
        )
        .forEach(
          button => {

            button.onclick =
              () =>
                openWorkout(
                  button.dataset.day
                );

          }
        );

    }



    function chooseWorkoutDay(daysOverride){
      const days=(daysOverride||state.boot?.days||[]).filter(Boolean);

      if(!days.length){
        toast("Nessun giorno disponibile nella scheda attiva");
        return;
      }

      // Se la scheda ha un solo giorno, non serve un passaggio in più.
      if(days.length===1){
        openWorkout(days[0].giornoId);
        return;
      }

      state.view="workout";

      layout(`
        <div class="viewTitle">
          <h1>Scegli allenamento</h1>
          <div class="muted">Quale giorno della scheda vuoi eseguire oggi?</div>
        </div>

        <div class="manageList">
          ${days.map((day,index)=>`
            <button
              class="manageItem"
              data-choose-workout="${esc(day.giornoId)}"
              style="width:100%;text-align:left;cursor:pointer"
            >
              <div class="manageItemMain">
                <b>${index+1}. ${esc(day.nomeGiorno||("Giorno "+(index+1)))}</b>
                <span>${esc(day.focus||"")}</span>
              </div>
              <div style="font-size:20px;color:var(--muted)">›</div>
            </button>
          `).join("")}
        </div>

        <div style="margin-top:14px">
          <button class="secondary big" id="chooseWorkoutBack">← Torna alla Home</button>
        </div>
      `);

      document.querySelectorAll("[data-choose-workout]").forEach(btn=>{
        btn.onclick=()=>openWorkout(btn.dataset.chooseWorkout);
      });

      $("#chooseWorkoutBack").onclick=()=>home();
    }

    async function openWorkout(
      giornoId
    ){

      layout(`

        <div class="loading">

          <div>

            <div class="spinner"></div>

            Carico workout…

          </div>

        </div>

      `);


      try{

        state.workout =
          await gas(
            "api_getWorkout",
            giornoId
          );

        try{
          const rowIds=(state.workout.exercises||[]).map(x=>x.rowId).filter(Boolean);
          const adv=await gas("api_getWorkoutAdvanced9",{rowIds});
          state.workoutAdvanced=adv.map||{};
          const pref=await gas("api_pt9GetPrefs");
          state.effortMode=(pref.prefs?.effortMode||localStorage.getItem("ptpro_effort_mode")||"RIR").toUpperCase();
        }catch(e){
          state.workoutAdvanced={};
          state.effortMode=localStorage.getItem("ptpro_effort_mode")||"RIR";
        }

        renderWorkout();


      }catch(error){

        toast(
          error.message
        );

        go(
          "workout"
        );

      }

    }


function renderWorkout(){

  const day =
    state.workout.day;

  const exercises =
    state.workout.exercises || [];


  state.totalSets =
    exercises.reduce(
      (sum, exercise) =>
        sum +
        Math.max(
          1,
          Number(exercise.serie) || 1
        ),
      0
    );


  const percent =
    state.totalSets
      ? Math.round(
          state.completedSets /
          state.totalSets *
          100
        )
      : 0;


  layout(`

    ${
      state.session
        ? `

          <div class="workoutProTop">

            <div class="workoutProHead">

              <div class="workoutProTitle">

                <b>
                  ${esc(
                    day.nomeGiorno ||
                    "Workout"
                  )}
                </b>

                <span id="workoutProgressText">
                  ${state.completedSets}/${state.totalSets}
                  serie completate
                </span>

              </div>


              <div
                class="workoutClock"
                id="workoutClock"
              >
                00:00:00
              </div>

            </div>


            <div class="workoutProgress">

              <div
                class="workoutProgressFill"
                id="workoutProgressFill"
                style="width:${percent}%"
              ></div>

            </div>


            <div class="workoutMiniStats">

              <div class="workoutMiniStat">

                <b id="miniPercent">
                  ${percent}%
                </b>

                <span>
                  completato
                </span>

              </div>


              <div class="workoutMiniStat">

                <b id="miniVolume">
                  ${formatVolume(
                    state.workoutVolume
                  )}
                </b>

                <span>
                  volume
                </span>

              </div>


              <div class="workoutMiniStat">

                <b>
                  ${exercises.length}
                </b>

                <span>
                  esercizi
                </span>

              </div>

            </div>

          </div>

        `
        : ""
    }


    <div class="workoutHeader">

      <div class="viewTitle">

        <h1>
          ${esc(
            day.nomeGiorno ||
            "Workout"
          )}
        </h1>

        <div class="muted">
          ${esc(
            day.focus ||
            ""
          )}
        </div>

      </div>


      ${
        state.session

          ? `

            <button
              class="danger"
              id="finishWorkout"
            >
              Termina
            </button>

          `

          : `

            <button
              class="primary"
              id="beginWorkout"
            >
              Inizia
            </button>

          `
      }

    </div>


    ${
      exercises.length

        ? exercises
            .map(
              (
                exercise,
                index
              ) =>
                renderExercise(
                  exercise,
                  index
                )
            )
            .join("")

        : `

          <div class="card">
            Nessun esercizio presente.
          </div>

        `
    }


    <div
      class="restOverlay"
      id="restOverlay"
    >

      <div class="restOverlayTop">

        <div>

          <div class="muted">
            Recupero
          </div>

          <div
            class="restTime"
            id="restTime"
          >
            00:00
          </div>

        </div>

        <div>
          ⏱️
        </div>

      </div>


      <div class="restActions">

        <button
          class="secondary"
          id="restMinus"
        >
          −15s
        </button>

        <button
          class="secondary"
          id="restSkip"
        >
          Salta
        </button>

        <button
          class="secondary"
          id="restPlus"
        >
          +15s
        </button>

      </div>

    </div>

  `);


  if(state.session){

    bindSets();

    startSessionClock();

    bindRestControls();

    focusFirstPendingSet();

  }else{

    const begin =
      $("#beginWorkout");

    if(begin){

      begin.onclick =
        beginWorkout;

    }

  }


  const finish =
    $("#finishWorkout");


  if(finish){

    finish.onclick =
      finishWorkout;

  }


  exercises.forEach(
    exercise => {

      loadSuggestion(
        exercise.exId
      );

    }
  );

  document
    .querySelectorAll("[data-history]")
    .forEach(button => {

      button.onclick =
        () => openExerciseHistory(
          button.dataset.history
        );

    });


  bindProWorkoutTools9();

}

function formatVolume(value){

  const n =
    Number(value || 0);

  if(n >= 1000){

    return (
      (
        n / 1000
      )
      .toFixed(1)
      .replace(".",",")
      +
      "k kg"
    );

  }

  return (
    Math.round(n)
    +
    " kg"
  );

}


function updateWorkoutProgress(){

  const percent =
    state.totalSets

      ? Math.round(
          state.completedSets /
          state.totalSets *
          100
        )

      : 0;


  const text =
    $("#workoutProgressText");


  if(text){

    text.textContent =
      state.completedSets
      +
      "/"
      +
      state.totalSets
      +
      " serie completate";

  }


  const fill =
    $("#workoutProgressFill");


  if(fill){

    fill.style.width =
      percent +
      "%";

  }


  const miniPercent =
    $("#miniPercent");


  if(miniPercent){

    miniPercent.textContent =
      percent +
      "%";

  }


  const volume =
    $("#miniVolume");


  if(volume){

    volume.textContent =
      formatVolume(
        state.workoutVolume
      );

  }


  updateExerciseCompletion();

}


function startSessionClock(){

  clearInterval(
    state.sessionTick
  );


  function draw(){

    if(
      !state.session ||
      !state.session.start
    ){
      return;
    }


    const elapsed =
      Math.max(
        0,
        Math.floor(
          (
            Date.now() -
            state.session.start
          )
          /
          1000
        )
      );


    const hours =
      String(
        Math.floor(
          elapsed /
          3600
        )
      )
      .padStart(
        2,
        "0"
      );


    const minutes =
      String(
        Math.floor(
          (
            elapsed %
            3600
          )
          /
          60
        )
      )
      .padStart(
        2,
        "0"
      );


    const seconds =
      String(
        elapsed %
        60
      )
      .padStart(
        2,
        "0"
      );


    const clock =
      $("#workoutClock");


    if(clock){

      clock.textContent =
        hours
        +
        ":"
        +
        minutes
        +
        ":"
        +
        seconds;

    }

  }


  draw();


  state.sessionTick =
    setInterval(
      draw,
      1000
    );

}


function focusFirstPendingSet(){

  const pending =
    document.querySelector(
      ".setRow:not(.savedSet)"
    );


  document
    .querySelectorAll(
      ".setRow"
    )
    .forEach(
      row =>
        row.classList.remove(
          "currentSet"
        )
    );


  if(!pending){
    return;
  }


  pending.classList.add(
    "currentSet"
  );


  const input =
    pending.querySelector(
      "[data-load]"
    );


  if(input){

    setTimeout(
      () =>
        input.focus(),
      120
    );

  }

}


function focusNextSet(
  currentRow
){

  if(!currentRow){
    return;
  }


  currentRow.classList.remove(
    "currentSet"
  );


  let next =
    currentRow
      .nextElementSibling;


  while(next){

    if(
      next.classList &&
      next.classList.contains(
        "setRow"
      )
      &&
      !next.classList.contains(
        "savedSet"
      )
    ){
      break;
    }

    next =
      next.nextElementSibling;

  }


  if(!next){

    const all =
      Array.from(
        document.querySelectorAll(
          ".setRow:not(.savedSet)"
        )
      );


    next =
      all[0] ||
      null;

  }


  if(next){

    next.classList.add(
      "currentSet"
    );


    const input =
      next.querySelector(
        "[data-load]"
      );


    if(input){

      setTimeout(
        () =>
          input.focus(),
        150
      );

    }

  }

}


function updateExerciseCompletion(){

  document
    .querySelectorAll(
      ".exercise"
    )
    .forEach(
      exercise => {

        const sets =
          exercise.querySelectorAll(
            ".setRow"
          );


        const done =
          exercise.querySelectorAll(
            ".setRow.savedSet"
          );


        const status =
          exercise.querySelector(
            "[data-ex-status]"
          );


        if(
          sets.length > 0 &&
          done.length === sets.length
        ){

          exercise.classList.add(
            "completedExercise"
          );


          if(status){

            status.textContent =
              "✓ completato";

            status.classList.add(
              "done"
            );

          }

        }else{

          exercise.classList.remove(
            "completedExercise"
          );


          if(status){

            status.textContent =
              done.length
              +
              "/"
              +
              sets.length;

          }

        }

      }
    );

}
    function renderExercise(
  exercise,
  exerciseIndex
){

  const series =
    Math.max(
      1,
      Number(
        exercise.serie
      )
      ||
      1
    );


  const previous =
    state.workout
      .previous?.[
        String(
          exercise.exId
        )
      ]
    ||
    [];


  return `

    <details
      class="exercise"
      data-exercise="${esc(
        exercise.exId
      )}"
      open
    >

      <summary>

        <div class="exerciseSummaryLeft">
          ${imageTag(exercise.imgUrl,"exerciseThumb",exercise.exNome)}
          <div>

          <div class="exerciseTopLine">

            <span class="exerciseNumber">

              ${exerciseIndex + 1}

            </span>


            <div class="exName">

              ${esc(
                exercise.exNome
              )}

            </div>

          </div>


          <div class="exMeta">

            ${esc(
              exercise.gruppo ||
              ""
            )}

            ${
              exercise.ripetizioni

                ? " • "
                  +
                  esc(
                    exercise.ripetizioni
                  )
                  +
                  " rep"

                : ""
            }

            ${
              exercise.recupero_sec

                ? " • "
                  +
                  esc(
                    exercise.recupero_sec
                  )
                  +
                  " sec"

                : ""
            }

          </div>

          </div>
        </div>


        <div
          class="exerciseStatus"
          data-ex-status
        >
          0/${series}
        </div>

      </summary>


      <div class="exerciseBody">

        ${exercise.imgUrl ? `<div class="exerciseMedia">${imageTag(exercise.imgUrl,"",exercise.exNome)}</div>` : ""}
        ${state.workoutAdvanced?.[String(exercise.rowId)]?.technique && state.workoutAdvanced[String(exercise.rowId)].technique!=="standard" ? `<div class="techniqueBox"><b>⚡ ${esc(state.workoutAdvanced[String(exercise.rowId)].technique)}</b>${state.workoutAdvanced[String(exercise.rowId)].groupId?` · ${esc(state.workoutAdvanced[String(exercise.rowId)].groupId)}`:""}</div>` : ""}

        <div class="setHead">

          <span>#</span>

          <span>KG</span>

          <span>REP</span>

          <span>${state.effortMode==="RPE"?"RPE":"RIR"}</span>

          <span>PREC.</span>

          <span></span>

        </div>


        ${
          Array.from(
            {
              length:
                series
            },
            (
              _,
              index
            ) => {

              const prev =
                previous[index];


              return `

                <div
                  class="setRow"
                  data-setrow
                >

                  <b>
                    ${index + 1}
                  </b>


                  <input
                    inputmode="decimal"
                    placeholder="kg"
                    data-load
                    value="${
                      prev?.load !==
                      undefined
                      &&
                      prev?.load !==
                      ""
                        ? esc(
                            prev.load
                          )
                        : ""
                    }"
                  >


                  <input
                    inputmode="numeric"
                    placeholder="rep"
                    data-reps
                  >


                  <input
                    inputmode="numeric"
                    placeholder="${state.effortMode==="RPE"?"RPE":"RIR"}"
                    data-rir
                  >


                  <div class="previous">

                    ${
                      prev

                        ? esc(
                            prev.load
                          )
                          +
                          "×"
                          +
                          esc(
                            prev.reps
                          )

                        : "—"
                    }

                  </div>


                  <button
                    class="check"
                    data-check
                    data-ex="${esc(
                      exercise.exId
                    )}"
                    data-name="${esc(
                      exercise.exNome
                    )}"
                    data-set="${
                      index + 1
                    }"
                    data-rest="${esc(
                      exercise.recupero_sec ||
                      90
                    )}"
                  >
                    ✓
                  </button>

                </div>

              `;

            }
          )
          .join("")
        }


        <div
          class="setSavedMsg"
          data-save-msg
        ></div>


        <div
          class="suggestion"
          id="suggest_${esc(
            exercise.exId
          )}"
        >
          Analizzo storico…
        </div>

        <div class="exActions">

          <button
            class="secondary"
            data-history="${esc(
              exercise.exId
            )}"
          >
            📈 Storico
          </button>
          <button class="secondary" data-warmup="${esc(exercise.exId)}">🔥 Warm-up</button>
          <button class="secondary" data-replace="${esc(exercise.exId)}" data-rowid="${esc(exercise.rowId||"")}">🔁 Sostituisci</button>
          <button class="secondary" data-exnote="${esc(exercise.exId)}">📝 Note</button>
          ${exercise.videoUrl?`<button class="secondary" data-media="${esc(exercise.exId)}">▶️ Video</button>`:""}
          ${exercise.rowId?`<button class="secondary" data-technique="${esc(exercise.rowId)}">⚡ Tecnica</button>`:""}

        </div>

      </div>

    </details>

  `;

}


    async function loadSuggestion(exId){

      const box =
        document.getElementById(
          "suggest_" + exId
        );

      if(!box){
        return;
      }

      const exercise =
        state.workout
          ?.exercises
          ?.find(
            item =>
              String(item.exId) ===
              String(exId)
          );

      let targetMin = 0;
      let targetMax = 0;

      const range =
        String(
          exercise?.ripetizioni || ""
        )
        .match(
          /(\d+)\s*[-–]\s*(\d+)/
        );

      if(range){

        targetMin = Number(range[1]);
        targetMax = Number(range[2]);

      }else{

        const one =
          Number(
            String(
              exercise?.ripetizioni || ""
            )
            .replace(/\D+/g,"")
          );

        if(one){
          targetMin = one;
          targetMax = one;
        }

      }

      try{

        const response =
          await gas(
            "api_getSmartProgression",
            {
              exId,
              targetMin,
              targetMax,
              step:1.25
            }
          );

        if(
          response.suggested === null ||
          response.suggested === undefined
        ){

          box.innerHTML = `
            ➡️ ${esc(
              response.reason ||
              "Nessun suggerimento"
            )}
          `;

          return;
        }

        box.innerHTML = `

          <div>
            ➡️ Carico consigliato:
            <b>
              ${esc(response.suggested)} kg
            </b>
          </div>

          <div
            class="muted"
            style="margin-top:5px"
          >
            ${esc(response.reason || "")}
          </div>

          ${
            response.previousLoad
              ? `
                <div
                  class="muted"
                  style="margin-top:4px"
                >
                  Ultima seduta:
                  ${esc(response.previousLoad)} kg

                  ${
                    response.avgRir !== null
                      ? " • RIR medio " +
                        esc(response.avgRir)
                      : ""
                  }
                </div>
              `
              : ""
          }

        `;

      }catch(error){

        console.error("Progressione:", error);

        box.textContent =
          "Suggerimento non disponibile.";

      }

    }


    async function openExerciseHistory(exId){

      layout(`

        <div class="loading">

          <div>

            <div class="spinner"></div>

            Carico storico…

          </div>

        </div>

      `);

      try{

        const response =
          await gas(
            "api_getExerciseInsights",
            exId
          );

        const exercise =
          response.exercise || {};

        const sessions =
          response.sessions || [];

        layout(`

          <div class="viewTitle">

            <h1>
              ${esc(
                exercise.nome ||
                "Esercizio"
              )}
            </h1>

            <div class="muted">

              ${esc(
                exercise.gruppo || ""
              )}

              ${
                exercise.attrezzatura
                  ? " • " +
                    esc(
                      exercise.attrezzatura
                    )
                  : ""
              }

            </div>

          </div>

          <div class="insightStats">

            <div class="insightBox">

              <b>
                ${fmtNum(
                  response.bestLoad,
                  " kg"
                )}
              </b>

              <span>
                Carico massimo
              </span>

            </div>

            <div class="insightBox">

              <b>
                ${fmtNum(
                  response.bestE1rm,
                  " kg"
                )}
              </b>

              <span>
                e1RM
              </span>

            </div>

            <div class="insightBox">

              <b>
                ${response.totalSets || 0}
              </b>

              <span>
                Serie registrate
              </span>

            </div>

          </div>

          <div class="card">

            <div class="eyebrow">
              Volume totale registrato
            </div>

            <h2
              style="margin:7px 0 0"
            >
              ${formatVolume(
                response.totalVolume
              )}
            </h2>

          </div>

          <div class="sectionTitle">

            <h2>
              Ultime sessioni
            </h2>

            <span>
              ${sessions.length}
            </span>

          </div>

          <div class="card">

            ${
              sessions.length
                ? sessions
                    .map(
                      session => `

                        <div class="insightSession">

                          <div
                            style="
                              display:flex;
                              justify-content:space-between;
                              gap:12px
                            "
                          >

                            <b>
                              ${fmtDate(
                                session.date
                              )}
                            </b>

                            <span class="muted">
                              ${formatVolume(
                                session.volume
                              )}
                            </span>

                          </div>

                          <div>

                            ${
                              session.sets
                                .map(
                                  set => `

                                    <span class="insightSet">

                                      ${esc(
                                        set.load || "—"
                                      )}
                                      kg ×
                                      ${esc(
                                        set.reps || "—"
                                      )}

                                      ${
                                        set.rir !== "" &&
                                        set.rir !== undefined
                                          ? " • RIR " +
                                            esc(set.rir)
                                          : ""
                                      }

                                    </span>

                                  `
                                )
                                .join("")
                            }

                          </div>

                        </div>

                      `
                    )
                    .join("")
                : `
                  <span class="muted">
                    Nessuna sessione registrata.
                  </span>
                `
            }

          </div>

          <div style="margin-top:14px">

            <button
              class="secondary big"
              id="backWorkout"
            >
              ← Torna al workout
            </button>

          </div>

        `);

        $("#backWorkout").onclick =
          renderWorkout;

      }catch(error){

        toast(error.message);
        renderWorkout();

      }

    }


async function beginWorkout(){

  try{

    const response =
      await gas(
        "api_startWorkout",
        {

          schedaId:
            state.boot
              .plan
              ?.schedaId
            ||
            "",

          giornoId:
            state.workout
              .day
              .giornoId

        }
      );


    state.session = {

      id:
        response.sessionId,

      start:
        Date.now()

    };


    state.completedSets =
      0;


    state.workoutVolume =
      0;


    state.savedSets =
      new Set();


    toast(
      "Allenamento iniziato 💪"
    );


    renderWorkout();


  }catch(error){

    toast(
      error.message
    );

  }

}


    function bindSets(){

  document
    .querySelectorAll(
      "[data-check]"
    )
    .forEach(
      button => {

        button.onclick =
          async () => {

            if(
              button
                .classList
                .contains(
                  "done"
                )
            ){
              return;
            }


            const row =
              button.closest(
                "[data-setrow]"
              );


            const exercise =
              button.closest(
                ".exercise"
              );


            const loadInput =
              row.querySelector(
                "[data-load]"
              );


            const repsInput =
              row.querySelector(
                "[data-reps]"
              );


            const rirInput =
              row.querySelector(
                "[data-rir]"
              );


            const load =
              loadInput.value
                .replace(
                  ",",
                  "."
                );


            const reps =
              repsInput.value;


            const rir =
              rirInput.value;


            if(!reps){

              toast(
                "Inserisci le ripetizioni"
              );

              repsInput.focus();

              return;

            }


            button.disabled =
              true;


            try{

              const saved =
                await gas(
                  "api_saveSet",
                  {

                  sessionId:
                    state.session.id,

                  schedaId:
                    state.boot
                      .plan
                      ?.schedaId
                    ||
                    "",

                  giornoId:
                    state.workout
                      .day
                      .giornoId,

                  exId:
                    button.dataset.ex,

                  exNome:
                    button.dataset.name,

                  setIndex:
                    button.dataset.set,

                  load,

                  reps,

                  rir

                }
              );

              try{

                const pr =
                  await gas(
                    "api_checkSetPR",
                    {
                      id: saved.id,
                      exId: button.dataset.ex,
                      load,
                      reps
                    }
                  );

                if(pr.loadPR){

                  showPR(
                    "🏆 Nuovo record di carico",
                    button.dataset.name +
                    " • " +
                    pr.load +
                    " kg × " +
                    pr.reps
                  );

                }else if(pr.e1rmPR){

                  showPR(
                    "🏆 Nuovo record stimato",
                    button.dataset.name +
                    " • e1RM " +
                    pr.e1rm +
                    " kg"
                  );

                }

              }catch(error){

                console.log(
                  "PR check:",
                  error
                );

              }


              button
                .classList
                .add(
                  "done"
                );


              button.textContent =
                "✓";


              row.classList.add(
                "savedSet"
              );


              loadInput.disabled =
                true;

              repsInput.disabled =
                true;

              rirInput.disabled =
                true;


              state.completedSets++;


              const loadNumber =
                Number(load || 0);


              const repsNumber =
                Number(reps || 0);


              if(
                Number.isFinite(
                  loadNumber
                )
                &&
                Number.isFinite(
                  repsNumber
                )
              ){

                state.workoutVolume +=
                  loadNumber *
                  repsNumber;

              }


              const msg =
                exercise
                  ?.querySelector(
                    "[data-save-msg]"
                  );


              if(msg){

                msg.textContent =
                  "Serie salvata ✓";


                setTimeout(
                  () => {

                    if(msg){

                      msg.textContent =
                        "";

                    }

                  },
                  1400
                );

              }


              updateWorkoutProgress();


              button.disabled =
                false;


              startRest(
                Number(
                  button.dataset.rest
                )
                ||
                90
              );


              focusNextSet(
                row
              );


            }catch(error){

              button.disabled =
                false;


              toast(
                error.message
              );

            }

          };

      }
    );

}


    function startRest(
  seconds
){

  state.restEnd =
    Date.now()
    +
    seconds *
    1000;


  clearInterval(
    state.restTick
  );


  const overlay =
    $("#restOverlay");


  if(overlay){

    overlay.classList.add(
      "show"
    );

  }


  function draw(){

    const time =
      $("#restTime");


    if(!time){
      return;
    }


    const left =
      Math.max(
        0,
        Math.ceil(
          (
            state.restEnd -
            Date.now()
          )
          /
          1000
        )
      );


    if(!left){

      stopRest();


      if(
        navigator.vibrate
      ){

        navigator.vibrate(
          [
            150,
            80,
            150
          ]
        );

      }


      playRecoverySound();
      document.querySelector(".workoutProTop")?.classList.add("recoveryFlash");
      setTimeout(()=>document.querySelector(".workoutProTop")?.classList.remove("recoveryFlash"),1300);

      toast(
        "Recupero finito 🔥"
      );


      return;

    }


    const minutes =
      String(
        Math.floor(
          left /
          60
        )
      )
      .padStart(
        2,
        "0"
      );


    const sec =
      String(
        left %
        60
      )
      .padStart(
        2,
        "0"
      );


    time.textContent =
      minutes
      +
      ":"
      +
      sec;

  }


  draw();


  state.restTick =
    setInterval(
      draw,
      250
    );

}


function stopRest(){

  clearInterval(
    state.restTick
  );


  state.restEnd =
    0;


  const overlay =
    $("#restOverlay");


  if(overlay){

    overlay.classList.remove(
      "show"
    );

  }

}


function bindRestControls(){

  const plus =
    $("#restPlus");

  const minus =
    $("#restMinus");

  const skip =
    $("#restSkip");


  if(plus){

    plus.onclick =
      () => {

        if(
          state.restEnd
        ){

          state.restEnd +=
            15000;

        }

      };

  }


  if(minus){

    minus.onclick =
      () => {

        if(
          state.restEnd
        ){

          state.restEnd =
            Math.max(
              Date.now(),
              state.restEnd -
              15000
            );

        }

      };

  }


  if(skip){

    skip.onclick =
      stopRest;

  }

}


    async function finishWorkout(){

  if(
    !state.session
  ){
    return;
  }


  const confirmFinish =
    confirm(
      "Terminare l'allenamento?\n\n"
      +
      state.completedSets
      +
      " serie completate su "
      +
      state.totalSets
      +
      "."
    );


  if(!confirmFinish){
    return;
  }


  try{

    const response =
      await gas(
        "api_finishWorkout",
        {
          sessionId:
            state.session.id
        }
      );


    state.session =
      null;


    clearInterval(
      state.sessionTick
    );


    stopRest();


    const finalVolume =
      formatVolume(
        state.workoutVolume
      );


    toast(
      "Workout completato • "
      +
      response.duration
      +
      " min • "
      +
      finalVolume
    );


    state.completedSets =
      0;

    state.totalSets =
      0;

    state.workoutVolume =
      0;

    state.savedSets =
      new Set();


    await refresh();


    go(
      "home"
    );


  }catch(error){

    toast(
      error.message
    );

  }

}


    