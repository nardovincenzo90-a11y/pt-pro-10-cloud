# PT-PRO 10 Cloud — RC1 pre-media

## Completato
- UI duplicata Smart Coach/Nutrizione corretta.
- Terminologia principale italianizzata.
- Macro nutrizione collegati ai campi PostgreSQL reali.
- Generazione nutrizione giornata/settimana/mese con fallback Cloud reale.
- Persistenza nutrizione su `nutrition_days`, `meals`, `meal_items`.
- Loader modulare per i 6 payload di compatibilità.
- Notifiche browser + service worker push handler.
- Audit runtime autenticato/RLS read-only.
- Smoke, static E2E, performance budget e release-readiness CI.
- PWA, offline minimale, backup, telemetria, Progressi, Smart Coach e riepilogo workout.

## Restante prima della 1.0
1. Verifica live autenticata dei flussi workout/nutrizione/Coach e dell'audit runtime.
2. Web Push remoto a browser chiuso solo se si decide di configurare sender VAPID server-side.
3. Ultimo step media: Supabase Storage, 91 immagini esercizi, `exercises.image_url`, upload foto progressi.
4. Verifica finale e release 1.0.
