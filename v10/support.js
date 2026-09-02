(() => {
'use strict';
const A=window.PTAPP,{api,state,esc,shell,toast}=A;
const version=()=>window.PTPRO_APP_VERSION||'PT-PRO 10';

function hero(icon,title,subtitle){return `<div class="sectionHead"><div><div class="eyebrow">SUPPORTO PT-PRO</div><h1>${icon} ${esc(title)}</h1><span class="muted">${esc(subtitle)}</span></div></div>`}
function routeCard(route,icon,title,text){return `<button class="dayCard" data-route="${route}"><div><b>${icon} ${esc(title)}</b><span>${esc(text)}</span></div></button>`}

A.register('guide',async()=>{
 state.view='guide';
 shell(`${hero('❓','Guida & Tutorial','Tutto quello che serve per usare PT-PRO, sezione per sezione')}
 <div class="proSections">
  <section><div class="sectionHead"><h2>Partenza rapida</h2></div><div class="toolGrid">
   ${routeCard('home','⌂','Home','Controlla allenamento del giorno, statistiche, Smart Coach e azioni rapide.')}
   ${routeCard('workout','🏋️','Allenamento','Apri il giorno, premi Inizia, registra kg, ripetizioni e RIR/RPE e termina la seduta.')}
   ${routeCard('progress','📈','Progressi','Registra peso e misure, check-in, obiettivi, PR/e1RM e foto progressi.')}
   ${routeCard('nutrition','🥗','Nutrizione','Genera giorno, settimana o mese, usa ricette, dispensa, lista spesa e integratori.')}
  </div></section>
  <section><div class="sectionHead"><h2>Strumenti PRO</h2></div><div class="toolGrid">
   ${routeCard('coach-smart','🧠','Smart Coach PRO','Analizza ultime 3–5 sedute, recupero, RIR/RPE, e1RM e suggerisce progressioni.')}
   ${routeCard('data-manager','▣','Builder Schede','Crea e modifica schede, giorni, esercizi, tecniche avanzate e target.')}
   ${routeCard('calendar','📅','Calendario','Visualizza e pianifica workout ed eventi collegati alla programmazione.')}
   ${routeCard('reports','📊','Report & Analytics','Controlla volume, frequenza, trend e andamento mensile/annuale.')}
  </div></section>
  <section><div class="card"><h2>Come usare PT-PRO durante un workout</h2><div class="list">
   <div class="row"><span>1. Apri Workout e scegli il giorno</span><b>→</b></div>
   <div class="row"><span>2. Premi “Inizia”</span><b>→</b></div>
   <div class="row"><span>3. Inserisci kg, REP e RIR/RPE per ogni serie</span><b>→</b></div>
   <div class="row"><span>4. Salva ogni serie e usa il timer recupero</span><b>→</b></div>
   <div class="row"><span>5. Premi “Termina” per aggiornare progressi e Smart Coach</span><b>✓</b></div>
  </div></section>
  <section><div class="card"><h2>Installazione su smartphone</h2><p class="muted">Android/Chrome: menu ⋮ → Installa app o Aggiungi a schermata Home. iPhone/Safari: Condividi → Aggiungi alla schermata Home.</p></div></section>
 </div>`);
 A.bindRoutes();
});

A.register('whats-new',async()=>{
 state.view='whats-new';
 shell(`${hero('✦','Novità',`Release ${version()} · cronologia delle funzioni principali`)}
 <div class="card list">
  <div class="proInsight"><div><b>PT-PRO 10.1 · PRO Complete</b><span>Release corrente</span><small>Cloud completo, nuova UI desktop/mobile e consolidamento delle funzioni PT-PRO 9.</small></div><b>ATTIVA</b></div>
  <div class="proInsight"><div><b>Smart Coach PRO 4.0</b><span>Prescrizioni serie per serie</span><small>Ultime 3–5 sedute, e1RM, RIR/RPE, readiness e recupero.</small></div><b>🧠</b></div>
  <div class="proInsight"><div><b>Workout PRO</b><span>Esperienza allenamento completa</span><small>PR, warm-up, timer, note, sostituzioni e tecniche avanzate.</small></div><b>🏋️</b></div>
  <div class="proInsight"><div><b>Nutrizione PRO</b><span>Giorno, settimana e mese</span><small>Alimenti reali, ricette, dispensa, spesa automatica e integrazione.</small></div><b>🥗</b></div>
  <div class="proInsight"><div><b>Centro Progressi</b><span>Corpo + performance</span><small>Misure, PR/e1RM, obiettivi, check-in e foto progressi Cloud.</small></div><b>📈</b></div>
  <div class="proInsight"><div><b>Interfaccia PRO</b><span>Sidebar, temi e personalizzazione</span><small>Tema Auto/Scuro/Chiaro persistente e layout responsive.</small></div><b>◐</b></div>
 </div>
 <section class="section"><div class="card"><b>Versione installata</b><p class="muted">${esc(version())}</p></div></section>`);
});

A.register('contact',async()=>{
 state.view='contact';
 shell(`${hero('✉','Contattaci','Segnala un problema o lascia una nota direttamente dal Cloud')}
 <div class="card">
  <label>Tipo richiesta<select id="supportType"><option value="bug">Problema / Bug</option><option value="idea">Idea / Miglioramento</option><option value="data">Dati / Sincronizzazione</option><option value="other">Altro</option></select></label>
  <label>Messaggio<textarea id="supportMessage" class="textarea" rows="7" placeholder="Descrivi cosa succede, in quale sezione e cosa stavi facendo…"></textarea></label>
  <button class="btn primary full" id="sendSupport">Invia segnalazione</button>
 </div>
 <section class="section"><div class="card list">
  <div class="row"><span>Versione app</span><b>${esc(version())}</b></div>
  <div class="row"><span>Cloud</span><b>Supabase</b></div>
  <div class="row"><span>Utente</span><b>${esc(state.boot?.profile?.display_name||state.boot?.profile?.first_name||'Atleta')}</b></div>
 </div></section>`);
 document.getElementById('sendSupport').onclick=async()=>{
  const message=document.getElementById('supportMessage').value.trim(),type=document.getElementById('supportType').value;
  if(!message)return toast('Scrivi prima il messaggio','err');
  const details={type,version:version(),view:state.view,platform:navigator.platform||'',screen:`${screen.width}x${screen.height}`};
  try{
   await api.techLog(state.boot.uid,'info','support',message,details);
   document.getElementById('supportMessage').value='';
   toast('Segnalazione salvata nel Cloud ✓');
  }catch(e){toast('Impossibile salvare la segnalazione','err')}
 };
});
})();