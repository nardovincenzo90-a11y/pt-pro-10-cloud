# PT-PRO 10 Cloud

PT-PRO 10 Cloud è la versione PostgreSQL/Supabase + PWA dell'app PT-PRO.

## Stato release

**10.0.0-rc1 · pre-media**

La UI usa Supabase Auth/PostgREST, PWA/service worker, telemetria, Smart Coach, Centro Progressi, Nutrizione Cloud, Calendario/Coach e backup JSON.

### Architettura frontend RC1

`app-manifest.js` assegna i sei payload di compatibilità legacy a domini espliciti (`core`, `shell`, `progress-nutrition`, `coach`, `tools`, `workout`). `auth-gate.js` li carica in ordine tramite il manifest, mantenendo compatibilità con PT-PRO 9 senza duplicare il bootstrap.

I moduli Evolution sono separati per responsabilità: UX/unificazione, Progressi/report, Nutrizione/generatore/persistenza, Smart Coach, Calendario/Coach, notifiche, hardening, riepilogo workout e audit release.

### Nutrizione

Il generatore Cloud usa gli alimenti reali in `foods`, i target del piano attivo e dispone di fallback specializzato per giornata/settimana/mese. I salvataggi sono scritti su `nutrition_days`, `meals` e `meal_items` con la sessione autenticata e RLS.

### Sicurezza e qualità

Non viene usata alcuna `service_role` nel frontend. La configurazione runtime espone soltanto URL Supabase e publishable key. `release-audit-evolution.js` verifica letture autenticate, blocco anonimo, duplicazioni UI e tempi di caricamento e registra l'esito localmente/telemetria. La CI esegue syntax check, smoke test, contratti E2E statici, performance budget e release-readiness gate.

### Notifiche

Sono supportate notifiche browser tramite Notification API + service worker, polling delle notifiche interne e handler `push`/`notificationclick`. L'invio Web Push remoto a browser completamente chiuso richiede un sender server-side/VAPID e segreti server-side: non vengono inseriti segreti nel client.

## Ultimo passaggio prima della 1.0

Il codice pre-media è in RC1. Restano il controllo live autenticato dei flussi principali e il media restore finale: Supabase Storage, 91 immagini esercizi legacy, `exercises.image_url` e upload foto progressi. Dopo il controllo finale viene pubblicata la release 1.0.
