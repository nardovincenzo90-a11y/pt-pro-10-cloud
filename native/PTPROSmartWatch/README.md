# PT-PRO Smart Watch

Modulo nativo iPhone + Apple Watch aggiuntivo alla PWA PT-PRO. Non sostituisce il
sito e non modifica i programmi esistenti. Il Watch riceve la giornata attiva dal
Cloud e restituisce eventi idempotenti, per evitare serie duplicate.

## Stato funzionale

- iPhone: accesso con lo stesso account Supabase, selezione della sessione aperta
  o della prossima giornata del piano attivo, invio al Watch.
- Watch: avvio, pausa, ripresa e chiusura esplicita; esercizio, serie, target,
  carico, ripetizioni, RIR, recupero, frequenza cardiaca, durata e calorie Apple.
- Persistenza: sessione e posizione corrente ripristinate dopo riapertura;
  HealthKit recupera una sessione ancora attiva; gli eventi non confermati restano
  nella coda locale finché l'iPhone non li registra.
- Motion Lab: attivo solo per esercizi esplicitamente abilitati con tag
  `motion:<profilo>`. Le ripetizioni automatiche sono sempre indicate come stime
  sperimentali e non sostituiscono quelle confermate dall'utente.

## Requisiti

- Xcode 16 o successivo, XcodeGen e un account Apple Developer per installazione
  su dispositivo/TestFlight.
- iPhone con iOS 17 o successivo.
- Apple Watch con watchOS 10 o successivo. Target verificato: Apple Watch Ultra
  prima generazione (MQFK3TY/A), incluso watchOS 26.6.
- URL Supabase e chiave **publishable/anon** in `Config/Secrets.xcconfig`. Non usare
  mai una service-role key nell'app.

## Preparazione

```sh
cp Config/Secrets.xcconfig.example Config/Secrets.xcconfig
xcodegen generate
open PTPROSmartWatch.xcodeproj
```

Prima dell'uso Cloud, applicare la migrazione
`supabase/PT-PRO_12_SMART_WATCH_FOUNDATION.sql` in staging, eseguire i test di
integrazione, quindi promuoverla. La migrazione è additiva: non elimina né altera
schede, programmi o storico.

## Verifica obbligatoria prima della release

1. Build automatica iOS/watchOS e test del package `PTPROCore` verdi.
2. Test su Apple Watch reale: consenso HealthKit, avvio, pausa, recupero dopo
   terminazione del processo, fine esplicita e salvataggio in Salute.
3. Test con iPhone non raggiungibile: serie in coda e successiva sincronizzazione.
4. Controllo nel database: un solo evento e una sola serie per `event_id`.
5. Verifica che una giornata V-Shape utilizzi gli stessi esercizi/immagini del
   catalogo esistente e che nessun programma preesistente sia cambiato.

